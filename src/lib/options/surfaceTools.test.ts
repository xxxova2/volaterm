import { describe, it, expect } from 'vitest';
import { buildSnapshot, buildSurfaceGrid } from './synthetic';
import {
  smileSlice,
  termSlice,
  sviReadout,
  exportSurfaceToCSV,
  exportSurfaceToJSON,
} from './surfaceTools';

describe('surfaceTools', () => {
  it('smileSlice returns IV vs strike for a single expiry', () => {
    const snap = buildSnapshot('SPY', Date.now(), 548, 0, 0);
    const grid = buildSurfaceGrid(snap);
    const slice = smileSlice(grid, 0);
    expect(slice).not.toBeNull();
    expect(slice!.expiry).toBe(grid.expiries[0]);
    expect(slice!.strikes.length).toBeGreaterThan(0);
    expect(slice!.strikes.length).toBe(slice!.ivs.length);
    for (const iv of slice!.ivs) {
      expect(iv).toBeGreaterThan(0);
      expect(Number.isFinite(iv)).toBe(true);
    }
  });

  it('termSlice returns IV vs DTE for a single strike', () => {
    const snap = buildSnapshot('SPY', Date.now(), 548, 0, 0);
    const grid = buildSurfaceGrid(snap);
    const strike = grid.strikes[Math.floor(grid.strikes.length / 2)]!;
    const slice = termSlice(grid, strike);
    expect(slice).not.toBeNull();
    expect(slice!.strike).toBe(strike);
    expect(slice!.expiries.length).toBe(grid.expiries.length);
    expect(slice!.dtes.length).toBe(slice!.expiries.length);
    expect(slice!.ivs.length).toBe(slice!.expiries.length);
    for (const iv of slice!.ivs) {
      expect(iv).toBeGreaterThan(0);
      expect(Number.isFinite(iv)).toBe(true);
    }
  });

  it('sviReadout returns valid SVI params and a positive sample count', () => {
    const snap = buildSnapshot('SPY', Date.now(), 548, 0, 0);
    const grid = buildSurfaceGrid(snap);
    const readout = sviReadout(grid, snap.spot);
    expect(readout).not.toBeNull();
    expect(readout!.samples).toBeGreaterThanOrEqual(5);
    expect(readout!.rmse).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(readout!.params.a)).toBe(true);
    expect(Number.isFinite(readout!.params.b)).toBe(true);
    expect(Number.isFinite(readout!.params.rho)).toBe(true);
    expect(Number.isFinite(readout!.params.m)).toBe(true);
    expect(Number.isFinite(readout!.params.sigma)).toBe(true);
  });

  it('exportSurfaceToCSV produces a header row and one row per expiry', () => {
    const snap = buildSnapshot('SPY', Date.now(), 548, 0, 0);
    const grid = buildSurfaceGrid(snap);
    const csv = exportSurfaceToCSV(grid);
    const lines = csv.split('\n');
    expect(lines.length).toBe(grid.expiries.length + 1);
    expect(lines[0]).toContain('expiry');
    for (const line of lines.slice(1)) {
      expect(line.length).toBeGreaterThan(0);
    }
  });

  it('exportSurfaceToJSON returns a stable schema object', () => {
    const snap = buildSnapshot('SPY', Date.now(), 548, 0, 0);
    const grid = buildSurfaceGrid(snap);
    const json = exportSurfaceToJSON(grid) as any;
    expect(json.schema).toBe('volaterm-surface-v1');
    expect(json.expiries).toEqual(grid.expiries);
    expect(json.strikes).toEqual(grid.strikes);
    expect(json.iv).toEqual(grid.iv);
  });

  it('returns null for invalid slice indices or missing strikes', () => {
    const snap = buildSnapshot('SPY', Date.now(), 548, 0, 0);
    const grid = buildSurfaceGrid(snap);
    expect(smileSlice(grid, -1)).toBeNull();
    expect(smileSlice(grid, 999)).toBeNull();
    expect(termSlice(grid, -1)).toBeNull();
    expect(termSlice(grid, 999999)).toBeNull();
  });
});
