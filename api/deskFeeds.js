/**
 * Shared desk feeds — Alpha Vantage + TradingView RapidAPI.
 * All keys server-only. Budget-gated. Fail-closed (no synthetic prices).
 *
 * Use cases (free max, not worse than existing):
 *  - Alpha Vantage: SPY GLOBAL_QUOTE + TIME_SERIES_DAILY + OVERVIEW (slow TTL)
 *  - TradingView: SPY / BTC candle snapshot (scarce monthly budget)
 *  - Finnhub quotes live in server.js (same budget pattern)
 */

import {
  budgetAllows,
  recordBudget,
  monthBudgetAllows,
  recordMonthBudget,
  ALPHA_VANTAGE_FREE_DAILY,
  TRADINGVIEW_FREE_MONTHLY,
  getBudgetUsed,
  getMonthBudgetUsed,
} from './upstreamCache.js';

const AV_BASE = 'https://www.alphavantage.co/query';
const TV_HOST = process.env.RAPIDAPI_TV_HOST || 'tradingview-data1.p.rapidapi.com';
const TV_BASE = `https://${TV_HOST}`;

function avKey() {
  return process.env.ALPHA_VANTAGE_API_KEY || process.env.ALPHAVANTAGE_API_KEY || null;
}

function rapidKey() {
  return process.env.RAPIDAPI_KEY || process.env.X_RAPIDAPI_KEY || null;
}

/**
 * Alpha Vantage JSON GET. Records 1 against daily budget.
 * @param {Record<string, string>} params
 */
export async function alphaVantageFetch(params) {
  const key = avKey();
  if (!key) {
    const err = new Error('ALPHA_VANTAGE_API_KEY not configured');
    err.code = 'no_api_key';
    throw err;
  }
  if (!budgetAllows('alphavantage', ALPHA_VANTAGE_FREE_DAILY, 0.85)) {
    const err = new Error(
      `Alpha Vantage daily budget exhausted (${getBudgetUsed('alphavantage')}/${ALPHA_VANTAGE_FREE_DAILY})`,
    );
    err.code = 'budget_exhausted';
    throw err;
  }
  const u = new URL(AV_BASE);
  for (const [k, v] of Object.entries(params)) {
    if (v != null) u.searchParams.set(k, String(v));
  }
  u.searchParams.set('apikey', key);
  const res = await fetch(u.toString(), {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(20_000),
  });
  recordBudget('alphavantage', 1);
  if (!res.ok) {
    throw new Error(`Alpha Vantage HTTP ${res.status}`);
  }
  const json = await res.json();
  if (json?.Note || json?.Information) {
    const err = new Error(String(json.Note || json.Information));
    err.code = 'rate_limited';
    throw err;
  }
  if (json?.['Error Message']) {
    throw new Error(String(json['Error Message']));
  }
  return json;
}

/** GLOBAL_QUOTE → normalized last print. */
export async function alphaVantageGlobalQuote(symbol) {
  const json = await alphaVantageFetch({
    function: 'GLOBAL_QUOTE',
    symbol: String(symbol).toUpperCase(),
  });
  const q = json?.['Global Quote'] || {};
  const price = parseFloat(q['05. price']);
  const prev = parseFloat(q['08. previous close']);
  const change = parseFloat(q['09. change']);
  const changePct = parseFloat(String(q['10. change percent'] || '').replace('%', ''));
  if (!(price > 0)) {
    return {
      symbol: String(symbol).toUpperCase(),
      price: null,
      previous_close: null,
      change: null,
      change_pct: null,
      as_of: new Date().toISOString(),
      source: 'Alpha Vantage',
      error: 'empty_quote',
      note: 'No GLOBAL_QUOTE price. Fail-closed.',
    };
  }
  return {
    symbol: String(symbol).toUpperCase(),
    price,
    previous_close: Number.isFinite(prev) ? prev : null,
    change: Number.isFinite(change) ? change : null,
    change_pct: Number.isFinite(changePct) ? changePct : null,
    volume: q['06. volume'] != null ? Number(q['06. volume']) : null,
    latest_trading_day: q['07. latest trading day'] || null,
    as_of: new Date().toISOString(),
    source: 'Alpha Vantage',
    error: null,
    note: 'Shared desk quote · free-tier budgeted · not OPRA live.',
  };
}

