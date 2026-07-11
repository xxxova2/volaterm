/** Shell UI prefs (localStorage). Fail-open to classic/off. */

const QUOTE_STRIP_KEY = 'ui.shell.quoteStrip';

export function isQuoteStripEnabled(): boolean {
  try {
    return localStorage.getItem(QUOTE_STRIP_KEY) === '1';
  } catch {
    return false;
  }
}

export function setQuoteStripEnabled(on: boolean): void {
  try {
    localStorage.setItem(QUOTE_STRIP_KEY, on ? '1' : '0');
  } catch {
    /* ignore */
  }
}
