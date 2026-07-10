/**
 * Multi-symbol watchlist with last-seen ATM IV / GEX / spot (localStorage).
 * Metrics only update when that symbol is the active desk book — no fake multi-chain fetch.
 */

const LIST_KEY = 'terminal.watchlist.v1';
const METRICS_KEY = 'terminal.watchlist.metrics.v1';
const DEFAULT_LIST = ['SPY', 'QQQ', 'IWM', 'BTC', 'ETH'];

export type WatchMetrics = {
  symbol: string;
  spot: number | null;
  atmIV: number | null;
  totalGEX: number | null;
  gammaFlip: number | null;
  /** 0–100 if we have enough history samples stored */
  ivRankPct: number | null;
  updatedAt: number;
};

export type WatchMetricsStore = Record<string, WatchMetrics & { ivSamples?: number[] }>;

export function loadWatchlist(): string[] {
  try {
    const raw = localStorage.getItem(LIST_KEY);
    if (!raw) return [...DEFAULT_LIST];
    const arr = JSON.parse(raw) as string[];
    if (!Array.isArray(arr) || !arr.length) return [...DEFAULT_LIST];
    return arr.map((s) => String(s).toUpperCase()).slice(0, 12);
  } catch {
    return [...DEFAULT_LIST];
  }
}

export function saveWatchlist(symbols: string[]): void {
  try {
    localStorage.setItem(LIST_KEY, JSON.stringify(symbols.map((s) => s.toUpperCase()).slice(0, 12)));
  } catch {
    /* ignore */
  }
}

export function addToWatchlist(symbol: string): string[] {
  const s = symbol.toUpperCase().trim();
  if (!s) return loadWatchlist();
  const list = loadWatchlist().filter((x) => x !== s);
  list.unshift(s);
  const next = list.slice(0, 12);
  saveWatchlist(next);
  return next;
}

export function removeFromWatchlist(symbol: string): string[] {
  const next = loadWatchlist().filter((x) => x !== symbol.toUpperCase());
  saveWatchlist(next.length ? next : [...DEFAULT_LIST]);
  return loadWatchlist();
}

function loadMetricsStore(): WatchMetricsStore {
  try {
    const raw = localStorage.getItem(METRICS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as WatchMetricsStore;
  } catch {
    return {};
  }
}

function saveMetricsStore(store: WatchMetricsStore): void {
  try {
    localStorage.setItem(METRICS_KEY, JSON.stringify(store));
  } catch {
    /* ignore */
  }
}

/** Record live desk metrics for the active symbol (call when snapshot refreshes). */
export function recordWatchMetrics(input: {
  symbol: string;
  spot: number;
  atmIV: number | null;
  totalGEX: number | null;
  gammaFlip: number | null;
}): WatchMetrics {
  const store = loadMetricsStore();
  const key = input.symbol.toUpperCase();
  const prev = store[key];
  const samples = [...(prev?.ivSamples ?? [])];
  if (input.atmIV != null && Number.isFinite(input.atmIV)) {
    samples.push(input.atmIV);
    while (samples.length > 60) samples.shift();
  }
  let ivRankPct: number | null = null;
  if (input.atmIV != null && samples.length >= 5) {
    const below = samples.filter((v) => v <= input.atmIV!).length;
    ivRankPct = (below / samples.length) * 100;
  }
  const row: WatchMetrics & { ivSamples?: number[] } = {
    symbol: key,
    spot: input.spot,
    atmIV: input.atmIV,
    totalGEX: input.totalGEX,
    gammaFlip: input.gammaFlip,
    ivRankPct,
    updatedAt: Date.now(),
    ivSamples: samples,
  };
  store[key] = row;
  saveMetricsStore(store);
  const { ivSamples: _, ...pub } = row;
  return pub;
}

export function getWatchMetrics(symbols: string[]): WatchMetrics[] {
  const store = loadMetricsStore();
  return symbols.map((s) => {
    const key = s.toUpperCase();
    const row = store[key];
    if (!row) {
      return {
        symbol: key,
        spot: null,
        atmIV: null,
        totalGEX: null,
        gammaFlip: null,
        ivRankPct: null,
        updatedAt: 0,
      };
    }
    return {
      symbol: row.symbol,
      spot: row.spot,
      atmIV: row.atmIV,
      totalGEX: row.totalGEX,
      gammaFlip: row.gammaFlip,
      ivRankPct: row.ivRankPct,
      updatedAt: row.updatedAt,
    };
  });
}
