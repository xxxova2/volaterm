/**
 * Classify money-market plumbing regime from public prints (Conks / OnlySOFRs lens).
 * Educational — not G-SIB scores or proprietary haircuts.
 */

export type PlumbingRegimeId =
  | 'excess_cash'
  | 'corridor_normal'
  | 'dealer_stress'
  | 'excess_collateral'
  | 'unknown';

export type PlumbingRegime = {
  id: PlumbingRegimeId;
  label: string;
  short: string;
  tone: 'up' | 'down' | 'warn' | 'neutral';
  note: string;
};

export type PlumbingPrints = {
  sofr: number | null;
  effr: number | null;
  iorb: number | null;
  rrpRate: number | null;
  /** RRP facility volume in $B */
  rrpVolumeBn: number | null;
  /** Latest reserve balances $B if known */
  reservesBn: number | null;
};

/** SOFR − EFFR in basis points. */
export function sofrEffrBps(sofr: number | null, effr: number | null): number | null {
  if (sofr == null || effr == null || !Number.isFinite(sofr) || !Number.isFinite(effr)) {
    return null;
  }
  return (sofr - effr) * 100;
}

/**
 * Regime heuristics (public data only):
 * - RRP volume high → excess cash parked at Fed (floor binding more)
 * - RRP near zero + SOFR−EFFR elevated → private repo sets the market / dealer capacity
 * - SOFR−EFFR moderate → corridor normal
 */
export function classifyPlumbingRegime(p: PlumbingPrints): PlumbingRegime {
  const se = sofrEffrBps(p.sofr, p.effr);
  const rrp = p.rrpVolumeBn;

  if (se == null && rrp == null) {
    return {
      id: 'unknown',
      label: 'Plumbing n/a',
      short: '—',
      tone: 'neutral',
      note: 'Need SOFR/EFFR and/or RRP volume from FRED/NY Fed.',
    };
  }

  // Elevated RRP = cash still parking at Fed (excess reserves / scarce private assets)
  if (rrp != null && rrp >= 200) {
    return {
      id: 'excess_cash',
      label: 'Excess cash (RRP elevated)',
      short: 'RRP↑',
      tone: 'up',
      note: 'Large RRP balance → cash parked at Fed floor; private repo less stressed. Hierarchy: RRP floor · private repo · SRF ceiling.',
    };
  }

  if (rrp != null && rrp < 50 && se != null && se > 5) {
    return {
      id: 'excess_collateral',
      label: 'RRP drained · dealer capacity',
      short: 'RRP↓',
      tone: 'warn',
      note: 'RRP near empty and SOFR>EFFR — private repo / dealer balance sheet sets the overnight market. Watch SRF as ceiling.',
    };
  }

  if (se != null && se > 8) {
    return {
      id: 'dealer_stress',
      label: 'SOFR ≫ EFFR stress',
      short: 'SE↑',
      tone: 'down',
      note: 'Wide SOFR−EFFR can mark secured funding tightness relative to unsecured EFFR (regulatory arb / dealer capacity).',
    };
  }

  if (rrp != null && rrp < 50) {
    return {
      id: 'excess_collateral',
      label: 'RRP drained',
      short: 'RRP~0',
      tone: 'warn',
      note: 'RRP low — excess cash era fading; private rates and collateral scarcity matter more.',
    };
  }

  return {
    id: 'corridor_normal',
    label: 'Corridor normal',
    short: 'OK',
    tone: 'neutral',
    note: 'SOFR/EFFR near corridor; RRP moderate. Hierarchy RRP floor → private repo → Wall St repo → SRF still applies.',
  };
}
