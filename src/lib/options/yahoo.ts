import type { VolSnapshot, ExpirySlice, OptionQuote } from './types';
import { computeGreeks } from './greeks';
import { impliedVol } from './ivSolver';
import { fitSVI, svi } from './svi';
import { VALIDATION_CONFIG } from '../../config/constants';

export interface YahooRawOption {
  strike: number;
  expiry: string;
  type: 'call' | 'put';
  bid: number;
  ask: number;
  last: number;
  iv: number | null;
  volume: number;
  openInterest: number;
}

export interface YahooResponse {
  symbol: string;
  spot: number;
  expirations: string[];
  quotes: YahooRawOption[];
  timestamp: number;
}

const { MIN_IV, MAX_IV } = VALIDATION_CONFIG.ranges;

function pickMid(raw: YahooRawOption): number | null {
  const hasBid = raw.bid > 0 && isFinite(raw.bid);
  const hasAsk = raw.ask > 0 && isFinite(raw.ask);
  if (hasBid && hasAsk && raw.ask >= raw.bid) {
    return (raw.bid + raw.ask) / 2;
  }
  if (raw.last > 0 && isFinite(raw.last)) return raw.last;
  if (hasBid) return raw.bid;
  if (hasAsk) return raw.ask;
  return null;
}

function intrinsic(
  type: 'call' | 'put',
  spot: number,
  strike: number,
  T: number,
  r: number,
): number {
  if (type === 'call') return Math.max(spot - strike * Math.exp(-r * T), 0);
  return Math.max(strike * Math.exp(-r * T) - spot, 0);
}

function solveIV(
  type: 'call' | 'put',
  mid: number,
  spot: number,
  strike: number,
  T: number,
  r: number,
  q: number,
): number | null {
  let iv = impliedVol(type, mid, spot, strike, T, r, q);
  if (iv == null || iv <= 0 || !isFinite(iv)) {
    iv = null;
  }
  return iv;
}

function buildOptionQuote(
  raw: YahooRawOption,
  expiry: string,
  dte: number,
  spot: number,
  r: number,
  q: number,
  iv: number,
): OptionQuote {
  const T = dte / 365;
  const g = computeGreeks(raw.type, spot, raw.strike, T, r, q, iv);
  return {
    strike: raw.strike, expiry, type: raw.type,
    bid: raw.bid, ask: raw.ask, last: raw.last,
    mid: pickMid(raw) ?? iv,
    iv, delta: g.delta, gamma: g.gamma, theta: g.theta, vega: g.vega,
    vanna: g.vanna, charm: g.charm, volga: g.volga, speed: g.speed,
    rho: g.rho, veta: g.veta, color: g.color, zomma: g.zomma, ultima: g.ultima,
    openInterest: raw.openInterest, volume: raw.volume,
  };
}

type RawWithMid = YahooRawOption & { mid: number };

function filterArbFreeQuotes(
  type: 'call' | 'put',
  rawList: YahooRawOption[],
  spot: number,
  T: number,
  r: number,
  _q: number,
): RawWithMid[] {
  const valid: RawWithMid[] = [];
  for (const raw of rawList) {
    const mid = pickMid(raw);
    if (mid == null || mid <= 0 || !isFinite(mid)) continue;
    if (raw.bid > raw.ask) continue; // crossed market
    const intr = intrinsic(type, spot, raw.strike, T, r);
    if (mid < intr * 0.99) continue; // price below intrinsic
    valid.push({ ...raw, mid });
  }
  return valid;
}

function computeIVs(
  type: 'call' | 'put',
  quotes: RawWithMid[],
  spot: number,
  T: number,
  r: number,
  q: number,
): (RawWithMid & { iv: number })[] {
  const out: (RawWithMid & { iv: number })[] = [];
  for (const raw of quotes) {
    let iv = raw.iv;
    if (iv == null || iv <= 0 || !isFinite(iv) || iv < MIN_IV || iv > MAX_IV) {
      iv = solveIV(type, raw.mid, spot, raw.strike, T, r, q);
    }
    if (iv == null || iv < MIN_IV || iv > MAX_IV) continue;
    out.push({ ...raw, iv });
  }
  return out;
}

