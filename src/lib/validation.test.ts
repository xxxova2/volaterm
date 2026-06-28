/**
 * Tests for validation utilities
 */

import { describe, it, expect } from 'vitest';
import {
  isValidSymbol,
  sanitizeSymbol,
  isInRange,
  isValidIV,
  isValidSpot,
  isValidDTE,
  isValidOptionQuote,
  clampValue,
  validateNumberInput,
} from './validation';

describe('Symbol Validation', () => {
  it('should validate correct symbols', () => {
    expect(isValidSymbol('SPY')).toBe(true);
    expect(isValidSymbol('AAPL')).toBe(true);
    expect(isValidSymbol('TSLA')).toBe(true);
    expect(isValidSymbol('A')).toBe(true);
    expect(isValidSymbol('ABCDE')).toBe(true);
  });

  it('should reject invalid symbols', () => {
    expect(isValidSymbol('')).toBe(false);
    expect(isValidSymbol('ABCDEF')).toBe(false); // Too long
    expect(isValidSymbol('123')).toBe(false); // Numbers
    expect(isValidSymbol('SPY!')).toBe(false); // Special chars
    // isValidSymbol auto-uppercases, so lowercase is accepted and normalized
    expect(isValidSymbol('spy')).toBe(true); // Normalized to SPY
  });

  it('should sanitize symbols correctly', () => {
    expect(sanitizeSymbol('spy')).toBe('SPY');
    expect(sanitizeSymbol('  SPY  ')).toBe('SPY');
    expect(sanitizeSymbol('AAPL')).toBe('AAPL');
    expect(sanitizeSymbol('')).toBe(null);
    expect(sanitizeSymbol('123')).toBe(null);
  });
});

describe('Range Validation', () => {
  it('should validate ranges correctly', () => {
    expect(isInRange(5, 0, 10)).toBe(true);
    expect(isInRange(0, 0, 10)).toBe(true);
    expect(isInRange(10, 0, 10)).toBe(true);
    expect(isInRange(-1, 0, 10)).toBe(false);
    expect(isInRange(11, 0, 10)).toBe(false);
    expect(isInRange(NaN, 0, 10)).toBe(false);
  });
});

describe('IV Validation', () => {
  it('should validate IV values', () => {
    expect(isValidIV(0.15)).toBe(true);
    expect(isValidIV(0.01)).toBe(true); // Minimum
    expect(isValidIV(3.0)).toBe(true); // Maximum
    expect(isValidIV(0.005)).toBe(false); // Below minimum
    expect(isValidIV(3.5)).toBe(false); // Above maximum
    expect(isValidIV(-0.1)).toBe(false); // Negative
  });
});

describe('Spot Price Validation', () => {
  it('should validate spot prices', () => {
    expect(isValidSpot(100)).toBe(true);
    expect(isValidSpot(0.01)).toBe(true); // Minimum
    expect(isValidSpot(10000)).toBe(true);
    expect(isValidSpot(0)).toBe(false);
    expect(isValidSpot(-10)).toBe(false);
  });
});

describe('DTE Validation', () => {
  it('should validate DTE values', () => {
    expect(isValidDTE(30)).toBe(true);
    expect(isValidDTE(0)).toBe(true); // Minimum
    expect(isValidDTE(365)).toBe(true);
    expect(isValidDTE(-1)).toBe(false);
  });
});

describe('Option Quote Validation', () => {
  it('should validate valid option quotes', () => {
    expect(isValidOptionQuote({
      strike: 100,
      bid: 1.5,
      ask: 2.0,
      iv: 0.2,
    })).toBe(true);
  });

  it('should reject invalid strikes', () => {
    expect(isValidOptionQuote({
      strike: -10,
      bid: 1.5,
      ask: 2.0,
    })).toBe(false);
  });

  it('should reject invalid bid/ask spreads', () => {
    expect(isValidOptionQuote({
      strike: 100,
      bid: 2.0,
      ask: 1.5, // Ask below bid
    })).toBe(false);
  });

  it('should reject negative bid/ask', () => {
    expect(isValidOptionQuote({
      strike: 100,
      bid: -1.0,
      ask: 2.0,
    })).toBe(false);
  });

  it('should reject invalid IV', () => {
    expect(isValidOptionQuote({
      strike: 100,
      bid: 1.5,
      ask: 2.0,
      iv: 5.0, // Too high
    })).toBe(false);
  });
});

describe('Value Clamping', () => {
  it('should clamp values within range', () => {
    expect(clampValue(5, 0, 10, 5)).toBe(5);
    expect(clampValue(-5, 0, 10, 5)).toBe(0);
    expect(clampValue(15, 0, 10, 5)).toBe(10);
  });

  it('should handle invalid inputs', () => {
    expect(clampValue(NaN, 0, 10, 5)).toBe(5);
    expect(clampValue('invalid', 0, 10, 5)).toBe(5);
    expect(clampValue(undefined, 0, 10, 5)).toBe(5);
  });
});

describe('Number Input Validation', () => {
  it('should validate number inputs', () => {
    expect(validateNumberInput('5', { min: 0, max: 10 })).toBe(5);
    expect(validateNumberInput(5, { min: 0, max: 10 })).toBe(5);
  });

  it('should reject out-of-range values', () => {
    expect(validateNumberInput('15', { min: 0, max: 10 })).toBe(null);
    expect(validateNumberInput('-5', { min: 0, max: 10 })).toBe(null);
  });

  it('should handle decimals option', () => {
    expect(validateNumberInput('5.5', { min: 0, max: 10, allowDecimals: true })).toBe(5.5);
    // parseInt('5.5') yields 5 which is a valid integer
    expect(validateNumberInput('5.5', { min: 0, max: 10, allowDecimals: false })).toBe(5);
  });

  it('should use default value for invalid inputs', () => {
    expect(validateNumberInput('invalid', { min: 0, max: 10, defaultValue: 5 })).toBe(5);
    // Out-of-range with defaultValue returns the default
    expect(validateNumberInput('15', { min: 0, max: 10, defaultValue: 5 })).toBe(5);
    // Out-of-range without defaultValue returns null
    expect(validateNumberInput('15', { min: 0, max: 10 })).toBe(null);
  });
});
