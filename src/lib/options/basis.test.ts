import { describe, expect, it } from 'vitest';
import { buildSnapshot } from './synthetic';
import { buildBasisCurve, isCryptoSymbol, resolveCryptoUnderlyings, rollPnlHeatmap } from './basis';

describe('basis / crypto helpers', () => {
  it('detects crypto symbols', () => {
    expect(isCryptoSymbol('BTC')).toBe(true);
    expect(isCryptoSymbol('SPY')).toBe(false);
  });

  it('resolves BTC underlyings', () => {
    const u = resolveCryptoUnderlyings('BTC');
    expect(u.spotSymbol).toBe('BTC-USD');
    expect(u.chainSymbol).toBe('IBIT');
  });

  it('builds a basis curve with positive T', () => {
    const snap = buildSnapshot('BTC', Date.now(), 100_000, 0, 0);
    const c = buildBasisCurve(snap);
    expect(c.points.length).toBeGreaterThan(0);
    expect(c.points[0]!.forward).toBeGreaterThan(0);
    expect(c.points[0]!.source).toBe('theo');
    expect(c.hasMarketMarks).toBe(false);
  });

  it('prefers live futures marks when present', () => {
    const snap = buildSnapshot('BTC', Date.now(), 100_000, 0, 0);
    const front = snap.expiries[0]!;
    const mktMark = 102_000;
    const withMarks = {
      ...snap,
      futuresMarks: [{
        instrument: 'BTC-TEST',
        expiry: front.expiry,
        dte: front.dte,
        mark: mktMark,
        index: 100_000,
        basis: 2_000,
        annCarry: 0.1,
        isPerp: false,
      }],
    };
    const c = buildBasisCurve(withMarks);
    expect(c.hasMarketMarks).toBe(true);
    expect(c.points[0]!.source).toBe('market');
    expect(c.points[0]!.forward).toBe(mktMark);
  });

  it('roll heatmap has matching dims', () => {
    const snap = buildSnapshot('SPY', Date.now(), 500, 0, 0);
    const h = rollPnlHeatmap(snap);
    expect(h.pnl.length).toBe(h.shocks.length);
    expect(h.pnl[0]!.length).toBe(h.horizons.length);
  });
});
