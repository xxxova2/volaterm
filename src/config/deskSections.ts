import type { ActiveTab } from '../lib/options/types';

export type DeskNavItem = {
  id: string;
  label: string;
  short?: string;
  /** Upstream APIs for context line */
  apis?: string[];
};

/**
 * Macros & Rates section anchors (must match element ids).
 *
 * Option A — relevance-first (USD regime → US rates → G10 → FX → Japan → risk):
 *  1. US Macro — reserve currency sets the regime
 *  2. Money markets — SOFR/EFFR/IORB/OBFR primary prints
 *  3. ON basis history — visual for the same spreads
 *  4. Fed plumbing — RRP / reserves
 *  5. UST data then curves — discounting curve
 *  6. STIR / NY Fed — path + official prints
 *  7. Global 10Y → FX → Japan — DM relevance then carry special
 *  8. Premium / corr — risk book last
 */
/**
 * Rates red-bar = 4 modes only (not 17 section chips).
 * Deep-link ids (sec-stir, sec-mm-strip, …) still map to modes in RatesView.
 */
export const RATES_SECTIONS: DeskNavItem[] = [
  { id: 'rates-mode-funding', label: 'Funding', short: 'Fund', apis: ['FRED', 'NYFed', 'MacroVol'] },
  { id: 'rates-mode-ust', label: 'UST', short: 'UST', apis: ['FRED', 'FiscalData'] },
  { id: 'rates-mode-stir', label: 'STIR', short: 'STIR', apis: ['yfinance', 'NYFed', 'FRED'] },
  { id: 'rates-mode-world', label: 'World', short: 'World', apis: ['FRED', 'Frankfurter', 'MoF'] },
];

/** Legacy section id → rates mode (function codes / scroll targets). */
export const RATES_SECTION_TO_MODE: Record<string, 'funding' | 'ust' | 'stir' | 'world'> = {
  'rates-mode-funding': 'funding',
  'rates-mode-ust': 'ust',
  'rates-mode-stir': 'stir',
  'rates-mode-world': 'world',
  'sec-macro': 'funding',
  'sec-mm-strip': 'funding',
  'sec-basis': 'funding',
  'sec-cash-futures': 'funding',
  'sec-plumbing': 'funding',
  'sec-snapshot': 'funding',
  'sec-ust-data': 'ust',
  'sec-curves': 'ust',
  'sec-shape': 'ust',
  'sec-auctions': 'ust',
  'sec-stir': 'stir',
  'sec-nyfed': 'stir',
  'sec-global': 'world',
  'sec-fx': 'world',
  'sec-japan': 'world',
  'sec-premium': 'world',
  'sec-corr': 'world',
  'sec-asset-corr': 'world',
};

export const VOL_SECTIONS: DeskNavItem[] = [
  { id: 'vol-sub-surface', label: 'Surface', short: 'Surf' },
  { id: 'vol-sub-smile', label: 'Smile', short: 'Smile' },
  { id: 'vol-sub-term', label: 'Term', short: 'Term' },
  { id: 'vol-sub-greeks', label: 'Greeks', short: 'GRK' },
  { id: 'vol-sub-quality', label: 'Surface Fit', short: 'Fit' },
];

/**
 * Trade desk sections — Thalex-class lab tools + Analyze (Greeks 1.0).
 * Ids match DeskView tool chrome (`desk-ws-*`).
 */
export const TRADE_SECTIONS: DeskNavItem[] = [
  { id: 'desk-ws-sim', label: 'Simulator', short: 'SIM', apis: ['yfinance', 'Deribit'] },
  { id: 'desk-ws-combo', label: 'Combo Greeks', short: 'COMBO', apis: ['yfinance', 'Deribit'] },
  { id: 'desk-ws-grid', label: 'Option Grid', short: 'GRID', apis: ['yfinance', 'Deribit'] },
  { id: 'desk-ws-combopnl', label: 'Combo PnL', short: 'CPNL', apis: ['yfinance', 'FMP'] },
  { id: 'desk-ws-optionpnl', label: 'Option PnL', short: 'OPNL', apis: ['yfinance', 'FMP'] },
  { id: 'desk-ws-straddle', label: 'Straddle', short: 'STRD', apis: ['yfinance'] },
  { id: 'desk-ws-breakeven', label: 'Break-even', short: 'BE', apis: ['yfinance'] },
  { id: 'desk-ws-subjective', label: 'Subjective', short: 'SUBJ', apis: ['yfinance'] },
  { id: 'desk-ws-hedge', label: 'Hedging', short: 'HDG', apis: ['yfinance'] },
  { id: 'desk-ws-dfollow', label: 'Δ Follower', short: 'DFOL', apis: ['yfinance'] },
  { id: 'desk-ws-basis', label: 'Basis', short: 'BAS', apis: ['yfinance', 'Deribit'] },
  { id: 'desk-ws-roll', label: 'Roll PnL', short: 'ROLL', apis: ['yfinance', 'Deribit'] },
  { id: 'desk-ws-analyze', label: 'Analyze', short: 'GRK', apis: ['MacroVol', 'yfinance'] },
];