/** TIME_SERIES_DAILY compact → last N bars. */
export async function alphaVantageDaily(symbol, limit = 60) {
  const json = await alphaVantageFetch({
    function: 'TIME_SERIES_DAILY',
    symbol: String(symbol).toUpperCase(),
    outputsize: 'compact',
  });
  const series = json?.['Time Series (Daily)'] || {};
  const dates = Object.keys(series).sort().reverse().slice(0, Math.max(5, Math.min(limit, 100)));
  const bars = dates.map((date) => {
    const r = series[date] || {};
    return {
      date,
      open: parseFloat(r['1. open']) || null,
      high: parseFloat(r['2. high']) || null,
      low: parseFloat(r['3. low']) || null,
      close: parseFloat(r['4. close']) || null,
      volume: parseFloat(r['5. volume']) || null,
    };
  }).filter((b) => b.close != null && b.close > 0);
  // Chronological for charts
  bars.reverse();
  return {
    symbol: String(symbol).toUpperCase(),
    bars,
    count: bars.length,
    as_of: new Date().toISOString(),
    source: 'Alpha Vantage',
    error: bars.length ? null : 'empty',
    note: bars.length
      ? 'Daily OHLCV · shared cache · free-tier budgeted.'
      : 'No daily bars returned. Fail-closed.',
  };
}

/** Company OVERVIEW (fundamentals snapshot). */
export async function alphaVantageOverview(symbol) {
  const json = await alphaVantageFetch({
    function: 'OVERVIEW',
    symbol: String(symbol).toUpperCase(),
  });
  if (!json || !json.Symbol) {
    return {
      symbol: String(symbol).toUpperCase(),
      overview: null,
      as_of: new Date().toISOString(),
      source: 'Alpha Vantage',
      error: 'empty',
      note: 'No OVERVIEW. Fail-closed.',
    };
  }
  return {
    symbol: String(symbol).toUpperCase(),
    overview: {
      name: json.Name || null,
      sector: json.Sector || null,
      industry: json.Industry || null,
      market_cap: json.MarketCapitalization ? Number(json.MarketCapitalization) : null,
      pe: json.PERatio && json.PERatio !== 'None' ? parseFloat(json.PERatio) : null,
      beta: json.Beta && json.Beta !== 'None' ? parseFloat(json.Beta) : null,
      dividend_yield: json.DividendYield && json.DividendYield !== 'None'
        ? parseFloat(json.DividendYield)
        : null,
      week52_high: json['52WeekHigh'] ? parseFloat(json['52WeekHigh']) : null,
      week52_low: json['52WeekLow'] ? parseFloat(json['52WeekLow']) : null,
      description: json.Description ? String(json.Description).slice(0, 400) : null,
    },
    as_of: new Date().toISOString(),
    source: 'Alpha Vantage',
    error: null,
    note: 'Fundamentals snapshot · shared · free-tier budgeted.',
  };
}

/**
 * TradingView RapidAPI — scarce monthly budget.
 * Tries quote-style path; returns fail-closed payload if endpoint unusable.
 *
 * @param {'SPY'|'BTCUSD'|string} symbol
 */
