import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import rateLimit from '@fastify/rate-limit';
import { execFile } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { FMP_BASE, FMP_ALLOWED_ENDPOINTS, isFmpEndpointAllowed, buildSpyHistoryAsync, proxyFmp } from './api/_shared.js';

// The FMP key must come from the environment — no hardcoded fallback.
// If absent, the server still runs (synthetic/Yahoo data work) but FMP enrichment is disabled.
const FMP_API_KEY = process.env.FMP_API_KEY || null;
if (!FMP_API_KEY) {
  console.warn('WARN: FMP_API_KEY not set — FMP enrichment endpoints will return 503.');
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '3001', 10);

// Restrict CORS to an explicit allowlist (comma-separated CORS_ORIGIN env var).
// Defaults to localhost dev origins only — never wide open in production.
const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000,http://localhost:3001,http://localhost:3200,http://localhost:3201')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const DERIBIT_BASE = 'https://www.deribit.com/api/v2/public';

const fastify = Fastify({ logger: false });

await fastify.register(cors, {
  origin: (origin, cb) => {
    // Allow non-browser/REST clients (no Origin header) for server-to-server use.
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'), false);
  },
});

// Rate limiting configuration.
// NOTE: only the FMP proxy has an external cost (the API key quota), and it is
// already protected by a 60s server-side + client-side cache, so it makes very
// few outbound calls. The yfinance endpoints are local (Python) and the app
// legitimately issues several requests per refresh — throttling them at a low
// cap silently breaks live mode (chain fetch 429s -> synthetic fallback).
// We therefore keep a generous local limit to absorb refresh bursts.
await fastify.register(rateLimit, {
  max: 600,
  timeWindow: '1 minute',
  errorResponseBuilder: (request, context) => ({
    code: 429,
    error: 'Too Many Requests',
    message: `Rate limit exceeded, try again in ${context.ttl} seconds`,
    retryAfter: context.ttl,
  }),
});

// Input validation helper — equities + short crypto aliases + yfinance forms (BTC-USD)
function validateSymbol(symbol) {
  if (!symbol || typeof symbol !== 'string') {
    return null;
  }
  const sanitized = symbol.trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9.-]{0,11}$/.test(sanitized)) {
    return null;
  }
  return sanitized;
}

const cacheStore = new Map();
const CACHE_TTL = 30000;

fastify.get('/api/health', async () => ({ status: 'ok', timestamp: Date.now() }));

fastify.get('/api/options/:symbol', async (request, reply) => {
  const { symbol: rawSymbol } = request.params;
  const symbol = validateSymbol(rawSymbol) || 'SPY';
  const now = Date.now();
  const { probe, max: maxStr } = request.query;
  const isProbe = probe === '1' || probe === 'true';
  const max = parseInt(maxStr, 10);
  const maxArg = Number.isFinite(max) && max > 0 ? max : null;

  const cached = cacheStore.get(symbol);
  if (cached && now - cached.timestamp < CACHE_TTL) {
    if (isProbe) {
      const contracts = Array.isArray(cached.data.quotes) ? cached.data.quotes.length : 0;
      return { available: true, contracts };
    }
    return cached.data;
  }

  const args = [join(__dirname, 'fetch_options.py'), symbol];
  if (maxArg) args.push(String(maxArg));

  try {
    const result = await new Promise((resolve, reject) => {
      execFile('python3', args, { timeout: isProbe ? 12000 : 25000 }, (err, stdout, stderr) => {
        if (err) {
          console.error('Python script error:', err);
          console.error('Python stderr:', stderr);
          console.error('Python stdout:', stdout?.slice(0, 500));
          const detail = stderr || stdout?.slice(0, 500) || err.message;
          return reject(new Error(detail));
        }
        try {
          const data = JSON.parse(stdout);
          if (data.error) {
            console.error('Data fetcher error:', data.error);
            return reject(new Error(data.error));
          }
          resolve(data);
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          reject(new Error('Invalid response from data fetcher'));
        }
      });
    });

    const contracts = Array.isArray(result.quotes) ? result.quotes.length : 0;
    if (isProbe) return { available: contracts >= 10, contracts };

    cacheStore.set(symbol, { data: result, timestamp: now });
    return result;
  } catch (err) {
    console.error('API endpoint error:', err);
    reply.code(502);
    return { error: 'Failed to fetch data', detail: err.message };
  }
});