function smoothWings(
  _type: 'call' | 'put',
  quotes: (RawWithMid & { iv: number })[],
  spot: number,
  T: number,
  r: number,
  q: number,
): OptionQuote[] {
  if (quotes.length === 0) return [];

  const strikes = quotes.map(q => q.strike);
  const ivs = quotes.map(q => q.iv);
  const fit = fitSVI(strikes, ivs, spot);

  const out: OptionQuote[] = [];
  for (const raw of quotes) {
    let iv = raw.iv;
    const k = Math.abs(Math.log(raw.strike / spot));
    const isWing = k > 0.15; // deep OTM/ITM
    if (fit && isWing) {
      const fitted = svi(fit.params, Math.log(raw.strike / spot));
      if (isFinite(fitted) && fitted > 0) {
        // Clamp extreme wing outliers to a plausible SVI band
        const lo = Math.max(MIN_IV, fitted * 0.5);
        const hi = Math.min(MAX_IV, Math.max(fitted * 2, fitted + 0.15));
        if (iv < lo || iv > hi || iv > 1.0) {
          iv = Math.max(MIN_IV, Math.min(MAX_IV, fitted));
        }
      }
    }
    const dte = Math.round(T * 365);
    out.push(buildOptionQuote(raw, raw.expiry, dte, spot, r, q, iv));
  }
  return out;
}

export function buildYahooSnapshot(
  data: YahooResponse,
  r: number,
  q: number,
  maxExpiries = 12,
): VolSnapshot | null {
  if (!data.quotes || data.quotes.length < 5) return null;

  const expiryMap = new Map<string, { calls: YahooRawOption[]; puts: YahooRawOption[] }>();
  for (const quote of data.quotes) {
    if (!expiryMap.has(quote.expiry)) {
      expiryMap.set(quote.expiry, { calls: [], puts: [] });
    }
    const bucket = expiryMap.get(quote.expiry)!;
    if (quote.type === 'call') bucket.calls.push(quote);
    else bucket.puts.push(quote);
  }

  const now = new Date();
  const slices: ExpirySlice[] = [];

  for (const [expiry, bucket] of expiryMap) {
    const dte = Math.max(1, Math.round((new Date(expiry).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    const T = dte / 365;
    if (T <= 0) continue;

    const rawCalls = filterArbFreeQuotes('call', bucket.calls, data.spot, T, r, q);
    const rawPuts = filterArbFreeQuotes('put', bucket.puts, data.spot, T, r, q);

    const callIVs = computeIVs('call', rawCalls, data.spot, T, r, q);
    const putIVs = computeIVs('put', rawPuts, data.spot, T, r, q);

    const calls = smoothWings('call', callIVs, data.spot, T, r, q);
    const puts = smoothWings('put', putIVs, data.spot, T, r, q);

    if (calls.length > 0 || puts.length > 0) {
      const allIVs = [...calls, ...puts].map(q => q.iv);
      const atmIV = allIVs.length > 0
        ? allIVs.reduce((sum: number, iv: number | null) => sum + (iv ?? 0), 0) / allIVs.length
        : 0.2;
      slices.push({ expiry, dte, calls, puts, atmIV });
    }
  }

  slices.sort((a, b) => a.dte - b.dte);

  return {
    symbol: data.symbol,
    spot: data.spot,
    riskFreeRate: r,
    dividendYield: q,
    timestamp: data.timestamp,
    expiries: slices.slice(0, maxExpiries),
  };
}

export async function fetchYahooSnapshot(
  symbol: string,
  maxExpiries = 12,
  r = 0.0525,
  q = 0.013,
): Promise<VolSnapshot | null> {
  try {
    const res = await fetch(`/api/options/${symbol}?max=${maxExpiries * 20}`);
    if (!res.ok) return null;

    const data: YahooResponse = await res.json();
    return buildYahooSnapshot(data, r, q, maxExpiries);
  } catch {
    return null;
  }
}
