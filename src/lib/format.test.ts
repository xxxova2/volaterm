import { describe, it, expect } from 'vitest';
import { fmtSigned } from './format';

describe('fmtSigned', () => {
  it('formats residual-style signed numbers for parity table', () => {
    expect(fmtSigned(1.25)).toBe('+1.25');
    expect(fmtSigned(-0.5)).toBe('-0.50');
    expect(fmtSigned(null)).toBe('\u2014');
  });
});
