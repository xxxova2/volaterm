import { describe, it, expect } from 'vitest';
import { interpolateSurface } from './interpolate';
import { svi } from './svi';
import type { SVIParams } from './types';

const TRUE: SVIParams = { a: 0.04, b: 0.15, rho: -0.3, m: 0, sigma: 0.1 };
const SPOT = 100;
const STRIKES = [80, 85, 90, 95, 100, 105, 110, 115, 120];

function k(s: number) { return Math.log(s / SPOT); }
function synthRow(): number[] { return STRIKES.map(s => svi(TRUE, k(s))); }

describe('interpolateSurface', () => {
  it('fills null cells within an expiry via SVI fit (no zeros)', () => {
    const row = synthRow();
    const holed: (number | null)[] = row.map((v, i) =>
      i === 3 || i === 4 || i === 5 ? null : v,
    );
    const { iv, fits } = interpolateSurface(STRIKES, SPOT, [holed], [30]);
    expect(iv.length).toBe(1);
    expect(iv[0]).toHaveLength(STRIKES.length);
    expect(fits[0]).not.toBeNull();
    for (const v of iv[0]!) {
      expect(v).not.toBeNull();
      expect(v!).toBeGreaterThan(0);
    }
    for (let i = 0; i < STRIKES.length; i++) {
      expect(Math.abs(iv[0]![i]! - row[i]!)).toBeLessThan(1e-3);
    }
  });

  it('interpolates unfit rows temporally from neighboring expiries', () => {
    const goodRow = synthRow();
    const unfitRow: (number | null)[] = [null, null, null, null, null];
    const shortStrikes = [80, 90, 100, 110, 120];
    const { iv, fits } = interpolateSurface(
      shortStrikes, SPOT,
      [goodRow.slice(0, 5), unfitRow, goodRow.slice(0, 5)],
      [7, 14, 30],
    );
    expect(fits[1]).toBeNull();
    for (const v of iv[1]!) {
      expect(v).not.toBeNull();
      expect(v!).toBeGreaterThan(0);
    }
    for (let i = 0; i < 5; i++) {
      expect(Math.abs(iv[1]![i]! - iv[0]![i]!)).toBeLessThan(0.01);
    }
  });

  it('produces min IV > 0 across the whole grid (no zero-wells)', () => {
    const row = synthRow();
    const holed: (number | null)[] = row.map((v, i) =>
      i % 2 === 0 ? null : v,
    );
    const { iv } = interpolateSurface(STRIKES, SPOT, [holed, holed, holed], [7, 30, 90]);
    let minIV = Infinity;
    for (const r of iv) {
      for (const v of r!) {
        if (v != null && v < minIV) minIV = v;
      }
    }
    expect(minIV).toBeGreaterThan(0);
  });

  it('handles empty input', () => {
    const { iv, fits } = interpolateSurface([], SPOT, [], []);
    expect(iv).toEqual([]);
    expect(fits).toEqual([]);
  });

  it('extrapolates from nearest expiry when edge row is unfit', () => {
    const goodRow = synthRow();
    const unfitRow: (number | null)[] = STRIKES.map(() => null);
    const { iv } = interpolateSurface(
      STRIKES, SPOT,
      [unfitRow, goodRow],
      [7, 30],
    );
    for (const v of iv[0]!) {
      expect(v).not.toBeNull();
      expect(v!).toBeGreaterThan(0);
    }
  });
});
