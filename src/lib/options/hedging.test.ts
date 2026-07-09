import { describe, expect, it } from 'vitest';
import { buildSnapshot } from './synthetic';
import { defaultHedgeFromSnapshot, simulateDeltaHedge } from './hedging';

describe('delta hedging', () => {
  const snap = buildSnapshot('BTC', Date.now(), 100_000, 0, 0);

  it('defaults to an ATM short call-ish config', () => {
    const d = defaultHedgeFromSnapshot(snap);
    expect(d.strike).toBeGreaterThan(0);
    expect(d.vol).toBeGreaterThan(0);
    expect(d.T).toBeGreaterThan(0);
  });

  it('runs threshold hedge with finite terminal PnL', () => {
    const d = defaultHedgeFromSnapshot(snap);
    const res = simulateDeltaHedge({
      mode: 'threshold',
      threshold: 0.15,
      tolerance: 0.05,
      periodSteps: 5,
      type: 'call',
      strike: d.strike!,
      T: d.T!,
      vol: d.vol!,
      realizedVol: d.vol!,
      drift: 0,
      days: 14,
      steps: 40,
      optionQty: -1,
      hedgeInstrument: 'spot',
      r: snap.riskFreeRate,
      q: 0,
      seed: 1,
    }, snap.spot);
    expect(res.steps.length).toBe(41);
    expect(Number.isFinite(res.terminalPnl)).toBe(true);
    expect(res.tradeCount).toBeGreaterThan(0);
  });
});
