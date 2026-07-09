/**
 * Futures basis / carry helpers (Thalex Basis + Roll PnL inspiration).
 *
 * For equities: F = S · e^{(r-q)T}, basis = F − S, ann. carry = (r − q).
 * For crypto (BTC): q ≈ −funding; we model perpetual premium as annualized carry.
 */

import type { VolSnapshot } from './types';

export interface BasisPoint {
  expiry: string;
  dte: number;
  T: number;
  /** Forward: market futures mark when available, else theo F = S e^{(r-q)T} */
  forward: number;
  /** F − S */
  basis: number;
  /** (F/S − 1) annualized */
  annCarry: number;
  /** ATM IV on the slice */
  atmIV: number;
  /** How forward was sourced */
  source: 'market' | 'theo';
  /** Futures instrument name when market */
  instrument?: string;
}

export interface BasisCurve {
  spot: number;
  r: number;
  q: number;
  points: BasisPoint[];
  /** True if any point used live futures marks */
  hasMarketMarks: boolean;
  /** Perp mark basis when present */
  perp?: { mark: number; basis: number; instrument: string };
}

/**
 * Match a futures mark to an option expiry: exact date, else closest DTE within maxGap days.
 */
function matchFuturesMark(
  expiry: string,
  dte: number,
  marks: NonNullable<VolSnapshot['futuresMarks']>,
  maxGapDays = 5,
): NonNullable<VolSnapshot['futuresMarks']>[number] | null {
  const dated = marks.filter(m => !m.isPerp && m.mark > 0);
  const exact = dated.find(m => m.expiry === expiry);
  if (exact) return exact;
  let best: (typeof dated)[number] | null = null;
  let bestGap = Infinity;
  for (const m of dated) {
    if (m.dte == null) continue;
    const gap = Math.abs(m.dte - dte);
    if (gap < bestGap && gap <= maxGapDays) {
      bestGap = gap;
      best = m;
    }
  }
  return best;
}

/**
 * Build forward / basis curve.
 * Prefers live Deribit (or other) futures marks when present on the snapshot.
 * Fallback theo: F = S e^{(r−q)T}.
 * Crypto with fundingAnn: q_eff = −fundingAnn → F ≈ S e^{(r+funding)T}.
 */
export function buildBasisCurve(
  snap: VolSnapshot,
  opts: { fundingAnn?: number | null } = {},
): BasisCurve {
  const S = snap.spot;
  const funding = opts.fundingAnn ?? snap.fundingAnn ?? null;
  const crypto = isCryptoSymbol(snap.symbol);
  const r = snap.riskFreeRate;
  const q = crypto && funding != null
    ? -funding // F = S e^{(r+funding)T}
    : snap.dividendYield;
  const marks = snap.futuresMarks ?? [];
  let hasMarketMarks = false;

  const points: BasisPoint[] = snap.expiries.map(sl => {
    const T = Math.max(1e-8, sl.dte / 365);
    const mkt = marks.length > 0 ? matchFuturesMark(sl.expiry, sl.dte, marks) : null;
    if (mkt) {
      hasMarketMarks = true;
      const forward = mkt.mark;
      const basis = forward - S;
      const annCarry = T > 0 ? (forward / S - 1) / T : 0;
      return {
        expiry: sl.expiry,
        dte: sl.dte,
        T,
        forward,
        basis,
        annCarry,
        atmIV: sl.atmIV,
        source: 'market' as const,
        instrument: mkt.instrument,
      };
    }
    const forward = S * Math.exp((r - q) * T);
    const basis = forward - S;
    const annCarry = T > 0 ? (forward / S - 1) / T : 0;
    return {
      expiry: sl.expiry,
      dte: sl.dte,
      T,
      forward,
      basis,
      annCarry,
      atmIV: sl.atmIV,
      source: 'theo' as const,
    };
  });

  // If no option-matched markets but we have dated futures, append pure futures points
  if (!hasMarketMarks && marks.some(m => !m.isPerp)) {
    for (const m of marks) {
      if (m.isPerp || m.dte == null || m.dte <= 0) continue;
      hasMarketMarks = true;
      const T = Math.max(1e-8, m.dte / 365);
      points.push({
        expiry: m.expiry ?? m.instrument,
        dte: m.dte,
        T,
        forward: m.mark,
        basis: m.mark - S,
        annCarry: (m.mark / S - 1) / T,
        atmIV: 0,
        source: 'market',
        instrument: m.instrument,
      });
    }
    points.sort((a, b) => a.dte - b.dte);
  }

  const perpRow = marks.find(m => m.isPerp && m.mark > 0);
  const perp = perpRow
    ? { mark: perpRow.mark, basis: perpRow.mark - S, instrument: perpRow.instrument }
    : undefined;

  return { spot: S, r, q, points, hasMarketMarks, perp };
}

