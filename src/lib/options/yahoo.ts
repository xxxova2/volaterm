import type { VolSnapshot, ExpirySlice, OptionQuote } from './types';
import { computeGreeks } from './greeks';
import { impliedVol } from './ivSolver';

interface YahooRawOption {
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

interface YahooResponse {
  symbol: string;
  spot: number;
  expirations: string[];
  quotes: YahooRawOption[];
  timestamp: number;
}

export async function fetchYahooSnapshot(
  symbol: string,
  maxExpiries = 12,
): Promise<VolSnapshot | null> {
  try {
    const res = await fetch(`/api/options/${symbol}?max=${maxExpiries * 20}`);
    if (!res.ok) return null;

    const data: YahooResponse = await res.json();
    if (!data.quotes || data.quotes.length < 5) return null;

    const r = 0.0525;
    const q = 0.013;

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

      const calls: OptionQuote[] = [];
      const puts: OptionQuote[] = [];
      let callIVSum = 0, callIVCount = 0;

      for (const raw of bucket.calls) {
        const mid = raw.last > 0 ? raw.last : (raw.bid + raw.ask) / 2;
        let iv = raw.iv;
        if (iv == null || iv <= 0) {
          iv = impliedVol('call', mid, data.spot, raw.strike, T, r, q);
        }
        if (iv == null || iv <= 0) continue;

        const g = computeGreeks('call', data.spot, raw.strike, T, r, q, iv);
        callIVSum += iv;
        callIVCount++;

        calls.push({
          strike: raw.strike, expiry, type: 'call',
          bid: raw.bid, ask: raw.ask, last: raw.last,
          mid,
          iv, delta: g.delta, gamma: g.gamma, theta: g.theta, vega: g.vega,
          vanna: g.vanna, charm: g.charm, volga: g.volga, speed: g.speed,
          rho: g.rho, veta: g.veta, color: g.color, zomma: g.zomma, ultima: g.ultima,
          openInterest: raw.openInterest, volume: raw.volume,
        });
      }

      let putIVSum = 0, putIVCount = 0;
      for (const raw of bucket.puts) {
        const mid = raw.last > 0 ? raw.last : (raw.bid + raw.ask) / 2;
        let iv = raw.iv;
        if (iv == null || iv <= 0) {
          iv = impliedVol('put', mid, data.spot, raw.strike, T, r, q);
        }
        if (iv == null || iv <= 0) continue;

        const g = computeGreeks('put', data.spot, raw.strike, T, r, q, iv);
        putIVSum += iv;
        putIVCount++;

        puts.push({
          strike: raw.strike, expiry, type: 'put',
          bid: raw.bid, ask: raw.ask, last: raw.last,
          mid,
          iv, delta: g.delta, gamma: g.gamma, theta: g.theta, vega: g.vega,
          vanna: g.vanna, charm: g.charm, volga: g.volga, speed: g.speed,
          rho: g.rho, veta: g.veta, color: g.color, zomma: g.zomma, ultima: g.ultima,
          openInterest: raw.openInterest, volume: raw.volume,
        });
      }

      if (calls.length > 0 || puts.length > 0) {
        const atmIV = callIVCount > 0 ? callIVSum / callIVCount : (putIVCount > 0 ? putIVSum / putIVCount : 0.2);
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
  } catch {
    return null;
  }
}