export async function tradingViewSnapshot(symbol) {
  const key = rapidKey();
  if (!key) {
    const err = new Error('RAPIDAPI_KEY not configured');
    err.code = 'no_api_key';
    throw err;
  }
  if (!monthBudgetAllows('tradingview', TRADINGVIEW_FREE_MONTHLY, 0.85)) {
    const err = new Error(
      `TradingView monthly budget exhausted (${getMonthBudgetUsed('tradingview')}/${TRADINGVIEW_FREE_MONTHLY})`,
    );
    err.code = 'budget_exhausted';
    throw err;
  }

  // Map desk symbols to common TV tickers
  const tvSymbol = mapTvSymbol(symbol);
  const headers = {
    Accept: 'application/json',
    'X-RapidAPI-Key': key,
    'X-RapidAPI-Host': TV_HOST,
  };

  // ONE request only — monthly budget is scarce; multi-probe burned 4/150 in tests.
  // Override path via RAPIDAPI_TV_PATH if your RapidAPI playground shows a working route.
  const path = process.env.RAPIDAPI_TV_PATH || `/symbol?symbol=${encodeURIComponent(tvSymbol)}`;
  const url = path.startsWith('http') ? path : `${TV_BASE}${path.startsWith('/') ? path : `/${path}`}`;

  try {
    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(15_000),
    });
    recordMonthBudget('tradingview', 1);
    recordBudget('tradingview', 1);
    if (res.status === 429) {
      return {
        symbol: tvSymbol,
        price: null,
        bars: [],
        as_of: new Date().toISOString(),
        source: 'TradingView RapidAPI',
        error: 'rate_limited',
        note: 'RapidAPI 429 — pause TV until budget/TTL. SPY/BTC still from Finnhub/yfinance/Deribit.',
        endpoint: url.replace(TV_BASE, ''),
      };
    }
    if (!res.ok) {
      return {
        symbol: tvSymbol,
        price: null,
        bars: [],
        as_of: new Date().toISOString(),
        source: 'TradingView RapidAPI',
        error: `HTTP ${res.status}`,
        note: 'TV path failed (set RAPIDAPI_TV_PATH to your working playground route). Other feeds unchanged.',
        endpoint: url.replace(TV_BASE, ''),
      };
    }
    const json = await res.json();
    const normalized = normalizeTvPayload(tvSymbol, json);
    if (normalized.price != null || (normalized.bars && normalized.bars.length)) {
      return {
        ...normalized,
        as_of: new Date().toISOString(),
        source: 'TradingView RapidAPI',
        error: null,
        note: 'Shared desk snapshot · monthly budget · not for SOFR/EFFR (use NY Fed/FRED).',
        endpoint: url.replace(TV_BASE, ''),
      };
    }
    return {
      symbol: tvSymbol,
      price: null,
      bars: [],
      as_of: new Date().toISOString(),
      source: 'TradingView RapidAPI',
      error: 'empty_payload',
      note: 'Response had no price/bars. Fail-closed. Existing feeds unchanged.',
      endpoint: url.replace(TV_BASE, ''),
      raw_keys: Object.keys(json || {}).slice(0, 12),
    };
  } catch (e) {
    return {
      symbol: tvSymbol,
      price: null,
      bars: [],
      as_of: new Date().toISOString(),
      source: 'TradingView RapidAPI',
      error: e?.message || String(e),
      note: 'TradingView request failed. Fail-closed.',
    };
  }
}

function mapTvSymbol(symbol) {
  const s = String(symbol).toUpperCase().replace('-', '');
  if (s === 'BTC' || s === 'BTCUSD' || s === 'XBT') return 'BTCUSD';
  if (s === 'ETH' || s === 'ETHUSD') return 'ETHUSD';
  return s;
}

function normalizeTvPayload(symbol, json) {
  if (!json || typeof json !== 'object') {
    return { symbol, price: null, bars: [] };
  }
  // Various shapes
  const price =
    num(json.price)
    ?? num(json.last)
    ?? num(json.close)
    ?? num(json?.data?.price)
    ?? num(json?.quote?.price)
    ?? num(json?.d?.[0]?.v?.lp)
    ?? null;

  let bars = [];
  const rawBars = json.bars || json.candles || json.history || json?.data?.candles || null;
  if (Array.isArray(rawBars)) {
    bars = rawBars.slice(-80).map((b) => ({
      t: b.t ?? b.time ?? b.timestamp ?? null,
      open: num(b.o ?? b.open),
      high: num(b.h ?? b.high),
      low: num(b.l ?? b.low),
      close: num(b.c ?? b.close),
      volume: num(b.v ?? b.volume),
    })).filter((b) => b.close != null);
  }

  return {
    symbol,
    price,
    change_pct: num(json.change_pct ?? json.changePercent ?? json.chp),
    bars,
    raw_keys: Object.keys(json).slice(0, 12),
  };
}

function num(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function providerKeysStatus() {
  return {
    finnhub: !!(process.env.FINNHUB_API_KEY),
    alphavantage: !!avKey(),
    rapidapi_tradingview: !!rapidKey(),
    fmp: !!(process.env.FMP_API_KEY),
    fred: !!(process.env.FRED_API_KEY),
  };
}
