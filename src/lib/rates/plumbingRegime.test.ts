import { describe, expect, it } from 'vitest';
import { classifyPlumbingRegime, sofrEffrBps } from './plumbingRegime';

describe('sofrEffrBps', () => {
  it('converts percentage points to bps', () => {
    expect(sofrEffrBps(5.32, 5.3)).toBeCloseTo(2, 5);
  });
  it('null-safe', () => {
    expect(sofrEffrBps(null, 5)).toBeNull();
  });
});

describe('classifyPlumbingRegime', () => {
  it('flags excess cash when RRP elevated', () => {
    const r = classifyPlumbingRegime({
      sofr: 5.3,
      effr: 5.3,
      iorb: 5.4,
      rrpRate: 5.3,
      rrpVolumeBn: 400,
      reservesBn: 3000,
    });
    expect(r.id).toBe('excess_cash');
  });

  it('flags drained RRP + wide SOFR-EFFR', () => {
    const r = classifyPlumbingRegime({
      sofr: 5.4,
      effr: 5.3,
      iorb: 5.4,
      rrpRate: 5.3,
      rrpVolumeBn: 20,
      reservesBn: 2800,
    });
    expect(r.id).toBe('excess_collateral');
  });

  it('corridor normal when spreads tight and RRP moderate', () => {
    const r = classifyPlumbingRegime({
      sofr: 5.31,
      effr: 5.3,
      iorb: 5.4,
      rrpRate: 5.3,
      rrpVolumeBn: 120,
      reservesBn: 3000,
    });
    expect(r.id).toBe('corridor_normal');
  });
});
