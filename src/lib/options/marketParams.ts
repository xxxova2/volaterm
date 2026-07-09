/**
 * Market parameters used by the IV / Greeks pipeline:
 *  - term-matched risk-free rate from the treasury curve
 *  - dividend yield estimation from profile / defaults
 */

import type { FmpTreasuryRate, FmpProfile } from '../data/types';
import { DATA_CONFIG } from '../../config/constants';

/** Anchor points (years) matching FMP treasury-rates fields. */
const TENOR_YEARS: { key: keyof FmpTreasuryRate; years: number }[] = [
  { key: 'year1', years: 1 },
  { key: 'year2', years: 2 },
  { key: 'year3', years: 3 },
  { key: 'year5', years: 5 },
  { key: 'year7', years: 7 },
  { key: 'year10', years: 10 },
  { key: 'year20', years: 20 },
  { key: 'year30', years: 30 },
];

/**
 * Interpolate continuously-compounded-equivalent simple yield (decimal)
 * from the FMP treasury curve for a given year fraction T.
 * Falls back to DATA_CONFIG.market.RISK_FREE_RATE when curve missing.
 */
export function termRiskFreeRate(
  rates: FmpTreasuryRate | FmpTreasuryRate[] | null | undefined,
  T: number,
): number {
  const fallback = DATA_CONFIG.market.RISK_FREE_RATE;
  const row = Array.isArray(rates) ? rates[0] : rates;
  if (!row) return fallback;

  const pts: { t: number; y: number }[] = [];
  for (const { key, years } of TENOR_YEARS) {
    const raw = row[key];
    if (typeof raw === 'number' && isFinite(raw) && raw > 0) {
      // FMP reports percent (e.g. 4.25); convert to decimal.
      pts.push({ t: years, y: raw > 1 ? raw / 100 : raw });
    }
  }
  if (pts.length === 0) return fallback;

  // Short end: use shortest available tenor (no negative extrapolation).
  const target = Math.max(1 / 365, T);
  if (target <= pts[0]!.t) return pts[0]!.y;
  if (target >= pts[pts.length - 1]!.t) return pts[pts.length - 1]!.y;

  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    if (target >= a.t && target <= b.t) {
      const w = (target - a.t) / (b.t - a.t);
      return a.y * (1 - w) + b.y * w;
    }
  }
  return fallback;
}

/**
 * Estimate continuous dividend yield.
 * Prefer explicit lastDivAnnual / price when present on profile-like objects;
 * else fall back to symbol preset or global default.
 */
export function estimateDividendYield(
  symbol: string,
  profile?: Pick<FmpProfile, 'price'> & { lastDiv?: number; lastDividend?: number; dividendYield?: number } | null,
  spot?: number,
): number {
  if (profile) {
    const dy = (profile as { dividendYield?: number }).dividendYield;
    if (typeof dy === 'number' && isFinite(dy) && dy >= 0) {
      return dy > 1 ? dy / 100 : dy;
    }
    const lastDiv =
      (profile as { lastDiv?: number }).lastDiv ??
      (profile as { lastDividend?: number }).lastDividend;
    const px = spot ?? profile.price;
    if (typeof lastDiv === 'number' && lastDiv > 0 && typeof px === 'number' && px > 0) {
      // FMP lastDiv is typically the most recent *quarterly* dividend → annualize ×4.
      return Math.min(0.15, (lastDiv * 4) / px);
    }
  }
  // Light symbol-level defaults for common index products.
  const upper = symbol.toUpperCase();
  if (upper === 'SPY' || upper === 'IVV' || upper === 'VOO') return 0.013;
  if (upper === 'QQQ') return 0.006;
  if (upper === 'IWM') return 0.012;
  if (upper === 'DIA') return 0.016;
  return DATA_CONFIG.market.DIVIDEND_YIELD;
}
