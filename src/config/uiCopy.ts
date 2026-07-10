/**
 * LIVE-only empty / loading copy catalog.
 * Named work strings — never silent zeros, never demo CTAs.
 */
export const UI_COPY = {
  load: {
    chain: 'Building chain surface…',
    surface: 'Fitting surface…',
    rates: 'Loading rates… FRED · NYFed · MacroVol',
    crypto: 'Loading crypto books… Deribit',
    view: 'Loading view…',
  },
  empty: {
    chain: 'No live surface — awaiting yfinance/FMP/Deribit chain',
    macro: 'MacroVol unreachable (:8765)',
    demo: 'Synthetic fallback — not market prices. Refresh LIVE feeds.',
    apiDown: 'Service unreachable. Start MacroVol (:8765) or check network / keys.',
  },
} as const;

export type UiCopy = typeof UI_COPY;
