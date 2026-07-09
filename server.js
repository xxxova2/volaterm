import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import rateLimit from '@fastify/rate-limit';
import { execFile } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { FMP_BASE, FMP_ALLOWED_ENDPOINTS, isFmpEndpointAllowed, buildSpyHistoryAsync, proxyFmp } from './api/_shared.js';
import {
  getOrFetch,
  peek,
  cacheStats,
  TTL,
  budgetAllows,
  recordBudget,
  getBudgetUsed,
  FMP_FREE_DAILY,
} from './api/upstreamCache.js';

// The FMP key must come from the environment — no hardcoded fallback.
// If absent, equity enrichment falls back to yfinance only (never synthetic market data).
const FMP_API_KEY = process.env.FMP_API_KEY || null;
if (!FMP_API_KEY) {
  console.warn('WARN: FMP_API_KEY not set — FMP enrichment endpoints will return 503.');
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '3001', 10);

// Restrict CORS to an explicit allowlist (comma-separated CORS_ORIGIN env var).
// Defaults to localhost dev origins. Production also allows Railway public host
// (ES module scripts always send Origin — without this the UI is a blank page).
const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000,http://localhost:3001,http://localhost:3200,http://localhost:3201')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  try {
    const u = new URL(origin);
    // Deployed Railway app (module scripts are CORS-mode)
    if (u.hostname.endsWith('.up.railway.app')) return true;
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return true;
    // Railway injects the public domain without scheme
    const pub = process.env.RAILWAY_PUBLIC_DOMAIN || process.env.RAILWAY_STATIC_URL || '';
    if (pub && (origin === `https://${pub}` || origin === `http://${pub}` || origin === pub)) {
      return true;
    }
  } catch { /* ignore */ }
  return false;
}

const DERIBIT_BASE = 'https://www.deribit.com/api/v2/public';
// MacroVol FastAPI (FRED rates / macro). Defined early for boot briefing + warmer.
const MACROVOL_API_URL = (process.env.MACROVOL_API_URL || 'http://127.0.0.1:8765').replace(/\/$/, '');

const fastify = Fastify({ logger: false });