// ── yfinance enrichment (history + fundamentals) ──────────────
// Secondary source that backs the Quote tab when FMP is unavailable or
// rate-limited. Docker/Node only (needs a Python runtime).

function runYf(symbol, mode) {
  return new Promise((resolve, reject) => {
    execFile('python3', [join(__dirname, 'fetch_yf.py'), symbol, mode], { timeout: 25000 }, (err, stdout, stderr) => {
      if (err) {
        const detail = stderr || stdout?.slice(0, 500) || err.message;
        return reject(new Error(detail));
      }
      try {
        const data = JSON.parse(stdout);
        if (data.error) return reject(new Error(data.error));
        resolve(data);
      } catch {
        reject(new Error('Invalid response from yfinance fetcher'));
      }
    });
  });
}

fastify.get('/api/yf/history/:symbol', async (request, reply) => {
  const symbol = validateSymbol(request.params.symbol) || 'SPY';
  const now = Date.now();
  const cached = cacheStore.get(`yf:history:${symbol}`);
  if (cached && now - cached.timestamp < CACHE_TTL) return cached.data;
  try {
    const data = await runYf(symbol, 'history');
    cacheStore.set(`yf:history:${symbol}`, { data, timestamp: now });
    return data;
  } catch (err) {
    reply.code(502);
    return { error: 'Failed to fetch yfinance history', detail: err.message };
  }
});

fastify.get('/api/yf/info/:symbol', async (request, reply) => {
  const symbol = validateSymbol(request.params.symbol) || 'SPY';
  const now = Date.now();
  const cached = cacheStore.get(`yf:info:${symbol}`);
  if (cached && now - cached.timestamp < CACHE_TTL) return cached.data;
  try {
    const data = await runYf(symbol, 'info');
    cacheStore.set(`yf:info:${symbol}`, { data, timestamp: now });
    return data;
  } catch (err) {
    reply.code(502);
    return { error: 'Failed to fetch yfinance info', detail: err.message };
  }
});

// The seeded, memoized SPY history now lives in api/_shared.js and is shared
// with the Vercel serverless deployment.

fastify.get('/api/history/spy', async () => {
  // Prefer real FMP daily history when the key is set; synthetic otherwise.
  return buildSpyHistoryAsync(FMP_API_KEY, FMP_BASE);
});

