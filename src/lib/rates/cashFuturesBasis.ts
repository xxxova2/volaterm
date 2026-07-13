/**
 * Cash–futures basis monitor helpers (Conks / OnlySOFRs educational slice).
 *
 * True UST basis needs CTD + conversion factor + financing legs.
 * We only pair **live Tsy futures marks** with **cash curve yields** by tenor
 * and surface SOFR as the financing context — never invent CTD or basis size.
 */
import type { StirContract } from '../macrovol/api';

export type CashCurvePoint = { label: string; yield: number | null };

/** Map continuous Tsy futures to nearest cash curve tenor labels. */
const FUT_TO_CASH: Record<string, { cashLabels: string[]; tenor: string }> = {
  ZT: { cashLabels: ['2Y', '2y', '2 Yr', '2YR'], tenor: '2Y' },
  ZF: { cashLabels: ['5Y', '5y', '5 Yr', '5YR'], tenor: '5Y' },
  ZN: { cashLabels: ['10Y', '10y', '10 Yr', '10YR'], tenor: '10Y' },
  TN: { cashLabels: ['10Y', '10y', '10 Yr', '10YR'], tenor: '10Y Ultra' },
  ZB: { cashLabels: ['30Y', '30y', '30 Yr', '30YR', '20Y', '20y'], tenor: '30Y' },
  UB: { cashLabels: ['30Y', '30y', '30 Yr', '30YR'], tenor: 'Ultra Bond' },
};

export type CashFuturesRow = {
  ticker: string;
  product: string;
  tenor: string;
  futuresPrice: number | null;
  futuresNet: number | null;
  cashYield: number | null;
  cashLabel: string | null;
  /** Price change in ticks of last−prev when available */
  source: 'live' | 'missing';
};

export type CashFuturesSnapshot = {
  rows: CashFuturesRow[];
  liveCount: number;
  /** SOFR print for financing context (percent) */
  sofr: number | null;
  /** SOFR − EFFR in bps when available */
  sofrEffrBps: number | null;
  note: string;
};

function matchCashYield(
  curve: CashCurvePoint[],
  labels: string[],
): { yield: number | null; label: string | null } {
  const norm = (s: string) => s.replace(/\s+/g, '').toUpperCase();
  for (const want of labels) {
    const w = norm(want);
    const hit = curve.find((c) => norm(c.label) === w || norm(c.label).includes(w));
    if (hit && hit.yield != null && Number.isFinite(hit.yield)) {
      return { yield: hit.yield, label: hit.label };
    }
  }
  // Fuzzy: "10" year
  for (const want of labels) {
    const m = want.match(/(\d+)/);
    if (!m) continue;
    const n = m[1]!;
    const hit = curve.find((c) => {
      const L = c.label.toUpperCase();
      return (L.includes(`${n}Y`) || L.includes(`${n} Y`)) && c.yield != null;
    });
    if (hit) return { yield: hit.yield, label: hit.label };
  }
  return { yield: null, label: null };
}

function futKey(c: StirContract): string {
  const t = (c.ticker || c.contract || '').toUpperCase().replace(/=F$/, '');
  if (FUT_TO_CASH[t]) return t;
  for (const k of Object.keys(FUT_TO_CASH)) {
    if (t.startsWith(k)) return k;
  }
  return t;
}

/**
 * Build cash–futures monitor rows from STIR treasury futures + FRED cash curve.
 */
export function buildCashFuturesSnapshot(
  treasuryFutures: StirContract[] | null | undefined,
  curve: CashCurvePoint[],
  opts?: { sofr?: number | null; effr?: number | null },
): CashFuturesSnapshot {
  const sofr = opts?.sofr ?? null;
  const effr = opts?.effr ?? null;
  const sofrEffrBps =
    sofr != null && effr != null && Number.isFinite(sofr) && Number.isFinite(effr)
      ? (sofr - effr) * 100
      : null;

  const list = treasuryFutures ?? [];
  const rows: CashFuturesRow[] = [];

  for (const c of list) {
    const key = futKey(c);
    const map = FUT_TO_CASH[key];
    if (!map) continue;
    const cash = matchCashYield(curve, map.cashLabels);
    const live = c.last_price != null && Number.isFinite(c.last_price);
    rows.push({
      ticker: c.ticker || c.contract || key,
      product: c.product || map.tenor,
      tenor: map.tenor,
      futuresPrice: live ? c.last_price! : null,
      futuresNet: c.net ?? c.change ?? null,
      cashYield: cash.yield,
      cashLabel: cash.label,
      source: live ? 'live' : 'missing',
    });
  }

  // Ensure stable order ZT → UB
  const order = ['ZT', 'ZF', 'ZN', 'TN', 'ZB', 'UB'];
  rows.sort((a, b) => {
    const ia = order.findIndex((k) => a.ticker.toUpperCase().startsWith(k));
    const ib = order.findIndex((k) => b.ticker.toUpperCase().startsWith(k));
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });

  const liveCount = rows.filter((r) => r.source === 'live').length;

  return {
    rows,
    liveCount,
    sofr,
    sofrEffrBps,
    note:
      'Public continuous Tsy futures (yfinance) paired with cash curve yields. ' +
      'Not CTD-adjusted basis — no conversion factor, delivery option, or repo haircut. ' +
      'Use SOFR−EFFR as financing-stress context only.',
  };
}
