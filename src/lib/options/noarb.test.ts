import { describe, it, expect } from 'vitest';
import { buildSnapshot, buildSurfaceGrid } from './synthetic';
import { diagnoseArbitrage } from './noarb';
import type { SurfaceGrid } from './types';

function cloneGrid(grid: SurfaceGrid): SurfaceGrid {
  return {
    expiries: [...grid.expiries],
    dtes: [...grid.dtes],
    strikes: [...grid.strikes],
    iv: grid.iv.map(row => [...row]),
    bid: grid.bid.map(row => [...row]),
    ask: grid.ask.map(row => [...row]),
    delta: grid.delta.map(row => [...row]),
  };
}

describe('diagnoseArbitrage', () => {
  it('reports clean for a valid fitted synthetic surface', () => {
    const snap = buildSnapshot('SPY', Date.now(), 548, 0, 0);
    const grid = buildSurfaceGrid(snap);
    const result = diagnoseArbitrage(grid, snap.spot);
    expect(result.clean).toBe(true);
    expect(result.calendar.violations).toBe(0);
    expect(result.butterfly.violations).toBe(0);
  });

  it('detects calendar arbitrage when IV^2*T decreases with expiry', () => {
    const snap = buildSnapshot('SPY', Date.now(), 548, 0, 0);
    const grid = cloneGrid(buildSurfaceGrid(snap));
    expect(grid.iv.length).toBeGreaterThanOrEqual(2);
    expect(grid.strikes.length).toBeGreaterThan(0);

    // Force the second expiry to have a lower total implied variance than the first.
    const c = Math.floor(grid.strikes.length / 2);
    grid.iv[0]![c] = 0.30;
    grid.iv[1]![c] = 0.18; // 0.18^2*14/365 < 0.30^2*7/365 -> calendar arb

    const result = diagnoseArbitrage(grid, snap.spot);
    expect(result.calendar.violations).toBeGreaterThan(0);
    expect(result.clean).toBe(false);
  });

  it('detects butterfly arbitrage when IV^2 is concave in log-moneyness', () => {
    const snap = buildSnapshot('SPY', Date.now(), 548, 0, 0);
    const grid = cloneGrid(buildSurfaceGrid(snap));
    expect(grid.strikes.length).toBeGreaterThanOrEqual(3);

    // Concave bump in the middle: middle IV much higher than neighbors.
    const r = Math.floor(grid.iv.length / 2);
    const c = Math.floor(grid.strikes.length / 2);
    grid.iv[r]![c - 1] = 0.20;
    grid.iv[r]![c] = 0.50;
    grid.iv[r]![c + 1] = 0.20;

    const result = diagnoseArbitrage(grid, snap.spot);
    expect(result.butterfly.violations).toBeGreaterThan(0);
    expect(result.clean).toBe(false);
  });

  it('returns zero violations for empty or tiny grids', () => {
    const grid: SurfaceGrid = {
      expiries: ['2026-07-30'],
      dtes: [30],
      strikes: [100],
      iv: [[0.20]],
      bid: [[null]],
      ask: [[null]],
      delta: [[null]],
    };
    const result = diagnoseArbitrage(grid, 100);
    expect(result.calendar.violations).toBe(0);
    expect(result.butterfly.violations).toBe(0);
    expect(result.clean).toBe(true);
  });
});
