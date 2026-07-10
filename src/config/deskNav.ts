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
export const RATES_SECTIONS: DeskNavItem[] = [
  { id: 'sec-macro', label: 'US Macro', short: 'Macro', apis: ['FRED'] },
  { id: 'sec-mm-strip', label: 'Money Mkts', short: 'MM', apis: ['FRED', 'NYFed'] },
  { id: 'sec-basis', label: 'ON Basis', short: 'Basis', apis: ['FRED', 'MacroVol'] },
  { id: 'sec-plumbing', label: 'Plumbing', short: 'Plumb', apis: ['FRED'] },
  { id: 'sec-ust-data', label: 'UST Yields', short: 'UST', apis: ['FRED'] },
  { id: 'sec-curves', label: 'Curve Charts', short: 'Charts', apis: ['FRED', 'yfinance', 'MacroVol', 'FiscalData'] },
  { id: 'sec-auctions', label: 'Auctions', short: 'Auct', apis: ['FiscalData'] },
  { id: 'sec-shape', label: 'Shape', short: 'Shape', apis: ['FRED'] },
  { id: 'sec-stir', label: 'STIR', short: 'STIR', apis: ['yfinance', 'NYFed', 'FRED'] },
  { id: 'sec-nyfed', label: 'NY Fed', short: 'NYFed', apis: ['NYFed'] },
  { id: 'sec-snapshot', label: 'Snapshot', short: 'Snap', apis: ['FRED'] },
  { id: 'sec-premium', label: 'Premium', short: 'Prem', apis: ['FRED', 'MacroVol'] },
  { id: 'sec-corr', label: 'Rates Corr', short: 'RCorr', apis: ['yfinance'] },
  { id: 'sec-global', label: 'Global 10Y', short: 'Glbl', apis: ['FRED'] },
  { id: 'sec-fx', label: 'FX', short: 'FX', apis: ['Frankfurter', 'ECB'] },
  { id: 'sec-japan', label: 'Japan', short: 'JGB', apis: ['MoF', 'FRED'] },
  { id: 'sec-asset-corr', label: 'Asset Corr', short: 'ACorr', apis: ['yfinance'] },
];

export const VOL_SECTIONS: DeskNavItem[] = [
  { id: 'vol-sub-surface', label: 'Surface', short: 'Surf' },
  { id: 'vol-sub-smile', label: 'Smile', short: 'Smile' },
  { id: 'vol-sub-term', label: 'Term', short: 'Term' },
  { id: 'vol-sub-quality', label: 'Surface Fit', short: 'Fit' },
];

/** Terminal chain Greeks (heatmap/profile/3D) share OTM + per-day charm units with MacroVol Greeks 1.0. */
export const GREEKS_SECTIONS: DeskNavItem[] = [
  { id: 'greeks-sub-heatmap', label: 'Heatmap', short: 'Heat' },
  { id: 'greeks-sub-profile', label: 'Profile', short: 'Prof' },
  { id: 'greeks-sub-sensitivity', label: 'Sensitivity', short: 'Sens' },
  { id: 'greeks-sub-byexpiry', label: 'By Expiry', short: 'Exp' },
  { id: 'greeks-sub-surface3d', label: '3D Surface', short: '3D' },
];

export const POSITIONING_SECTIONS: DeskNavItem[] = [
  { id: 'pos-sub-chain', label: 'Chain', short: 'Chain' },
  { id: 'pos-sub-dealer', label: 'Dealer', short: 'Deal' },
  { id: 'pos-sub-levels', label: 'Levels', short: 'Lvl' },
  { id: 'pos-sub-edge', label: 'Parity Edge', short: 'Edge' },
  { id: 'pos-sub-strategy', label: 'Strategy', short: 'Strat' },
];

const TAB_LABELS: Record<string, string> = {
  home: 'Home',
  vol: 'Vol Structure',
  positioning: 'Positioning',
  greeks: 'Greeks',
  desk: 'MM Desk',
  crypto: 'Crypto',
  rates: 'Macros & Rates',
};

export function tabLabel(tab: ActiveTab | string): string {
  return TAB_LABELS[tab] ?? String(tab);
}

export function sectionsForTab(tab: ActiveTab | string): DeskNavItem[] {
  switch (tab) {
    case 'rates':
      return RATES_SECTIONS;
    case 'vol':
      return VOL_SECTIONS;
    case 'greeks':
      return GREEKS_SECTIONS;
    case 'positioning':
      return POSITIONING_SECTIONS;
    default:
      return [];
  }
}

/** Sections currently mounted in the DOM (ids present). */
export function presentSectionIds(tab: ActiveTab | string): string[] {
  return sectionsForTab(tab)
    .map((s) => s.id)
    .filter((id) => !!document.getElementById(id));
}

export function findSectionMeta(id: string, tab: ActiveTab | string): DeskNavItem | undefined {
  return sectionsForTab(tab).find((s) => s.id === id);
}

/**
 * Scroll to previous/next desk section. Returns the section id jumped to, or null.
 */
export function jumpDeskSection(tab: ActiveTab | string, direction: 1 | -1): string | null {
  const ids = presentSectionIds(tab);
  if (!ids.length) {
    // Fallback: any data-desk-section or id^=sec-
    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>('[data-desk-section], [id^="sec-"]'),
    );
    const fallback = nodes.map((n) => n.id).filter(Boolean);
    if (!fallback.length) return null;
    return jumpIds(fallback, direction);
  }
  return jumpIds(ids, direction);
}

function jumpIds(ids: string[], direction: 1 | -1): string | null {
  if (!ids.length) return null;
  const active =
    document.querySelector<HTMLElement>('[data-desk-section-active="1"]')?.id
    ?? useRoughActive(ids);
  let idx = active ? ids.indexOf(active) : 0;
  if (idx < 0) idx = 0;
  const next = ids[(idx + direction + ids.length) % ids.length]!;
  const el = document.getElementById(next);
  if (!el) return null;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  // Fire click on sub-mode buttons if present
  if (next.startsWith('vol-sub-') || next.startsWith('greeks-sub-') || next.startsWith('pos-sub-')) {
    el.click();
  }
  return next;
}

function useRoughActive(ids: string[]): string | null {
  // Prefer section nearest top of viewport
  let best: string | null = null;
  let bestDist = Infinity;
  for (const id of ids) {
    const el = document.getElementById(id);
    if (!el) continue;
    const top = el.getBoundingClientRect().top;
    const dist = Math.abs(top - 100);
    if (dist < bestDist) {
      bestDist = dist;
      best = id;
    }
  }
  return best;
}
