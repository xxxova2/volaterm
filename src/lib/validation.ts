/**
 * Input validation utilities
 * Provides validation functions for user inputs and API parameters
 */

import { VALIDATION_CONFIG } from '../config/constants';

/**
 * Validates a stock symbol according to standard market conventions
 * @param symbol - The symbol to validate
 * @returns true if valid, false otherwise
 */
export function isValidSymbol(symbol: string): boolean {
  if (!symbol || typeof symbol !== 'string') {
    return false;
  }

  const trimmed = symbol.trim().toUpperCase();
  const { MIN_LENGTH, MAX_LENGTH, PATTERN } = VALIDATION_CONFIG.symbol;

  return (
    trimmed.length >= MIN_LENGTH &&
    trimmed.length <= MAX_LENGTH &&
    PATTERN.test(trimmed)
  );
}

/**
 * Sanitizes a stock symbol by trimming and converting to uppercase
 * @param symbol - The symbol to sanitize
 * @returns The sanitized symbol or null if invalid
 */
export function sanitizeSymbol(symbol: string): string | null {
  if (!symbol || typeof symbol !== 'string') {
    return null;
  }

  const trimmed = symbol.trim().toUpperCase();
  return isValidSymbol(trimmed) ? trimmed : null;
}

/**
 * Validates that a number is within a specified range
 * @param value - The value to validate
 * @param min - Minimum allowed value (inclusive)
 * @param max - Maximum allowed value (inclusive)
 * @returns true if valid, false otherwise
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return typeof value === 'number' && !isNaN(value) && value >= min && value <= max;
}

/**
 * Validates implied volatility value
 * @param iv - The IV value to validate
 * @returns true if valid, false otherwise
 */
export function isValidIV(iv: number): boolean {
  const { MIN_IV, MAX_IV } = VALIDATION_CONFIG.ranges;
  return isInRange(iv, MIN_IV, MAX_IV);
}

/**
 * Validates spot price
 * @param spot - The spot price to validate
 * @returns true if valid, false otherwise
 */
export function isValidSpot(spot: number): boolean {
  return isInRange(spot, VALIDATION_CONFIG.ranges.MIN_SPOT, Infinity);
}

/**
 * Validates days to expiration
 * @param dte - The DTE value to validate
 * @returns true if valid, false otherwise
 */
export function isValidDTE(dte: number): boolean {
  return isInRange(dte, VALIDATION_CONFIG.ranges.MIN_DTE, Infinity);
}

/**
 * Validates option quote data
 * @param quote - The option quote to validate
 * @returns true if valid, false otherwise
 */
export function isValidOptionQuote(quote: {
  strike: number;
  bid: number;
  ask: number;
  iv?: number | null;
}): boolean {
  if (!isValidSpot(quote.strike)) return false;
  if (quote.bid < 0 || quote.ask < 0) return false;
  if (quote.ask < quote.bid) return false;
  if (quote.iv != null && !isValidIV(quote.iv)) return false;
  return true;
}

/**
 * Validates a numeric input and clamps it to a range
 * @param value - The value to validate and clamp
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @param defaultValue - Default value if input is invalid
 * @returns The clamped value or default
 */
export function clampValue(
  value: number | string | undefined,
  min: number,
  max: number,
  defaultValue: number
): number {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (typeof num !== 'number' || isNaN(num)) {
    return defaultValue;
  }
  return Math.max(min, Math.min(max, num));
}

/**
 * Validates and formats a user-provided number
 * @param input - The user input to validate
 * @param options - Validation options
 * @returns The validated number or null if invalid
 */
export function validateNumberInput(
  input: string | number | undefined,
  options: {
    min?: number;
    max?: number;
    defaultValue?: number;
    allowDecimals?: boolean;
  } = {}
): number | null {
  const {
    min = -Infinity,
    max = Infinity,
    defaultValue,
    allowDecimals = true,
  } = options;

  let num: number;
  
  if (typeof input === 'number') {
    num = input;
  } else if (typeof input === 'string') {
    num = allowDecimals ? parseFloat(input) : parseInt(input, 10);
  } else {
    return defaultValue ?? null;
  }

  if (isNaN(num)) {
    return defaultValue ?? null;
  }

  if (!allowDecimals && !Number.isInteger(num)) {
    return defaultValue ?? null;
  }

  if (num < min || num > max) {
    return defaultValue ?? null;
  }

  return num;
}
