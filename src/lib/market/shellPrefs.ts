/** Shell UI prefs (localStorage). Quote strip defaults OFF (max function area). */

const QUOTE_STRIP_KEY = 'ui.shell.quoteStrip';
/** Display/expiry bottom strip — collapsed by default (BBG classic = max function area). */
const DISPLAY_STRIP_KEY = 'ui.shell.displayStrip';

/** Off unless explicitly set to '1'. Missing key → off (WL lives under Home · Feeds). */
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

/** Off unless explicitly set to '1'. Missing key → collapsed. */
export function isDisplayStripEnabled(): boolean {
  try {
    return localStorage.getItem(DISPLAY_STRIP_KEY) === '1';
  } catch {
    return false;
  }
}

export function setDisplayStripEnabled(on: boolean): void {
  try {
    localStorage.setItem(DISPLAY_STRIP_KEY, on ? '1' : '0');
  } catch {
    /* ignore */
  }
}
