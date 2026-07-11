/** Shell UI prefs (localStorage). Quote strip defaults ON (terminal tape). */

const QUOTE_STRIP_KEY = 'ui.shell.quoteStrip';

/** On unless explicitly set to '0'. Missing key → on. */
export function isQuoteStripEnabled(): boolean {
  try {
    const v = localStorage.getItem(QUOTE_STRIP_KEY);
    if (v === null) return true;
    return v === '1';
  } catch {
    return true;
  }
}

export function setQuoteStripEnabled(on: boolean): void {
  try {
    localStorage.setItem(QUOTE_STRIP_KEY, on ? '1' : '0');
  } catch {
    /* ignore */
  }
}
