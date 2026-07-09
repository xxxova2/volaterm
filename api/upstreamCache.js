/**
 * Shared in-process cache for upstream market data.
 * Many browser users → one cached snapshot; background refresh fills keys.
 */

/** @typedef {{ data: unknown, timestamp: number, source?: string }} CacheEntry */

const store = new Map();
/** @type {Map<string, Promise<unknown>>} */
const inflight = new Map();

/** Per-day call counters for hard-budgeted providers (e.g. FMP free 250/day). */
const dayBudget = new Map();

function dayKey(provider) {
  const d = new Date();
  return `${provider}:${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
}

export function getBudgetUsed(provider) {
  return dayBudget.get(dayKey(provider)) || 0;
}

export function recordBudget(provider, n = 1) {
  const k = dayKey(provider);
  dayBudget.set(k, (dayBudget.get(k) || 0) + n);
  return dayBudget.get(k);
}

/**
 * @param {string} provider
 * @param {number} maxPerDay
 * @param {number} [headroom=0.85] leave unused room under hard cap
 */
export function budgetAllows(provider, maxPerDay, headroom = 0.85) {
  return getBudgetUsed(provider) < Math.floor(maxPerDay * headroom);
}

/**
 * @template T
 * @param {string} key
 * @param {number} ttlMs
 * @param {() => Promise<T>} loader
 * @param {{ allowStaleOnError?: boolean, force?: boolean }} [opts]
 * @returns {Promise<{ data: T, fromCache: boolean, ageMs: number }>}
 */
export async function getOrFetch(key, ttlMs, loader, opts = {}) {
  const now = Date.now();
  const hit = store.get(key);
  if (!opts.force && hit && now - hit.timestamp < ttlMs) {
    return { data: hit.data, fromCache: true, ageMs: now - hit.timestamp };
  }

  let pending = inflight.get(key);
  if (!pending) {
    pending = (async () => {
      try {
        const data = await loader();
        store.set(key, { data, timestamp: Date.now() });
        return data;
      } catch (err) {
        if (opts.allowStaleOnError !== false && hit) {
          return hit.data;
        }
        throw err;
      } finally {
        inflight.delete(key);
      }
    })();
    inflight.set(key, pending);
  }

  const data = await pending;
  const entry = store.get(key);
  const ageMs = entry ? Date.now() - entry.timestamp : 0;
  return { data, fromCache: false, ageMs };
}

export function peek(key) {
  return store.get(key) || null;
}

export function setCache(key, data) {
  store.set(key, { data, timestamp: Date.now() });
}

export function cacheStats() {
  const keys = [];
  const now = Date.now();
  for (const [k, v] of store.entries()) {
    keys.push({ key: k, ageMs: now - v.timestamp });
  }
  return {
    entries: keys.length,
    keys,
    budgets: {
      fmp: getBudgetUsed('fmp'),
    },
  };
}

/** TTLs aligned to provider limits (see rate-limit research). */
export const TTL = {
  OPTIONS_MS: 3 * 60_000,       // yfinance — 3 min shared chain
  OPTIONS_PROBE_MS: 60_000,
  DERIBIT_MS: 45_000,           // public market data
  FMP_QUOTE_MS: 5 * 60_000,     // free 250/day → ~every 5+ min
  FMP_HEAVY_MS: 30 * 60_000,    // history / rare endpoints
  BRIEFING_MS: 5 * 60_000,      // rates + macro snapshot for boot UI
  YF_ENRICH_MS: 10 * 60_000,
};

export const FMP_FREE_DAILY = 250;
