import { describe, it, expect } from 'vitest';
import { buildSnapshot, buildSurfaceGrid } from './synthetic';
import { DATA_CONFIG } from '../../config/constants';

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
});
