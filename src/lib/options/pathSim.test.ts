import { describe, expect, it } from 'vitest';
import { buildSnapshot } from './synthetic';
import { templateLegs } from './portfolio';
import { simulatePaths } from './pathSim';

describe('path simulator', () => {
  it('produces bands and win rate in [0,1]', () => {
    const snap = buildSnapshot('BTC', Date.now(), 90_000, 0, 0);
    const legs = templateLegs('short_straddle', snap, 0);
    const res = simulatePaths(legs, snap, {
      drift: 0,
      vol: 0.5,
      days: 14,
      steps: 20,
      paths: 80,
      seed: 3,
    });
    expect(res.t).toHaveLength(21);
    expect(res.pnlBands.p50).toHaveLength(21);
    expect(res.winRate).toBeGreaterThanOrEqual(0);
    expect(res.winRate).toBeLessThanOrEqual(1);
    expect(Number.isFinite(res.meanTerminalPnl)).toBe(true);
  });

  it('time-decays marks (theta): flat spot path still moves short-straddle PnL', () => {
    const snap = buildSnapshot('SPY', Date.now(), 500, 0, 0);
    const legs = templateLegs('short_straddle', snap, 0);
    // Near-zero realized vol → almost flat path; short vol should earn theta
    const res = simulatePaths(legs, snap, {
      drift: 0,
      vol: 0.001,
      days: 10,
      steps: 10,
      paths: 30,
      seed: 1,
    });
    // Short straddle + theta → mean terminal PnL should be positive-ish
    expect(res.meanTerminalPnl).toBeGreaterThan(0);
  });
});
