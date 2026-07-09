import { describe, it, expect } from 'vitest';
import { termRiskFreeRate, estimateDividendYield } from './marketParams';
import type { FmpTreasuryRate } from '../data/types';

const curve: FmpTreasuryRate = {
  date: '2026-01-15',
  year1: 4.2,
  year2: 4.0,
  year3: 3.9,
  year5: 3.8,
  year7: 3.9,
  year10: 4.1,
  year20: 4.4,
  year30: 4.5,
};

describe('termRiskFreeRate', () => {
  it('returns fallback without curve', () => {
    const r = termRiskFreeRate(null, 0.5);
    expect(r).toBeGreaterThan(0);
    expect(r).toBeLessThan(0.2);
  });

  it('uses short tenor for near-term T', () => {
    const r = termRiskFreeRate(curve, 0.25);
    expect(r).toBeCloseTo(0.042, 4);
  });

  it('interpolates between tenors', () => {
    // Midway year1 (4.2%) and year2 (4.0%) at T=1.5
    const r = termRiskFreeRate(curve, 1.5);
    expect(r).toBeCloseTo(0.041, 4);
  });

  it('caps at long end', () => {
    const r = termRiskFreeRate(curve, 40);
    expect(r).toBeCloseTo(0.045, 4);
  });
});

describe('estimateDividendYield', () => {
  it('uses explicit dividendYield percent', () => {
    expect(estimateDividendYield('XYZ', { price: 100, dividendYield: 2.5 })).toBeCloseTo(0.025, 5);
  });

  it('annualizes lastDiv', () => {
    // $0.50 quarterly → 2% on $100
    expect(estimateDividendYield('XYZ', { price: 100, lastDiv: 0.5 })).toBeCloseTo(0.02, 5);
  });

  it('falls back to index defaults', () => {
    expect(estimateDividendYield('SPY')).toBeCloseTo(0.013, 4);
    expect(estimateDividendYield('QQQ')).toBeCloseTo(0.006, 4);
  });
});
