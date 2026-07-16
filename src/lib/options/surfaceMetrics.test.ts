import { describe, it, expect } from 'vitest';
import {
  extractSurfaceMetrics,
  metricsDelta,
  pushSurfaceMetrics,
} from './surfaceMetrics';
import type { VolSnapshot, ExpirySlice, OptionQuote } from './types';

function q(
  partial: Partial<OptionQuote> & Pick<OptionQuote, 'strike' | 'type' | 'iv' | 'delta'>,
): OptionQuote {
  return {
    expiry: '2026-07-17',
    bid: 1,
    ask: 1.1,
    last: 1.05,
    mid: 1.05,
    gamma: 0.01,
    theta: -0.01,
    vega: 0.1,
    vanna: 0,
    charm: 0,
    volga: 0,
    speed: 0,
    rho: 0,
    veta: 0,
    color: 0,
    zomma: 0,
    ultima: 0,
    openInterest: 100,
    volume: 10,
    ...partial,
  };
}

function makeSnap(): VolSnapshot {
  const expiry = '2026-07-17';
  const calls: OptionQuote[] = [
    q({ strike: 100, type: 'call', iv: 0.2, delta: 0.5 }),
    q({ strike: 105, type: 'call', iv: 0.18, delta: 0.25 }),
    q({ strike: 110, type: 'call', iv: 0.16, delta: 0.1 }),
  ];
  const puts: OptionQuote[] = [
    q({ strike: 100, type: 'put', iv: 0.2, delta: -0.5 }),
    q({ strike: 95, type: 'put', iv: 0.24, delta: -0.25 }),
    q({ strike: 90, type: 'put', iv: 0.3, delta: -0.1 }),
  ];
  const slice: ExpirySlice = {
    expiry,
    dte: 2,
    calls,
    puts,
    atmIV: 0.2,
  };
  return {
    symbol: 'SPY',
    spot: 100,
    riskFreeRate: 0.04,
    dividendYield: 0.01,
    timestamp: 1_000,
    expiries: [slice],
    surfaceSource: 'live',
  };
}

describe('surfaceMetrics', () => {
  it('extracts ATM, fixed-K, and 25Δ RR/fly', () => {
    const m = extractSurfaceMetrics(makeSnap(), 'full_chain', 1_000);
    expect(m.atmIv).toBeCloseTo(0.2, 5);
    expect(m.fixedK.length).toBe(3);
    expect(m.rr25).not.toBeNull();
    // put wing 0.24 − call wing 0.18 = +0.06 (rich puts)
    expect(m.rr25!).toBeCloseTo(0.06, 2);
    expect(m.path).toBe('full_chain');
  });

  it('metricsDelta reports ATM bps', () => {
    const a = extractSurfaceMetrics(makeSnap(), 'full_chain', 1_000);
    const snap2 = makeSnap();
    snap2.expiries[0]!.atmIV = 0.21;
    snap2.timestamp = 2_000;
    const b = extractSurfaceMetrics(snap2, 'sticky_spot', 2_000);
    const d = metricsDelta(a, b);
    expect(d.atmBps).toBe(100); // 1 vol point = 100 bps of vol
  });

  it('pushSurfaceMetrics caps length', () => {
    let frames: ReturnType<typeof extractSurfaceMetrics>[] = [];
    for (let i = 0; i < 40; i++) {
      frames = pushSurfaceMetrics(frames, extractSurfaceMetrics(makeSnap(), 'full_chain', i * 10_000), 32);
    }
    expect(frames.length).toBe(32);
  });
});