/** @deprecated Legacy id map — prefer TRADE_SECTIONS / desk-ws-analyze */
export const GREEKS_SECTIONS: DeskNavItem[] = [
  { id: 'desk-ws-analyze', label: 'Analyze', short: 'GRK', apis: ['MacroVol', 'yfinance'] },
];

/** Flow: Book = chain+dealer split; Tools = levels+edge+strategy stacked. */
export const POSITIONING_SECTIONS: DeskNavItem[] = [
  { id: 'pos-sub-chain', label: 'Book', short: 'Book' },
  { id: 'pos-sub-tools', label: 'Tools', short: 'Tools' },
];

/**
 * Crypto desk — Thalex lab order (https://thalextech.github.io/).
 * Lab = tool card grid; Market = dual BTC/ETH tape; tools embed the real
 * Thalex second-screen apps (source: thalextech/thalextech.github.io).
 * Trade desk keeps VOLATERM-native BS tools (not Thalex embeds).
 */
export const CRYPTO_SECTIONS: DeskNavItem[] = [
  { id: 'crypto-sub-lab', label: 'Lab', short: 'Lab', apis: ['Thalex'] },
  { id: 'crypto-sub-market', label: 'Market', short: 'Mkt', apis: ['Deribit', 'CoinGecko'] },
  // Thalex homepage order → embeds https://thalextech.github.io/<slug>/
  { id: 'desk-ws-sim', label: 'Simulator', short: 'Sim', apis: ['Thalex'] },
  { id: 'desk-ws-combopnl', label: 'Combo PnL', short: 'CPnL', apis: ['Thalex'] },
  { id: 'desk-ws-straddle', label: 'Straddle', short: 'Strd', apis: ['Thalex'] },
  { id: 'desk-ws-combo', label: 'Combo Greeks', short: 'CGk', apis: ['Thalex'] },
  { id: 'desk-ws-analyze', label: 'Greeks', short: 'Gk', apis: ['Thalex'] },
  { id: 'desk-ws-optionpnl', label: 'Option PnL', short: 'OPnL', apis: ['Thalex'] },
  { id: 'desk-ws-breakeven', label: 'Break Even', short: 'BE', apis: ['Thalex'] },
  { id: 'desk-ws-roll', label: 'Roll PnL', short: 'Roll', apis: ['Thalex'] },
  { id: 'desk-ws-basis', label: 'Basis', short: 'Bas', apis: ['Thalex'] },
  { id: 'desk-ws-subjective', label: 'Subjective', short: 'Subj', apis: ['Thalex'] },
  { id: 'desk-ws-backtest', label: 'Backtest', short: 'Bkt', apis: ['Thalex'] },
  { id: 'desk-ws-dfollow', label: 'Δ Follower', short: 'DFol', apis: ['Thalex'] },
  { id: 'desk-ws-hedge', label: 'Hedging', short: 'Hdg', apis: ['Thalex'] },
  { id: 'desk-ws-grid', label: 'Option Grid', short: 'Grid', apis: ['Thalex'] },
];

/**
 * Path segment on https://thalextech.github.io/<slug>/ (deployed second-screen apps).
 * Source: github.com/thalextech/thalextech.github.io/apps/*
 */
export const THALEX_APP_SLUG: Record<string, string> = {
  'desk-ws-sim': 'simulator',
  'desk-ws-combopnl': 'combo-pnl',
  'desk-ws-straddle': 'straddle',
  'desk-ws-combo': 'combo-greeks',
  'desk-ws-analyze': 'greeks',
  'desk-ws-optionpnl': 'option-pnl',
  'desk-ws-breakeven': 'break-even',
  'desk-ws-roll': 'roll-pnl',
  'desk-ws-basis': 'futures-basis',
  'desk-ws-subjective': 'subjective',
  'desk-ws-backtest': 'backtest',
  'desk-ws-dfollow': 'dfollow',
  'desk-ws-hedge': 'hedging',
  'desk-ws-grid': 'grid',
};

export function thalexAppUrl(sectionOrToolId: string): string | null {
  const slug = THALEX_APP_SLUG[sectionOrToolId];
  if (!slug) return null;
  return `https://thalextech.github.io/${slug}/`;
}

