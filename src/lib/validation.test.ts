/**
 * Tests for validation utilities
 */

import { describe, it, expect } from 'vitest';
import { sanitizeSymbol } from './validation';

describe('Symbol Validation', () => {
  it('should sanitize symbols correctly', () => {
    expect(sanitizeSymbol('spy')).toBe('SPY');
    expect(sanitizeSymbol('  SPY  ')).toBe('SPY');
    expect(sanitizeSymbol('AAPL')).toBe('AAPL');
    expect(sanitizeSymbol('')).toBe(null);
    expect(sanitizeSymbol('123')).toBe(null);
  });
});
