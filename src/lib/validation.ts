/**
 * Input validation utilities
 * Provides validation functions for user inputs and API parameters
 */

import { VALIDATION_CONFIG } from '../config/constants';

/**
 * Validates a stock symbol according to standard market conventions.
 * Private helper retained for {@link sanitizeSymbol}.
 */
function isValidSymbol(symbol: string): boolean {
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