// ── Deribit public market data (no API key) ───────────────────
async function deribitFetch(pathWithQuery) {
  const url = `${DERIBIT_BASE}/${pathWithQuery}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Deribit ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = await res.json();
  if (json.error) {
    throw new Error(json.error.message || JSON.stringify(json.error));
  }
  return json.result;
}

fastify.get('/api/deribit/index/:name', async (request, reply) => {
  const name = String(request.params.name || '').toLowerCase();
  if (!/^(btc|eth)_usd$/.test(name)) {
    reply.code(400);
    return { error: 'Invalid index (use btc_usd or eth_usd)' };
  }
  const cacheKey = `deribit:index:${name}`;
  const cached = cacheStore.get(cacheKey);
  const now = Date.now();
  if (cached && now - cached.timestamp < 8_000) return cached.data;
  try {
    const result = await deribitFetch(`get_index_price?index_name=${name}`);
    const data = {
      index_price: result.index_price,
      estimated_delivery_price: result.estimated_delivery_price,
      timestamp: now,
    };
    cacheStore.set(cacheKey, { data, timestamp: now });
    return data;
  } catch (err) {
    reply.code(502);
    return { error: 'Deribit index failed', detail: err.message };
  }
});

fastify.get('/api/deribit/options/:currency', async (request, reply) => {
  const currency = String(request.params.currency || '').toUpperCase();
  if (currency !== 'BTC' && currency !== 'ETH') {
    reply.code(400);
    return { error: 'currency must be BTC or ETH' };
  }
  const cacheKey = `deribit:options:${currency}`;
  const cached = cacheStore.get(cacheKey);
  const now = Date.now();
  // Options book: 20s cache (878 instruments — don't hammer)
  if (cached && now - cached.timestamp < 20_000) return cached.data;
  try {
    const result = await deribitFetch(
      `get_book_summary_by_currency?currency=${currency}&kind=option`,
    );
    const data = {
      currency,
      options: Array.isArray(result) ? result : [],
      count: Array.isArray(result) ? result.length : 0,
      timestamp: now,
    };
    cacheStore.set(cacheKey, { data, timestamp: now });
    return data;
  } catch (err) {
    reply.code(502);
    return { error: 'Deribit options failed', detail: err.message };
  }
});

fastify.get('/api/deribit/futures/:currency', async (request, reply) => {
  const currency = String(request.params.currency || 'BTC').toUpperCase();
  if (currency !== 'BTC' && currency !== 'ETH') {
    reply.code(400);
    return { error: 'currency must be BTC or ETH' };
  }
  const cacheKey = `deribit:futures:${currency}`;
  const cached = cacheStore.get(cacheKey);
  const now = Date.now();
  if (cached && now - cached.timestamp < 15_000) return cached.data;
  try {
    const result = await deribitFetch(
      `get_book_summary_by_currency?currency=${currency}&kind=future`,
    );
    const data = { futures: Array.isArray(result) ? result : [], currency, fetchedAt: now };
    cacheStore.set(cacheKey, { data, timestamp: now });
    return data;
  } catch (err) {
    reply.code(502);
    return { error: 'Deribit futures fetch failed', detail: err.message };
  }
});

fastify.get('/api/deribit/ticker/:instrument', async (request, reply) => {
  const instrument = String(request.params.instrument || '').toUpperCase();
  if (!/^(BTC|ETH)-PERPETUAL$/.test(instrument)) {
    reply.code(400);
    return { error: 'instrument must be BTC-PERPETUAL or ETH-PERPETUAL' };
  }
  const cacheKey = `deribit:ticker:${instrument}`;
  const cached = cacheStore.get(cacheKey);
  const now = Date.now();
  if (cached && now - cached.timestamp < 8_000) return cached.data;
  try {
    const result = await deribitFetch(`ticker?instrument_name=${instrument}`);
    const data = {
      instrument_name: result.instrument_name,
      index_price: result.index_price,
      mark_price: result.mark_price,
      last_price: result.last_price ?? null,
      current_funding: result.current_funding ?? 0,
      funding_8h: result.funding_8h ?? 0,
      open_interest: result.open_interest ?? 0,
      best_bid_price: result.best_bid_price ?? null,
      best_ask_price: result.best_ask_price ?? null,
      timestamp: now,
    };
    cacheStore.set(cacheKey, { data, timestamp: now });
    return data;
  } catch (err) {
    reply.code(502);
    return { error: 'Deribit ticker failed', detail: err.message };
  }
});

/** Convenience bundle for the BTC desk */
fastify.get('/api/deribit/market/:currency', async (request, reply) => {
  const currency = String(request.params.currency || 'BTC').toUpperCase();
  if (currency !== 'BTC' && currency !== 'ETH') {
    reply.code(400);
    return { error: 'currency must be BTC or ETH' };
  }
  const cacheKey = `deribit:market:${currency}`;
  const cached = cacheStore.get(cacheKey);
  const now = Date.now();
  if (cached && now - cached.timestamp < 15_000) return cached.data;
  try {
    const indexName = currency === 'BTC' ? 'btc_usd' : 'eth_usd';
    const perpName = `${currency}-PERPETUAL`;
    const [index, options, perp, futures] = await Promise.all([
      deribitFetch(`get_index_price?index_name=${indexName}`),
      deribitFetch(`get_book_summary_by_currency?currency=${currency}&kind=option`),
      deribitFetch(`ticker?instrument_name=${perpName}`),
      deribitFetch(`get_book_summary_by_currency?currency=${currency}&kind=future`),
    ]);
    const funding_8h = perp?.funding_8h ?? 0;
    const data = {
      currency,
      indexPrice: index?.index_price ?? perp?.index_price,
      options: Array.isArray(options) ? options : [],
      futures: Array.isArray(futures) ? futures : [],
      perp: perp
        ? {
            instrument_name: perp.instrument_name,
            index_price: perp.index_price,
            mark_price: perp.mark_price,
            last_price: perp.last_price ?? null,
            current_funding: perp.current_funding ?? 0,
            funding_8h,
            open_interest: perp.open_interest ?? 0,
            best_bid_price: perp.best_bid_price ?? null,
            best_ask_price: perp.best_ask_price ?? null,
          }
        : null,
      fundingAnn: isFinite(funding_8h) ? funding_8h * 3 * 365 : null,
      fetchedAt: now,
      source: 'deribit',
    };
    cacheStore.set(cacheKey, { data, timestamp: now });
    return data;
  } catch (err) {
    reply.code(502);
    return { error: 'Deribit market bundle failed', detail: err.message };
  }
});

// ── SSE spot stream ────────────────────────────────────────────
// Pushes FMP quote ticks to the browser so spot updates without a full poll.
// Interval is session-aware (faster in RTH). Clients reconnect automatically.
fastify.get('/api/stream/quote/:symbol', async (request, reply) => {
  const symbol = validateSymbol(request.params.symbol) || 'SPY';
  const origin = request.headers.origin;
  const allowOrigin =
    !origin || ALLOWED_ORIGINS.includes(origin) ? (origin || ALLOWED_ORIGINS[0]) : null;
  if (origin && !allowOrigin) {
    reply.code(403);
    return { error: 'Not allowed by CORS' };
  }

  reply.hijack();
  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  };
  if (allowOrigin) {
    headers['Access-Control-Allow-Origin'] = allowOrigin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  reply.raw.writeHead(200, headers);
  reply.raw.write(': connected\n\n');

  let closed = false;
  const writeTick = async () => {
    if (closed) return;
    try {
      const { status, body } = await proxyFmp(`quote?symbol=${encodeURIComponent(symbol)}`, FMP_API_KEY, FMP_BASE);
      if (status === 200 && Array.isArray(body) && body[0] && body[0].price > 0) {
        const q = body[0];
        const payload = {
          symbol: q.symbol || symbol,
          price: q.price,
          change: q.change,
          changePercentage: q.changePercentage,
          timestamp: Date.now(),
          source: 'fmp',
        };
        reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`);
      } else if (!FMP_API_KEY) {
        reply.raw.write(`data: ${JSON.stringify({ error: 'no_api_key', timestamp: Date.now() })}\n\n`);
      }
    } catch (err) {
      reply.raw.write(`data: ${JSON.stringify({ error: 'tick_failed', detail: String(err.message || err) })}\n\n`);
    }
  };

  await writeTick();
  // 12s open / 60s closed — mirrors client LIVE_SPOT_* cadence without importing TS.
  const openMs = 12_000;
  const closedMs = 60_000;
  const pickInterval = () => {
    const et = new Date().toLocaleString('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
    // crude: if contains "Sat"/"Sun" use closed; else check hour roughly
    if (/\bSat\b|\bSun\b/.test(et)) return closedMs;
    const hm = et.match(/(\d{1,2}):(\d{2})/);
    if (!hm) return openMs;
    let h = Number(hm[1]);
    const m = Number(hm[2]);
    if (h === 24) h = 0;
    const mins = h * 60 + m;
    if (mins >= 9 * 60 + 30 && mins < 16 * 60) return openMs;
    return closedMs;
  };

  let timer = setInterval(writeTick, pickInterval());
  const retune = setInterval(() => {
    clearInterval(timer);
    timer = setInterval(writeTick, pickInterval());
  }, 60_000);

  const cleanup = () => {
    if (closed) return;
    closed = true;
    clearInterval(timer);
    clearInterval(retune);
    try { reply.raw.end(); } catch { /* ignore */ }
  };
  request.raw.on('close', cleanup);
  request.raw.on('error', cleanup);
});