await fastify.register(cors, {
  origin: (origin, cb) => {
    if (isAllowedOrigin(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'), false);
  },
});

// Rate limiting configuration.
// NOTE: only the FMP proxy has an external cost (the API key quota), and it is
// already protected by a 60s server-side + client-side cache, so it makes very
// few outbound calls. The yfinance endpoints are local (Python) and the app
// legitimately issues several requests per refresh — throttling them at a low
// cap silently breaks live mode (chain fetch 429s -> empty fail-closed surface).
// We therefore keep a generous local limit to absorb refresh bursts.
await fastify.register(rateLimit, {
  max: 600,
  timeWindow: '1 minute',
  // Never throttle static SPA assets — browsers load many chunks in parallel.
  allowList: (request) => {
    const u = request.url || '';
    return u.startsWith('/assets/') || u === '/favicon.svg' || u === '/favicon.ico';
  },
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

fastify.get('/api/health', async () => ({ status: 'ok', timestamp: Date.now() }));

/** Shared cache stats (HIT ages + FMP daily budget). */
fastify.get('/api/cache/status', async () => ({
  status: 'ok',
  ...cacheStats(),
  fmpDailyBudget: { used: getBudgetUsed('fmp'), cap: FMP_FREE_DAILY },
  ttlsMs: TTL,
}));

/**
 * Boot briefing: lightweight rates + macro for the first-open UI.
 * Served from shared cache so N visitors do not N× FRED.
 */
fastify.get('/api/boot/briefing', async (request, reply) => {
  try {
    const { data, fromCache, ageMs } = await getOrFetch(
      'boot:briefing',
      TTL.BRIEFING_MS,
      async () => {
        const base = MACROVOL_API_URL;
        const [ratesRes, macroRes] = await Promise.all([
          fetch(`${base}/api/rates/summary`, { signal: AbortSignal.timeout(20_000) }),
          fetch(`${base}/api/macro/summary`, { signal: AbortSignal.timeout(25_000) }),
        ]);
        const rates = ratesRes.ok ? await ratesRes.json() : null;
        const macro = macroRes.ok ? await macroRes.json() : null;
        return {
          rates,
          macro,
          as_of: new Date().toISOString(),
          source: 'macrovol+fred',
        };
      },
      { allowStaleOnError: true },
    );
    return { ...data, fromCache, ageMs };
  } catch (err) {
    reply.code(502);
    return { error: 'Briefing unavailable', detail: err.message };
  }
});

fastify.get('/api/options/:symbol', async (request, reply) => {
  const { symbol: rawSymbol } = request.params;
  const symbol = validateSymbol(rawSymbol);
  if (!symbol) {
    reply.code(400);
    return { error: 'Invalid symbol' };
  }
  const { probe, max: maxStr } = request.query;
  const isProbe = probe === '1' || probe === 'true';
  const max = parseInt(maxStr, 10);
  const maxArg = Number.isFinite(max) && max > 0 ? max : null;
  const cacheKey = `options:${symbol}:${maxArg || 'full'}`;

  try {
    // Stale shared chain still serves while a refresh is in flight (stale-while-revalidate).
    const stale = peek(cacheKey);
    if (stale && Date.now() - stale.timestamp < TTL.OPTIONS_MS) {
      if (isProbe) {
        const contracts = Array.isArray(stale.data?.quotes) ? stale.data.quotes.length : 0;
        return { available: true, contracts, fromCache: true };
      }
      return { ...stale.data, _cache: { hit: true, ageMs: Date.now() - stale.timestamp } };
    }

    const { data: result, fromCache, ageMs } = await getOrFetch(
      cacheKey,
      isProbe ? TTL.OPTIONS_PROBE_MS : TTL.OPTIONS_MS,
      () => new Promise((resolve, reject) => {
        const args = [join(__dirname, 'fetch_options.py'), symbol];
        if (maxArg) args.push(String(maxArg));
        // yfinance often needs 45–90s for multi-expiry equity chains.
        execFile('python3', args, { timeout: isProbe ? 20000 : 90000 }, (err, stdout, stderr) => {
          const tryParse = (raw) => {
            if (!raw) return null;
            try {
              const data = JSON.parse(String(raw).trim().split('\n').filter(Boolean).pop());
              if (data && !data.error && Array.isArray(data.quotes)) return data;
              if (data?.error) return { __err: data.error };
            } catch { /* fall through */ }
            return null;
          };
          const parsed = tryParse(stdout);
          if (parsed && !parsed.__err) return resolve(parsed);
          if (err) {
            console.error('Python script error:', err);
            const detail = parsed?.__err || stderr || stdout?.slice(0, 500) || err.message;
            return reject(new Error(detail));
          }
          if (parsed?.__err) return reject(new Error(parsed.__err));
          reject(new Error('Invalid response from data fetcher'));
        });
      }),
      { allowStaleOnError: true },
    );

    const contracts = Array.isArray(result.quotes) ? result.quotes.length : 0;
    if (isProbe) return { available: contracts >= 10, contracts, fromCache };

    return { ...result, _cache: { hit: fromCache, ageMs } };
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
    execFile('python3', [join(__dirname, 'fetch_yf.py'), symbol, mode], { timeout: 60000 }, (err, stdout, stderr) => {
      // Accept JSON even if yfinance wrote rate-limit noise to stderr.
      try {
        const line = String(stdout || '').trim().split('\n').filter(Boolean).pop();
        if (line) {
          const data = JSON.parse(line);
          if (!data.error) return resolve(data);
          return reject(new Error(data.error));
        }
      } catch { /* fall through to err */ }
      if (err) {
        const detail = stderr || stdout?.slice(0, 500) || err.message;
        return reject(new Error(detail));
      }
      reject(new Error('Invalid response from yfinance fetcher'));
    });
  });
}

fastify.get('/api/yf/history/:symbol', async (request, reply) => {
  const symbol = validateSymbol(request.params.symbol);
  if (!symbol) {
    reply.code(400);
    return { error: 'Invalid symbol' };
  }
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
  const symbol = validateSymbol(request.params.symbol);
  if (!symbol) {
    reply.code(400);
    return { error: 'Invalid symbol' };
  }
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

fastify.get('/api/history/spy', async (request, reply) => {
  // Real market history only: FMP (key) → yfinance. Never silent synthetic.
  const fmp = await buildSpyHistoryAsync(FMP_API_KEY, FMP_BASE, { allowSynthetic: false });
  if (fmp?.source === 'fmp' && Array.isArray(fmp.data) && fmp.data.length >= 50) {
    return fmp;
  }
  try {
    const yf = await runYf('SPY', 'history');
    const bars = Array.isArray(yf?.bars) ? yf.bars : [];
    const sorted = bars
      .map((b) => ({ date: String(b.date ?? ''), close: Number(b.close) }))
      .filter((b) => b.date && isFinite(b.close) && b.close > 0)
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    if (sorted.length < 20) {
      reply.code(502);
      return { error: 'No live SPY history (FMP/yfinance)', symbol: 'SPY', data: [], source: 'none' };
    }
    // Inline same shape as FMP path (close + ret + RV proxy).
    const data = [];
    for (let i = 0; i < sorted.length; i++) {
      const close = sorted[i].close;
      const prev = i > 0 ? sorted[i - 1].close : close;
      const ret = prev > 0 ? (close - prev) / prev : 0;
      let vix = 18;
      if (i >= 20) {
        let sum = 0;
        let sum2 = 0;
        for (let j = i - 19; j <= i; j++) {
          const p0 = sorted[j - 1] ? sorted[j - 1].close : sorted[j].close;
          const r = p0 > 0 ? Math.log(sorted[j].close / p0) : 0;
          sum += r;
          sum2 += r * r;
        }
        const mean = sum / 20;
        const var_ = Math.max(0, sum2 / 20 - mean * mean);
        vix = Math.min(80, Math.max(8, Math.sqrt(var_ * 252) * 100));
      }
      data.push({
        date: sorted[i].date,
        close: Math.round(close * 100) / 100,
        return: Math.round(ret * 100000) / 100000,
        logReturn: Math.round(Math.log(1 + ret) * 100000) / 100000,
        vix: Math.round(vix * 10) / 10,
      });
    }
    return { symbol: 'SPY', data, source: 'yfinance' };
  } catch (err) {
    reply.code(502);
    return {
      error: 'Failed to fetch live SPY history',
      detail: err.message,
      symbol: 'SPY',
      data: [],
      source: 'none',
    };
  }
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
  const symbol = validateSymbol(request.params.symbol);
  if (!symbol) {
    reply.code(400);
    return { error: 'Invalid symbol' };
  }
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
  let lastGoodTickAt = 0;
  let consecutiveFailures = 0;
  // If no good tick for this long, emit stale + end stream so client SSE chip drops.
  const STALE_MS = 90_000;
  const MAX_FAILURES = 5;

  let timer = null;
  let retune = null;
  let watchdog = null;

  const cleanup = () => {
    if (closed) return;
    closed = true;
    if (timer) clearInterval(timer);
    if (retune) clearInterval(retune);
    if (watchdog) clearInterval(watchdog);
    try { reply.raw.end(); } catch { /* ignore */ }
  };

  const writeTick = async () => {
    if (closed) return;
    try {
      const { status, body } = await proxyFmp(`quote?symbol=${encodeURIComponent(symbol)}`, FMP_API_KEY, FMP_BASE);
      if (status === 200 && Array.isArray(body) && body[0] && body[0].price > 0) {
        const q = body[0];
        lastGoodTickAt = Date.now();
        consecutiveFailures = 0;
        const payload = {
          symbol: q.symbol || symbol,
          price: q.price,
          change: q.change,
          changePercentage: q.changePercentage,
          timestamp: Date.now(),
          source: 'fmp',
        };
        reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`);
      } else {
        consecutiveFailures += 1;
        const errCode = !FMP_API_KEY ? 'no_api_key' : 'tick_failed';
        reply.raw.write(`data: ${JSON.stringify({ error: errCode, timestamp: Date.now(), consecutiveFailures })}\n\n`);
        if (
          consecutiveFailures >= MAX_FAILURES
          || (lastGoodTickAt > 0 && Date.now() - lastGoodTickAt > STALE_MS)
          || (!FMP_API_KEY && consecutiveFailures >= 2)
        ) {
          reply.raw.write(`data: ${JSON.stringify({ error: 'stream_stale', timestamp: Date.now() })}\n\n`);
          cleanup();
        }
      }
    } catch (err) {
      consecutiveFailures += 1;
      reply.raw.write(`data: ${JSON.stringify({ error: 'tick_failed', detail: String(err.message || err), timestamp: Date.now() })}\n\n`);
      if (consecutiveFailures >= MAX_FAILURES) cleanup();
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

  timer = setInterval(writeTick, pickInterval());
  retune = setInterval(() => {
    clearInterval(timer);
    timer = setInterval(writeTick, pickInterval());
  }, 60_000);

  // Watchdog: end stream if last good tick is too old (FMP dead but no throw).
  watchdog = setInterval(() => {
    if (closed) return;
    if (lastGoodTickAt > 0 && Date.now() - lastGoodTickAt > STALE_MS) {
      try {
        reply.raw.write(`data: ${JSON.stringify({ error: 'stream_stale', timestamp: Date.now() })}\n\n`);
      } catch { /* ignore */ }
      cleanup();
    }
  }, 15_000);

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

  // Shared cache + daily budget so many users don't burn FMP free tier (250/day).
  const fmpKey = `fmp:${url}`;
  const isQuote = endpoint.startsWith('quote');
  const ttl = isQuote ? TTL.FMP_QUOTE_MS : TTL.FMP_HEAVY_MS;
  try {
    const stale = peek(fmpKey);
    if (stale && Date.now() - stale.timestamp < ttl) {
      reply.header('X-Cache', 'HIT');
      return stale.data;
    }
    if (!budgetAllows('fmp', FMP_FREE_DAILY) && stale) {
      reply.header('X-Cache', 'STALE-BUDGET');
      return stale.data;
    }
    if (!FMP_API_KEY) {
      reply.code(503);
      return { error: 'FMP_API_KEY not configured' };
    }
    if (!budgetAllows('fmp', FMP_FREE_DAILY)) {
      reply.code(429);
      return {
        error: 'FMP daily budget exhausted',
        used: getBudgetUsed('fmp'),
        cap: FMP_FREE_DAILY,
      };
    }
    const { data, fromCache } = await getOrFetch(fmpKey, ttl, async () => {
      recordBudget('fmp', 1);
      const { status, body } = await proxyFmp(url, FMP_API_KEY, FMP_BASE);
      if (status >= 400) {
        const err = new Error(body?.error || `FMP ${status}`);
        err.status = status;
        err.body = body;
        throw err;
      }
      return body;
    }, { allowStaleOnError: true });
    reply.header('X-Cache', fromCache ? 'HIT' : 'MISS');
    return data;
  } catch (err) {
    if (err.body) {
      reply.code(err.status || 502);
      return err.body;
    }
    reply.code(502);
    return { error: 'FMP proxy failed', detail: err.message };
  }
});

// ── MacroVol API proxy ─────────────────────────────────────────
// Forwards /api/macrovol/* → MacroVol FastAPI (FRED rates/macro + yfinance greeks/surface).
// Lightweight rates/macro paths are shared-cached so page loads do not stampede FRED.

const MACRO_LIGHT_TTL_MS = TTL.BRIEFING_MS;
const MACRO_LIGHT_PREFIXES = [
  '/rates/summary',
  '/macro/summary',
  '/rates/curve',
  '/rates/shape',
  '/rates/basis',
  '/rates/plumbing',
];

function isMacroLightPath(suffix) {
  const path = (suffix.split('?')[0] || '').replace(/\/$/, '') || '/';
  return MACRO_LIGHT_PREFIXES.some((p) => path === p || path.startsWith(`${p}?`));
}

fastify.route({
  method: ['GET', 'POST', 'OPTIONS'],
  url: '/api/macrovol/*',
  handler: async (request, reply) => {
    const raw = request.url || '';
    // /api/macrovol/rates/summary → /api/rates/summary
    const suffix = raw.replace(/^\/api\/macrovol/, '') || '/';
    const target = `${MACROVOL_API_URL}/api${suffix.startsWith('/') ? suffix : `/${suffix}`}`;
    const light = request.method === 'GET' && isMacroLightPath(suffix);
    try {
      const loader = async () => {
        const res = await fetch(target, {
          method: request.method === 'OPTIONS' ? 'GET' : request.method,
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(90_000),
        });
        const text = await res.text();
        let body;
        try {
          body = JSON.parse(text);
        } catch {
          body = { error: 'Invalid JSON from MacroVol API', raw: text.slice(0, 300) };
        }
        return { status: res.status, body };
      };

      const result = light
        ? await getOrFetch(`macrovol:${suffix}`, MACRO_LIGHT_TTL_MS, loader, { allowStaleOnError: true })
        : { data: await loader(), fromCache: false, ageMs: 0 };

      const { status, body } = result.data;
      reply.code(status).header('X-MacroVol-Upstream', MACROVOL_API_URL);
      if (light) {
        reply.header('X-Cache', result.fromCache ? 'HIT' : 'MISS');
        reply.header('X-Cache-Age-Ms', String(result.ageMs));
      }
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
// Serve Vite build. Do not SPA-fallback /assets/* (broken JS → blank white page).
try {
  await fastify.register(fastifyStatic, {
    root: join(__dirname, 'dist'),
    wildcard: false,
    // Cache hashed assets aggressively
    maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0,
    immutable: true,
  });
} catch (err) {
  console.error('static register failed', err);
}

fastify.setNotFoundHandler((request, reply) => {
  const path = (request.url || '').split('?')[0];
  // Missing build assets must 404 (not return HTML) so the browser surfaces the real error
  if (path.startsWith('/assets/') || path.startsWith('/api')) {
    reply.code(404).send({ error: 'Not found', path });
    return;
  }
  return reply.sendFile('index.html');
});

/** Background warmer: pre-fill shared cache so first visitors get fast hits. */
async function warmSharedCaches() {
  try {
    // Boot briefing (rates + macro)
    await fetch(`http://127.0.0.1:${PORT}/api/boot/briefing`).catch(() => null);
    // SPY chain — expensive; only one in-flight via getOrFetch
    await fetch(`http://127.0.0.1:${PORT}/api/options/SPY`).catch(() => null);
    console.log('[warm] shared caches refreshed', cacheStats().entries, 'keys');
  } catch (err) {
    console.warn('[warm] skipped:', err?.message || err);
  }
}

await fastify.listen({ port: PORT, host: '0.0.0.0' });
console.log(`Server running at http://localhost:${PORT}${OPRA_ENABLED ? ` · OPRA skeleton (${OPRA_VENDOR})` : ''}`);

// Warm shortly after boot, then on a cadence under Yahoo/FMP limits.
setTimeout(() => { void warmSharedCaches(); }, 2_000);
setInterval(() => { void warmSharedCaches(); }, TTL.OPTIONS_MS);
