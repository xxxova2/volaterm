import { describe, it, expect } from 'vitest';
import { buildSnapshot, buildSurfaceGrid, pickSurfaceQuote } from './synthetic';
import type { ExpirySlice, OptionQuote } from './types';
import { DATA_CONFIG } from '../../config/constants';

function q(partial: Partial<OptionQuote> & Pick<OptionQuote, 'strike' | 'type' | 'iv'>): OptionQuote {
  return {
    expiry: '2026-08-01',
    bid: 1,
    ask: 1.2,
    last: 1.1,
    mid: 1.1,
    delta: partial.type === 'call' ? 0.4 : -0.4,
    gamma: 0,
    theta: 0,
    vega: 0,
    vanna: 0,
    charm: 0,
    volga: 0,
    speed: 0,
    rho: 0,
    veta: 0,
    color: 0,
    zomma: 0,
    ultima: 0,
    openInterest: 10,
    volume: 5,
    ...partial,
  };
}

describe('DATA_CONFIG grid depth', () => {
  it('has at least 15 expiries including weekly DTEs', () => {
    expect(DATA_CONFIG.EXPIRY_DTES.length).toBeGreaterThanOrEqual(15);
    const weeklies = [1, 2, 3, 4, 5, 7, 14, 21];
    for (const dte of weeklies) {
      expect(DATA_CONFIG.EXPIRY_DTES).toContain(dte);
    }
  });

  it('has 1% strike step and wider wings', () => {
    expect(DATA_CONFIG.strikes.STEP_RATIO).toBeLessThanOrEqual(0.01);
    expect(DATA_CONFIG.strikes.HALF_STRIKES).toBeGreaterThanOrEqual(25);
  });
});

describe('buildSnapshot / buildSurfaceGrid', () => {
  it('produces a weekly term structure with >= 15 expiries', () => {
    const snap = buildSnapshot('SPY', Date.now(), 548, 0, 0);
    expect(snap.expiries.length).toBeGreaterThanOrEqual(15);
  });

  it('produces a dense strike grid with >= 51 strikes', () => {
    const snap = buildSnapshot('SPY', Date.now(), 548, 0, 0);
    const surface = buildSurfaceGrid(snap);
    expect(surface.strikes.length).toBeGreaterThanOrEqual(51);
  });

  it('returns a surface grid with >= 15 x >= 51 dimensions and no null IV wells', () => {
    const snap = buildSnapshot('SPY', Date.now(), 548, 0, 0);
    const surface = buildSurfaceGrid(snap);
    expect(surface.expiries.length).toBeGreaterThanOrEqual(15);
    expect(surface.strikes.length).toBeGreaterThanOrEqual(51);
    expect(surface.iv.length).toBe(surface.expiries.length);

    for (const row of surface.iv) {
      expect(row.length).toBe(surface.strikes.length);
      for (const v of row) {
        expect(v).not.toBeNull();
        expect(v).toBeGreaterThan(0);
      }
    }
  });

  it('buildSurfaceGrid accepts wingMode without throwing', () => {
    const snap = buildSnapshot('SPY', Date.now(), 548, 0, 0);
    for (const wingMode of ['otm', 'itm', 'all'] as const) {
      const surface = buildSurfaceGrid(snap, { wingMode });
      expect(surface.strikes.length).toBeGreaterThan(0);
    }
  });
});

describe('pickSurfaceQuote wing modes', () => {
  const spot = 100;
  const call = q({ strike: 105, type: 'call', iv: 0.2 });
  const put = q({ strike: 105, type: 'put', iv: 0.3 });
  const slice: ExpirySlice = {
    expiry: '2026-08-01',
    dte: 30,
    atmIV: 0.2,
    calls: [call],
    puts: [put],
  };

  it('otm prefers call above spot', () => {
    expect(pickSurfaceQuote(slice, 105, spot, 'otm')?.type).toBe('call');
    expect(pickSurfaceQuote(slice, 105, spot, 'otm')?.iv).toBe(0.2);
  });

  it('itm prefers put above spot', () => {
    expect(pickSurfaceQuote(slice, 105, spot, 'itm')?.type).toBe('put');
    expect(pickSurfaceQuote(slice, 105, spot, 'itm')?.iv).toBe(0.3);
  });

  it('all averages call and put IV when both exist', () => {
    const blended = pickSurfaceQuote(slice, 105, spot, 'all');
    expect(blended?.iv).toBeCloseTo(0.25, 6);
  });

  it('otm prefers put below spot', () => {
    const lowCall = q({ strike: 90, type: 'call', iv: 0.4 });
    const lowPut = q({ strike: 90, type: 'put', iv: 0.22 });
    const low: ExpirySlice = {
      expiry: '2026-08-01',
      dte: 30,
      atmIV: 0.2,
      calls: [lowCall],
      puts: [lowPut],
    };
    expect(pickSurfaceQuote(low, 90, spot, 'otm')?.type).toBe('put');
    expect(pickSurfaceQuote(low, 90, spot, 'itm')?.type).toBe('call');
  });
});
