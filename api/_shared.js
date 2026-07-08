/**
 * Shared API logic used by BOTH the standalone Fastify server (server.js)
 * and the Vercel serverless functions under /api.
 *
 * Plain ESM (no TypeScript) so it loads directly under Node and Vercel.
 * Keeping it in one place prevents the two deployments from drifting.
 */

export const FMP_BASE = 'https://financialmodelingprep.com/stable';

// Endpoints the FMP proxy is allowed to forward. Guarded on both deployments.
// `options/symbol` powers the live option-chain / volatility surface.
// `historical-price-eod/light`, `profile`, `news/stock-latest`, `earnings-calendar`
// power the Quote tab (price chart, fundamentals, news, earnings).
export const FMP_ALLOWED_ENDPOINTS = new Set([
  'quote',
  'treasury-rates',
  'etf/holdings',
  'options/symbol',
  'historical-price-eod/light',
  'profile',
  'news/stock-latest',
  'earnings-calendar',
]);

export function isFmpEndpointAllowed(endpoint) {
  return [...FMP_ALLOWED_ENDPOINTS].some(
    (e) => endpoint === e || endpoint.startsWith(`${e}?`) || endpoint.startsWith(`${e}/`),
  );
}

// Server-side mirror cache for FMP responses. Protects the daily quota when
// multiple browser tabs / clients hit the same endpoint within the window.
const fmpCache = new Map();
const FMP_CACHE_TTL = 60_000; // 60s

/**
 * Forward an allowed FMP endpoint (path + query, without base) and return
 * { status, body }. Used by both the Fastify server and the Vercel function.
 */
export async function proxyFmp(endpoint, apiKey, base = FMP_BASE) {
  if (!apiKey) {
    return { status: 503, body: { error: 'FMP API key not configured on server' } };
  }
  const cached = fmpCache.get(endpoint);
  if (cached && Date.now() - cached.t < FMP_CACHE_TTL) {
    return { status: 200, body: cached.b };
  }
  const sep = endpoint.includes('?') ? '&' : '?';
  const target = `${base}/${endpoint}${sep}apikey=${apiKey}`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(target, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) {
      return { status: res.status, body: { error: 'FMP API error', status: res.status } };
    }
    const json = await res.json();
    fmpCache.set(endpoint, { t: Date.now(), b: json });
    return { status: 200, body: json };
  } catch (err) {
    return { status: 502, body: { error: 'FMP proxy error', detail: err.message } };
  }
}

// Deterministic PRNG so the synthetic SPY history is stable across requests.
export function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Memoized: the 30-year series is expensive to regenerate and should be
// identical on every request, so compute it once and reuse.
let spyHistoryCache = null;

export function buildSpyHistory() {
  if (spyHistoryCache) return spyHistoryCache;
  const rand = mulberry32(0x5dee5);
  const data = [];
  let price = 40;
  let vix = 18;
  const start = new Date('1993-01-29');
  const now = new Date();

  for (let d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) {
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    const ret = (rand() - 0.5) * 0.02;
    price *= 1 + ret;
    vix = Math.max(8, Math.min(80, vix + (rand() - 0.5) * 2));
    data.push({
      date: d.toISOString().slice(0, 10),
      close: Math.round(price * 100) / 100,
      return: Math.round(ret * 100000) / 100000,
      logReturn: Math.round(Math.log(1 + ret) * 100000) / 100000,
      vix: Math.round(vix * 10) / 10,
    });
  }

  spyHistoryCache = { symbol: 'SPY', data };
  return spyHistoryCache;
}
