import { afterEach, describe, expect, it } from 'vitest';
import { isQuoteStripEnabled, setQuoteStripEnabled } from './shellPrefs';

const KEY = 'ui.shell.quoteStrip';

describe('shellPrefs', () => {
  afterEach(() => {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  });

  it('defaults quote strip on when key missing (terminal tape)', () => {
    localStorage.removeItem(KEY);
    expect(isQuoteStripEnabled()).toBe(true);
  });

  it('honors explicit off', () => {
    setQuoteStripEnabled(false);
    expect(localStorage.getItem(KEY)).toBe('0');
    expect(isQuoteStripEnabled()).toBe(false);
  });

  it('honors explicit on', () => {
    setQuoteStripEnabled(true);
    expect(localStorage.getItem(KEY)).toBe('1');
    expect(isQuoteStripEnabled()).toBe(true);
  });
});
