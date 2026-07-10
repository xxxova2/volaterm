/**
 * Shared desk feeds — browser only hits OUR backend.
 * Finnhub / Alpha Vantage / TradingView keys never leave the server.
 */

export interface DeskBudgets {
  fmp?: { used: number; capDaily: number };
  alphavantage?: { used: number; capDaily: number };
  finnhub?: { used: number; capDailySoft: number };
  tradingview?: { usedMonth: number; capMonthly: number; usedToday: number };
}

export interface DeskPack {
  symbol: string;
  finnhub_quote?: {
    price?: number | null;
    change_pct?: number | null;
    as_of?: string;
    fromCache?: boolean;
    ageMs?: number;
    error?: string | null;
    source?: string;
  };
  alphavantage_quote?: {
    price?: number | null;
    change_pct?: number | null;
    latest_trading_day?: string | null;
    as_of?: string;
    fromCache?: boolean;
    ageMs?: number;
    error?: string | null;
    source?: string;
  };
  alphavantage_daily?: {
    bars?: { date: string; close: number | null }[];
    count?: number;
    as_of?: string;
    fromCache?: boolean;
    error?: string | null;
  };
  tradingview?: {
    price?: number | null;
    change_pct?: number | null;
    error?: string | null;
    note?: string;
    source?: string;
    fromCache?: boolean;
  };
  budgets?: DeskBudgets | null;
  keys?: Record<string, boolean>;
  as_of?: string;
  note?: string;
}

export interface CacheStatus {
  status: string;
  budgets?: DeskBudgets;
  keys?: Record<string, boolean>;
  desk?: { equities: string[]; crypto: string[] };
  note?: string;
  entries?: number;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  return data as T;
}

/** One shared board pack for Home (SPY default). */
export function fetchDeskPack(symbol = 'SPY'): Promise<DeskPack> {
  const q = new URLSearchParams({ symbol: symbol.toUpperCase() });
  return fetchJson(`/api/desk/pack?${q}`);
}

export function fetchCacheStatus(): Promise<CacheStatus> {
  return fetchJson('/api/cache/status');
}
