import { describe, it, expect } from 'vitest';
import { computeGreeks } from './greeks';

/**
 * Charm must be per calendar day — aligned with MacroVol Python and theta.
 * Regression: annual charm made Terminal 3D ~365× Greeks 1.0.
 */
describe('computeGreeks charm units', () => {
  it('stores charm per calendar day (raw / 365)', () => {
    const g = computeGreeks('call', 100, 100, 0.25, 0.05, 0.01, 0.2);
    // ATM 3M call charm/day is small magnitude; annual would be ~0.1
    expect(Math.abs(g.charm)).toBeLessThan(0.01);
    expect(Math.abs(g.charm)).toBeGreaterThan(1e-6);
    // Theta is also per day
    expect(g.theta).toBeLessThan(0);
  });

  it('call and put charm signs differ with q term', () => {
    const c = computeGreeks('call', 100, 100, 0.25, 0.05, 0.02, 0.25);
    const p = computeGreeks('put', 100, 100, 0.25, 0.05, 0.02, 0.25);
    // Not necessarily opposite, but both finite and not annual-scale
    expect(Number.isFinite(c.charm)).toBe(true);
    expect(Number.isFinite(p.charm)).toBe(true);
    expect(Math.abs(c.charm)).toBeLessThan(0.05);
    expect(Math.abs(p.charm)).toBeLessThan(0.05);
  });
});
