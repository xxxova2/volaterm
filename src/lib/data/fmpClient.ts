/**
 * FMP API client — calls the local proxy (/api/fmp/stable/*)
 * so the API key stays server-side.
 *
 * All reads go through a small in-memory TTL cache keyed by endpoint+params.
 * This is what makes the FMP Free plan (250 req/day) usable: the store
 * refreshes every few seconds, but the cache absorbs repeats so we only hit
 * the network when a value actually expires. Failed (paid-only) endpoints are
 * cached as "negative" for a while so we don't retry them every cycle.
 */

import type {
  FmpQuote,
  FmpTreasuryRate,
  FmpEtfHolding,
  FmpOptionsResponse,
  FmpPriceBar,
  FmpProfile,
  FmpNewsItem,
  FmpEarnings,
} from './types';

const FMP_PROXY = '/api/fmp/stable';

interface CacheEntry {
  value: unknown;
  expiry: number;
  negative: boolean;
}

const cache = new Map<string, CacheEntry>();

function getCached(key: string): CacheEntry | null {
  const e = cache.get(key);
  if (!e) return null;
  if (Date.now() > e.expiry) {
    cache.delete(key);
    return null;
  }
  return e;
}

export interface FmpResult {
  status: number;
  error: string | null;
  json: unknown;
}

function isFmpError(json: unknown): boolean {
  return (
    !!json &&
    typeof json === 'object' &&
    ('Error Message' in (json as Record<string, unknown>) || 'error' in (json as Record<string, unknown>))
  );
}

function extractFmpError(json: unknown, text: string): string {
  if (json && typeof json === 'object') {
    const o = json as Record<string, unknown>;
    if ('Error Message' in o && o['Error Message']) return String(o['Error Message']);
    if ('error' in o && o.error) return String(o.error);
  }
  return text.slice(0, 160);
}

/**
 * Single FMP fetch through the server proxy, with caching.
 * @param ttl          success cache lifetime (ms)
 * @param negativeTtl  how long to cache a failure (ms); 0 = no negative caching
 */
export async function fmpGet(
  endpoint: string,
  opts: { ttl?: number; negativeTtl?: number } = {},
): Promise<FmpResult> {
  const cached = getCached(endpoint);
  if (cached) {
    if (cached.negative) return { status: 0, error: 'cached-failure', json: null };
    return { status: 200, error: null, json: cached.value };
  }

  try {
    const res = await fetch(`${FMP_PROXY}/${endpoint}`);
    const text = await res.text();
    let json: unknown = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* non-JSON body */
    }

    if (!res.ok) {
      const msg = extractFmpError(json, text);
      if (opts.negativeTtl && opts.negativeTtl > 0) {
        cache.set(endpoint, { value: null, expiry: Date.now() + opts.negativeTtl, negative: true });
      }
      return { status: res.status, error: `HTTP ${res.status}: ${msg}`, json: null };
    }

    if (isFmpError(json)) {
      const msg = extractFmpError(json, text);
      if (opts.negativeTtl && opts.negativeTtl > 0) {
        cache.set(endpoint, { value: null, expiry: Date.now() + opts.negativeTtl, negative: true });
      }
      return { status: res.status, error: `FMP: ${msg}`, json: null };
    }

    cache.set(endpoint, { value: json, expiry: Date.now() + (opts.ttl ?? 60_000), negative: false });
    return { status: 200, error: null, json };
  } catch (e) {
    return { status: 0, error: `Network error: ${(e as Error).message}`, json: null };
  }
}

/** Normalise the price history response across FMP's object/array shapes. */
function normalizePriceHistory(json: unknown): FmpPriceBar[] | null {
  if (!json) return null;
  let arr: unknown[] = [];
  if (Array.isArray(json)) arr = json;
  else if (json && typeof json === 'object' && Array.isArray((json as { historical?: unknown[] }).historical)) {
    arr = (json as { historical: unknown[] }).historical;
  } else {
    return null;
  }
  return arr
    .filter((d): d is Record<string, unknown> => !!d && typeof d === 'object')
    .map((d) => ({
      date: String(d.date ?? ''),
      open: Number(d.open) || 0,
      high: Number(d.high) || 0,
      low: Number(d.low) || 0,
      close: Number(d.close) || 0,
      volume: Number(d.volume) || 0,
    }))
    .filter((b) => b.date && isFinite(b.close) && b.close > 0);
}

export async function fetchFmpQuote(symbol: string) {
  // Short TTL so live spot tracks the market; Free-tier still fine with
  // adaptive closed-session intervals in the store.
  const r = await fmpGet(`quote?symbol=${symbol}`, { ttl: 12_000 });
  return r.json as FmpQuote[] | null;
}

/** Returns the latest treasury yield curve. */
export async function fetchFmpTreasuryRates() {
  const r = await fmpGet('treasury-rates', { ttl: 3_600_000 });
  return r.json as FmpTreasuryRate[] | null;
}

export async function fetchFmpEtfHoldings(symbol: string) {
  const r = await fmpGet(`etf/holdings?symbol=${symbol}`, { ttl: 86_400_000 });
  return r.json as FmpEtfHolding[] | null;
}

/** Live option chain for the symbol (paid FMP package; cached negative on failure). */
export async function fetchFmpOptions(symbol: string) {
  const r = await fmpGet(`options/symbol/${encodeURIComponent(symbol)}`, {
    ttl: 300_000,
    negativeTtl: 300_000,
  });
  return r.json as FmpOptionsResponse | null;
}

/** Underlying price history (OHLCV) for the chart. */
export async function fetchFmpPriceHistory(symbol: string, limit = 365) {
  const r = await fmpGet(`historical-price-eod/light?symbol=${encodeURIComponent(symbol)}&limit=${limit}`, {
    ttl: 3_600_000,
  });
  return normalizePriceHistory(r.json);
}

export async function fetchFmpProfile(symbol: string) {
  const r = await fmpGet(`profile?symbol=${encodeURIComponent(symbol)}`, { ttl: 86_400_000 });
  const arr = r.json as FmpProfile[] | null;
  return arr && arr.length > 0 ? arr[0]! : null;
}

export async function fetchFmpNews(symbol: string, limit = 20) {
  const r = await fmpGet(`news/stock-latest?symbol=${encodeURIComponent(symbol)}&limit=${limit}`, {
    ttl: 300_000,
  });
  return r.json as FmpNewsItem[] | null;
}

export async function fetchFmpEarnings(symbol: string) {
  const r = await fmpGet(`earnings-calendar?symbol=${encodeURIComponent(symbol)}`, { ttl: 86_400_000 });
  return r.json as FmpEarnings[] | null;
}

/** Drop cached entries. Pass a prefix to scope the clear (e.g. 'options/symbol'). */
export function invalidateFmpCache(endpointPrefix?: string) {
  if (!endpointPrefix) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(endpointPrefix)) cache.delete(key);
  }
}
