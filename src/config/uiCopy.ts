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
    greeks: 'Loading Greeks 1.0…',
  },
  empty: {
    chain:
      'No live option chain loaded. Equities use yfinance (delayed CBOE/OPRA via Yahoo) or FMP if keyed; BTC/ETH use Deribit. Fail-closed — no synthetic chain.',
    macro: 'MacroVol unreachable (:8765)',
    demo: 'Synthetic fallback — not market prices. Refresh LIVE feeds.',
    apiDown: 'Service unreachable. Start MacroVol (:8765) or check network / keys.',
  },
} as const;

export type UiCopy = typeof UI_COPY;
