import { describe, it, expect } from 'vitest';
import { buildYahooSnapshot, YahooResponse } from './yahoo';
import { blackScholes } from './black-scholes';

const SPOT = 550;
const R = 0.0525;
const Q = 0.013;

function makeQuote(
  expiry: string,
  strike: number,
  type: 'call' | 'put',
  targetIV: number,
  overrides: { bid?: number; ask?: number; last?: number; iv?: number | null } = {},
) {
  const dte = Math.max(1, Math.round((new Date(expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  const t = dte / 365;
  const bs = blackScholes(type, SPOT, strike, t, R, Q, targetIV);
  // Symmetric spread around the fair BS price; keeps bid positive and mid == fair price.
  const epsilon = Math.max(0.005, bs.price * 0.03);
  const bid = bs.price > epsilon ? bs.price - epsilon : bs.price * 0.5;
  const ask = bs.price > epsilon ? bs.price + epsilon : bs.price * 1.5;
  return {
    strike,
    expiry,
    type,
    bid: overrides.bid ?? bid,
    ask: overrides.ask ?? ask,
    last: overrides.last ?? 0,
    iv: overrides.iv ?? null,
    volume: 100,
    openInterest: 1000,
  };
}

function buildFixture(quotes: ReturnType<typeof makeQuote>[]): YahooResponse {
  return {
    symbol: 'SPY',
    spot: SPOT,
    expirations: [...new Set(quotes.map(q => q.expiry))],
    quotes,
    timestamp: Date.now(),
  };
}

function baseStrikes(): number[] {
  return [500, 520, 540, 550, 560, 580, 600];
}

function makeBaseQuotes(expiry: string, targetIV: number): ReturnType<typeof makeQuote>[] {
  const quotes: ReturnType<typeof makeQuote>[] = [];
  for (const k of baseStrikes()) {
    quotes.push(makeQuote(expiry, k, 'call', targetIV));
    quotes.push(makeQuote(expiry, k, 'put', targetIV));
  }
  return quotes;
}

describe('buildYahooSnapshot', () => {
  it('solves IV from mid-price when raw.iv is missing', () => {
    const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const targetIV = 0.22;
    const quotes = makeBaseQuotes(expiry, targetIV);

    const snap = buildYahooSnapshot(buildFixture(quotes), R, Q);
    expect(snap).not.toBeNull();
    expect(snap!.expiries.length).toBe(1);

    const all = [...snap!.expiries[0]!.calls, ...snap!.expiries[0]!.puts];
    expect(all.length).toBeGreaterThanOrEqual(5);
    for (const q of all) {
      expect(q.iv).toBeGreaterThan(0);
      expect(Math.abs(q.iv - targetIV)).toBeLessThan(1e-4);
    }
  });

  it('prefers mid over last when both present', () => {
    const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const targetIV = 0.20;
    const quotes = makeBaseQuotes(expiry, targetIV);
    // Corrupt last on a few quotes; mid should still yield correct IVs.
    for (let i = 0; i < Math.min(4, quotes.length); i++) {
      quotes[i]!.last = 999;
    }

    const snap = buildYahooSnapshot(buildFixture(quotes), R, Q);
    expect(snap).not.toBeNull();
    for (const q of [...snap!.expiries[0]!.calls, ...snap!.expiries[0]!.puts]) {
      expect(Math.abs(q.iv - targetIV)).toBeLessThan(1e-4);
    }
  });

  it('filters crossed markets and prices below intrinsic', () => {
    const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const quotes = makeBaseQuotes(expiry, 0.22);
    const crossed = makeQuote(expiry, 555, 'call', 0.22, { bid: 20, ask: 15 });
    const belowIntrinsic = makeQuote(expiry, 450, 'call', 0.22, { bid: 0.5, ask: 0.6 });
    quotes.push(crossed, belowIntrinsic);

    const snap = buildYahooSnapshot(buildFixture(quotes), R, Q);
    expect(snap).not.toBeNull();
    const callStrikes = snap!.expiries[0]!.calls.map(q => q.strike);
    expect(callStrikes).toContain(550);
    expect(callStrikes).not.toContain(555);
    expect(callStrikes).not.toContain(450);
  });

  it('keeps valid raw IV when present and solves only when invalid', () => {
    const expiry = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const targetIV = 0.18;
    const quotes = makeBaseQuotes(expiry, targetIV);
    // Zero out raw IVs on a subset; solver should still recover target IV.
    for (let i = 0; i < Math.min(4, quotes.length); i++) {
      quotes[i]!.iv = 0;
    }

    const snap = buildYahooSnapshot(buildFixture(quotes), R, Q);
    expect(snap).not.toBeNull();
    for (const q of [...snap!.expiries[0]!.calls, ...snap!.expiries[0]!.puts]) {
      expect(Math.abs(q.iv - targetIV)).toBeLessThan(1e-4);
    }
  });

  it('produces finite Greeks and no null IVs', () => {
    const expiry = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const quotes = makeBaseQuotes(expiry, 0.21);

    const snap = buildYahooSnapshot(buildFixture(quotes), R, Q);
    expect(snap).not.toBeNull();
    for (const q of [...snap!.expiries[0]!.calls, ...snap!.expiries[0]!.puts]) {
      expect(Number.isFinite(q.iv)).toBe(true);
      expect(q.iv).toBeGreaterThan(0);
      expect(Number.isFinite(q.delta ?? 0)).toBe(true);
      expect(Number.isFinite(q.vega ?? 0)).toBe(true);
    }
  });
});