// ── FMP API Proxy ──────────────────────────────────────────────
// Forwards /api/fmp/stable/* to financialmodelingprep.com/stable/*
// keeping the API key server-side.

fastify.get('/api/fmp/stable/*', async (request, reply) => {
  const url = request.url.replace('/api/fmp/stable/', '');
  const endpoint = url.split(/[?#]/)[0];

  // Reject anything not in the allowlist before spending a request with our key.
  if (!isFmpEndpointAllowed(endpoint)) {
    reply.code(403);
    return { error: 'Endpoint not allowed', allowed: [...FMP_ALLOWED_ENDPOINTS] };
  }

  const { status, body } = await proxyFmp(url, FMP_API_KEY, FMP_BASE);
  reply.code(status);
  return body;
});

// ── MacroVol API proxy ─────────────────────────────────────────
// Forwards /api/macrovol/* → MacroVol FastAPI (FRED rates/macro + yfinance greeks/surface).
// Default backend: http://127.0.0.1:8765  (override with MACROVOL_API_URL)
const MACROVOL_API_URL = (process.env.MACROVOL_API_URL || 'http://127.0.0.1:8765').replace(/\/$/, '');

fastify.route({
  method: ['GET', 'POST', 'OPTIONS'],
  url: '/api/macrovol/*',
  handler: async (request, reply) => {
    const raw = request.url || '';
    // /api/macrovol/rates/summary → /api/rates/summary
    const suffix = raw.replace(/^\/api\/macrovol/, '') || '/';
    const target = `${MACROVOL_API_URL}/api${suffix.startsWith('/') ? suffix : `/${suffix}`}`;
    try {
      const res = await fetch(target, {
        method: request.method === 'OPTIONS' ? 'GET' : request.method,
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(90_000), // greeks/surface can take 15–30s
      });
      const text = await res.text();
      let body;
      try {
        body = JSON.parse(text);
      } catch {
        body = { error: 'Invalid JSON from MacroVol API', raw: text.slice(0, 300) };
      }
      reply.code(res.status).header('X-MacroVol-Upstream', MACROVOL_API_URL);
      return body;
    } catch (err) {
      reply.code(502);
      return {
        error: 'MacroVol API unavailable',
        detail: err.message || String(err),
        hint: `Start macrovol-api on ${MACROVOL_API_URL} (cd macrovol-api && python3 -m uvicorn main:app --host 0.0.0.0 --port 8765)`,
      };
    }
  },
});

// ── OPRA skeleton (PR-10) ─────────────────────────────────────
// Disabled by default. No real vendor wiring until OPRA_VENDOR is chosen
// and credentials are provisioned. Snapshot-only; no browser→OPRA fan-out.
const OPRA_ENABLED = process.env.OPRA_ENABLED === '1' || process.env.OPRA_ENABLED === 'true';
const OPRA_VENDOR = (process.env.OPRA_VENDOR || 'stub').toLowerCase();

fastify.get('/api/opra/status', async () => ({
  enabled: OPRA_ENABLED,
  vendor: OPRA_VENDOR,
  mode: 'snapshot-only',
  ready: OPRA_ENABLED && OPRA_VENDOR !== 'stub',
  note: OPRA_ENABLED
    ? (OPRA_VENDOR === 'stub'
      ? 'OPRA_ENABLED but vendor=stub — set OPRA_VENDOR=polygon|livevol + credentials'
      : `Skeleton ready for vendor=${OPRA_VENDOR}; transport not connected`)
    : 'Set OPRA_ENABLED=1 and OPRA_VENDOR after commercial decision',
  timestamp: Date.now(),
}));

/**
 * Placeholder chain endpoint. Never proxies a live OPRA feed until vendor
 * credentials exist server-side. Returns 503 when disabled / stub.
 */
fastify.get('/api/opra/chain/:symbol', async (request, reply) => {
  const symbol = String(request.params.symbol || '').toUpperCase().replace(/[^A-Z0-9.\-]/g, '') || 'SPY';
  if (!OPRA_ENABLED) {
    reply.code(503);
    return {
      error: 'opra_disabled',
      symbol,
      hint: 'Set OPRA_ENABLED=1 after choosing a vendor (see DESIGN.md PR-10)',
    };
  }
  if (OPRA_VENDOR === 'stub') {
    reply.code(503);
    return {
      error: 'opra_stub',
      symbol,
      vendor: OPRA_VENDOR,
      hint: 'Configure OPRA_VENDOR + server-side credentials; no unauthenticated browser path',
    };
  }
  // Future: vendor-specific snapshot fetch. Deliberately not implemented.
  reply.code(501);
  return {
    error: 'opra_not_implemented',
    symbol,
    vendor: OPRA_VENDOR,
    mode: 'snapshot',
    message: `Vendor adapter for ${OPRA_VENDOR} not wired yet`,
  };
});

// ── Static Files ──────────────────────────────────────────────
// Serve static files in production
try {
  await fastify.register(fastifyStatic, {
    root: join(__dirname, 'dist'),
    wildcard: false,
  });
} catch {}

fastify.setNotFoundHandler((request, reply) => {
  if (!request.url.startsWith('/api')) {
    return reply.sendFile('index.html');
  }
  reply.code(404).send({ error: 'Not found' });
});

await fastify.listen({ port: PORT, host: '0.0.0.0' });
console.log(`Server running at http://localhost:${PORT}${OPRA_ENABLED ? ` · OPRA skeleton (${OPRA_VENDOR})` : ''}`);
