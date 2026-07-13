import { describe, expect, it } from 'vitest';
import { toCurvePoints } from './StirSpreadCurve';

/** Mirrors StirSpread shape from lib/macrovol/api (subset used by the curve). */
type SpreadRow = {
  name: string;
  legs?: string[];
  rate_bps?: number | null;
  implied_rate?: number | null;
};

describe('toCurvePoints (STIR spread → bps curve)', () => {
  it('maps rate_bps to bps and carries full leg name', () => {
    const rows: SpreadRow[] = [
      { name: 'SR1Z5-SR3Z5', legs: ['SR1Z5', 'SR3Z5'], rate_bps: 3.2 },
      { name: 'SR1M6-SR3M6', legs: ['SR1M6', 'SR3M6'], rate_bps: -1.1 },
    ];
    const pts = toCurvePoints(rows, {
      x: (r) => r.name,
      bps: (r) => (r.rate_bps != null
        ? r.rate_bps
        : r.implied_rate != null
          ? r.implied_rate * 100
          : null),
      full: (r) => r.legs?.join(' / '),
    });
    expect(pts).toEqual([
      { x: 'SR1Z5-SR3Z5', bps: 3.2, full: 'SR1Z5 / SR3Z5' },
      { x: 'SR1M6-SR3M6', bps: -1.1, full: 'SR1M6 / SR3M6' },
    ]);
  });

  it('falls back to implied_rate*100 when rate_bps is missing', () => {
    const rows: SpreadRow[] = [{ name: 'ZQH6-SR3H6', implied_rate: 4.5 }];
    const pts = toCurvePoints(rows, {
      x: (r) => r.name,
      bps: (r) => (r.rate_bps != null
        ? r.rate_bps
        : r.implied_rate != null
          ? r.implied_rate * 100
          : null),
    });
    expect(pts).toEqual([{ x: 'ZQH6-SR3H6', bps: 450, full: undefined }]);
  });

  it('emits null bps for unresolved rows (skipped by the chart)', () => {
    const rows: SpreadRow[] = [
      { name: 'SR1Z5-SR3Z5', rate_bps: null },
      { name: 'SR1M6-SR3M6' },
    ];
    const pts = toCurvePoints(rows, {
      x: (r) => r.name,
      bps: (r) => (r.rate_bps != null
        ? r.rate_bps
        : r.implied_rate != null
          ? r.implied_rate * 100
          : null),
    });
    expect(pts.map((p) => p.bps)).toEqual([null, null]);
  });
});