/**
 * Roll / funding PnL heatmap: carry × index path scenarios.
 * For each (spot shock, horizon days) estimate cumulative carry PnL on 1 unit notional.
 */
export function rollPnlHeatmap(
  snap: VolSnapshot,
  opts: {
    spotShocks?: number[];
    horizonsDays?: number[];
    /** Annualized funding/carry override (crypto perpetual). Default: r − q */
    fundingAnn?: number;
  } = {},
): { shocks: number[]; horizons: number[]; pnl: number[][] } {
  const shocks = opts.spotShocks ?? [-0.1, -0.05, -0.02, 0, 0.02, 0.05, 0.1];
  const horizons = opts.horizonsDays ?? [1, 7, 14, 30, 60, 90];
  const carry = opts.fundingAnn ?? (snap.riskFreeRate - snap.dividendYield);
  const S = snap.spot;

  const pnl: number[][] = shocks.map(sh =>
    horizons.map(d => {
      // Carry on notional that scales with shocked spot
      const notional = S * (1 + sh);
      return notional * carry * (d / 365);
    }),
  );
  return { shocks, horizons, pnl };
}

/**
 * Flat series at the live annualized funding print (Deribit funding_8h × 3 × 365).
 * No random walk / mock path — empty when funding is unavailable.
 */
export function liveFundingSeries(
  days = 30,
  fundingAnn: number | null | undefined,
): { t: number; fundingAnn: number; cumPnl: number }[] {
  if (fundingAnn == null || !isFinite(fundingAnn)) return [];
  const out: { t: number; fundingAnn: number; cumPnl: number }[] = [];
  let cum = 0;
  for (let d = 0; d <= days; d++) {
    cum += fundingAnn / 365;
    out.push({ t: d, fundingAnn, cumPnl: cum });
  }
  return out;
}

/**
 * @deprecated Offline/demo visual only — do not use under LIVE tools.
 * Prefer liveFundingSeries(days, realFundingAnn).
 */
export function syntheticFundingSeries(
  days = 30,
  meanAnn = 0.10,
  seed = 11,
): { t: number; fundingAnn: number; cumPnl: number }[] {
  // Keep deterministic generator for unit tests / explicit DEMO only.
  let s = seed >>> 0;
  const rand = () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out: { t: number; fundingAnn: number; cumPnl: number }[] = [];
  let f = meanAnn;
  let cum = 0;
  for (let d = 0; d <= days; d++) {
    f = f + 0.35 * (meanAnn - f) + (rand() - 0.5) * 0.08;
    cum += f / 365;
    out.push({ t: d, fundingAnn: f, cumPnl: cum });
  }
  return out;
}

/** Is this a crypto / BTC-style symbol? */
export function isCryptoSymbol(symbol: string): boolean {
  const s = symbol.toUpperCase();
  return s === 'BTC' || s === 'BTCUSD' || s === 'BTC-USD' || s === 'ETH' || s === 'ETHUSD' || s === 'ETH-USD'
    || s === 'IBIT' || s === 'BITO' || s === 'MSTR' || s === 'COIN' || s === 'GBTC';
}

/** Map UI symbol to yfinance / FMP fetch symbols. */
export function resolveCryptoUnderlyings(symbol: string): {
  spotSymbol: string;
  chainSymbol: string;
  label: string;
} {
  const s = symbol.toUpperCase().replace('/', '');
  if (s === 'BTC' || s === 'BTCUSD' || s === 'BTC-USD') {
    return { spotSymbol: 'BTC-USD', chainSymbol: 'IBIT', label: 'BTC' };
  }
  if (s === 'ETH' || s === 'ETHUSD' || s === 'ETH-USD') {
    return { spotSymbol: 'ETH-USD', chainSymbol: 'ETHA', label: 'ETH' };
  }
  return { spotSymbol: s, chainSymbol: s, label: s };
}
