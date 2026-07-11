import { afterEach, describe, expect, it } from 'vitest';
import {
  isDisplayStripEnabled,
  isQuoteStripEnabled,
  setDisplayStripEnabled,
  setQuoteStripEnabled,
} from './shellPrefs';

const KEY = 'ui.shell.quoteStrip';
const DISPLAY_KEY = 'ui.shell.displayStrip';

describe('shellPrefs', () => {
  afterEach(() => {
    try {
      localStorage.removeItem(KEY);
      localStorage.removeItem(DISPLAY_KEY);
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

  it('defaults display strip collapsed (max function area)', () => {
    localStorage.removeItem(DISPLAY_KEY);
    expect(isDisplayStripEnabled()).toBe(false);
  });

  it('honors display strip on', () => {
    setDisplayStripEnabled(true);
    expect(isDisplayStripEnabled()).toBe(true);
  });
});