/** Thalex tool catalog for Lab home grid (blurbs match thalextech.github.io index.yml). */
export const THALEX_LAB_TOOLS: {
  id: string;
  label: string;
  blurb: string;
  /** Preview on Thalex public lab */
  preview: string;
}[] = [
  {
    id: 'desk-ws-sim',
    label: 'Simulator',
    blurb: 'Simulate price paths for a multi-leg combination with configurable drift, volatility, and horizon.',
    preview: 'https://thalextech.github.io/images/simulator.png',
  },
  {
    id: 'desk-ws-combopnl',
    label: 'Combo PnL',
    blurb: 'Replay the historical P&L of a multi-leg option position and decompose it by greeks.',
    preview: 'https://thalextech.github.io/images/combo-pnl.png',
  },
  {
    id: 'desk-ws-straddle',
    label: 'Straddle',
    blurb: 'Switch between break-even and historical PnL of the straddle for a chosen maturity.',
    preview: 'https://thalextech.github.io/images/straddle.png',
  },
  {
    id: 'desk-ws-combo',
    label: 'Combo Greeks',
    blurb: 'Visualize greeks of multi-leg option positions as a function of index and time-to-maturity.',
    preview: 'https://thalextech.github.io/images/combo-greeks.png',
  },
  {
    id: 'desk-ws-analyze',
    label: 'Greeks',
    blurb: 'Visualize delta, gamma, theta, vega, and vanna across one or more maturities.',
    preview: 'https://thalextech.github.io/images/greeks.png',
  },
  {
    id: 'desk-ws-optionpnl',
    label: 'Option PnL',
    blurb: 'Select a single option and analyze its historical mark PnL between two points in time.',
    preview: 'https://thalextech.github.io/images/option-pnl.png',
  },
  {
    id: 'desk-ws-breakeven',
    label: 'Break Even',
    blurb: 'Explore option break-even prices and N(d2) for a selected maturity.',
    preview: 'https://thalextech.github.io/images/break-even.png',
  },
  {
    id: 'desk-ws-roll',
    label: 'Roll PnL',
    blurb: 'Heatmap of funding/basis against index. Evaluate carry P&L between two points in time.',
    preview: 'https://thalextech.github.io/images/roll-pnl.png',
  },
  {
    id: 'desk-ws-basis',
    label: 'Basis',
    blurb: 'Compare futures basis against index and annualized carry over time.',
    preview: 'https://thalextech.github.io/images/basis.png',
  },
  {
    id: 'desk-ws-subjective',
    label: 'Subjective Valuation',
    blurb: 'Price options against your own drift and variance-risk-premium assumptions and compare to the market.',
    preview: 'https://thalextech.github.io/images/subjective.png',
  },
  {
    id: 'desk-ws-backtest',
    label: 'Backtest',
    blurb: 'Run the weekly BTC short straddle delta-hedged backtest from local Thalex parquet history.',
    preview: 'https://thalextech.github.io/images/straddle.png',
  },
  {
    id: 'desk-ws-dfollow',
    label: 'Delta Follower',
    blurb: 'Simulate a dfollow bot that tracks an option delta with a future or option hedge instrument.',
    preview: 'https://thalextech.github.io/images/delta-follower.png',
  },
  {
    id: 'desk-ws-hedge',
    label: 'Hedging',
    blurb: 'Simulate threshold, tolerance, and period based delta hedging for a selected option.',
    preview: 'https://thalextech.github.io/images/hedging.png',
  },
  {
    id: 'desk-ws-grid',
    label: 'Option Grid',
    blurb: 'Grid showing leverage (omega) and N(d2)^-1 by strike and expiry.',
    preview: 'https://thalextech.github.io/images/grid.png',
  },
];

const TAB_LABELS: Record<string, string> = {
  vol: 'Vol',
  positioning: 'Flow',
  greeks: 'Trade · Analyze', // legacy deep-links
  desk: 'Trade',
  crypto: 'Crypto',
  rates: 'Rates',
};

export { TAB_LABELS };

export function tabLabel(tab: ActiveTab | string): string {
  return TAB_LABELS[tab] ?? String(tab);
}

export function sectionsForTab(tab: ActiveTab | string): DeskNavItem[] {
  switch (tab) {
    case 'rates':
      return RATES_SECTIONS;
    case 'vol':
      return VOL_SECTIONS;
    case 'desk':
    case 'greeks': // legacy → Trade
      return TRADE_SECTIONS;
    case 'positioning':
      return POSITIONING_SECTIONS;
    case 'crypto':
      return CRYPTO_SECTIONS;
    default:
      return [];
  }
}

export function findSectionMeta(id: string, tab: ActiveTab | string): DeskNavItem | undefined {
  return sectionsForTab(tab).find((s) => s.id === id);
}
