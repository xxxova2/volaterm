import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import rateLimit from '@fastify/rate-limit';
import { execFile } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { FMP_BASE, FMP_ALLOWED_ENDPOINTS, isFmpEndpointAllowed, buildSpyHistory, proxyFmp } from './api/_shared.js';

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
const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3001')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

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

// Input validation helper
function validateSymbol(symbol) {
  if (!symbol || typeof symbol !== 'string') {
    return null;
  }
  const sanitized = symbol.trim().toUpperCase();
  // Allow 1-5 letter symbols only
  if (!/^[A-Z]{1,5}$/.test(sanitized)) {
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

fastify.get('/api/history/spy', async () => buildSpyHistory());

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
console.log(`Server running at http://localhost:${PORT}`);
