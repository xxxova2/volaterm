import { describe, it, expect } from 'vitest';
import { interpretHedgeFlow, riskBudgetGeometry } from './hedgeFlow';

describe('interpretHedgeFlow', () => {
  it('flags toxic short gamma below flip', () => {
    const b = interpretHedgeFlow({
      totalGEX: -1e9,
      totalVEX: 0,
      totalCharm: 1e6,
      spot: 90,
      gammaFlip: 100,
    });
    expect(b.tone).toBe('down');
    expect(b.headline.toLowerCase()).toMatch(/short|toxic/);
    expect(b.bias.toLowerCase()).toMatch(/sell/);
  });

  it('long gamma dampening above flip', () => {
    const b = interpretHedgeFlow({
      totalGEX: 1e9,
      totalVEX: 0,
      totalCharm: 0,
      spot: 105,
      gammaFlip: 100,
    });
    expect(b.tone).toBe('up');
    expect(b.headline.toLowerCase()).toMatch(/long|dampen/);
  });

  it('detects charm vs vanna conflict', () => {
    const b = interpretHedgeFlow({
      totalGEX: -1e8,
      totalVEX: -1e7,
      totalCharm: 1e7,
      spot: 100,
      gammaFlip: 100,
    });
    expect(b.interaction).toMatch(/conflict/i);
    expect(b.tone).toBe('warn');
  });
});

describe('riskBudgetGeometry', () => {
  it('ATM premium ≈ 0.4 S σ√T and ~69% touch at that stop', () => {
    const r = riskBudgetGeometry({ spot: 100, atmIV: 0.2, dte: 30 });
    const volTime = 100 * 0.2 * Math.sqrt(30 / 365);
    expect(r.atmPremiumApprox).toBeCloseTo(0.4 * volTime, 6);
    expect(r.probTouchPremium).toBeGreaterThan(0.65);
    expect(r.probTouchPremium).toBeLessThan(0.75);
    // half-touch distance ≈ 1.67× premium
    expect(r.stopAtHalfTouch / r.stopAtPremium).toBeCloseTo(0.67 / 0.4, 2);
    expect(r.probTouchHalf).toBeGreaterThan(0.45);
    expect(r.probTouchHalf).toBeLessThan(0.55);
  });
});
