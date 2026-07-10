/**
 * Macro carry / FX context scores from already-loaded prints.
 * Labels only — not trade recommendations.
 */

export type CarryScore = {
  id: string;
  label: string;
  value: string;
  tone: 'up' | 'down' | 'warn' | 'neutral';
  note: string;
};

export type CarryInputs = {
  usdjpy?: number | null;
  eurusd?: number | null;
  /** US−JP 10Y differential in percentage points */
  usJp10yPp?: number | null;
  /** FRED 2s10s in percentage points (0.35 = 35 bp) */
  spread2s10s?: number | null;
  sofr?: number | null;
  iorb?: number | null;
};

function pairRate(
  pairs: { pair: string; rate: number | null }[] | undefined,
  name: string,
): number | null {
  const p = pairs?.find((x) => x.pair === name);
  return p?.rate != null && Number.isFinite(p.rate) ? p.rate : null;
}

export function ratesFromFxPairs(
  pairs: { pair: string; rate: number | null }[] | undefined,
): Pick<CarryInputs, 'usdjpy' | 'eurusd'> {
  return {
    usdjpy: pairRate(pairs, 'USDJPY'),
    eurusd: pairRate(pairs, 'EURUSD'),
  };
}

/** Build 2–4 narrative chips from live macro prints. */
export function buildCarryScores(input: CarryInputs): CarryScore[] {
  const out: CarryScore[] = [];

  if (input.usJp10yPp != null && Number.isFinite(input.usJp10yPp)) {
    const d = input.usJp10yPp;
    out.push({
      id: 'usjp',
      label: 'US−JP 10Y',
      value: `${d >= 0 ? '+' : ''}${d.toFixed(2)} pp`,
      tone: d > 3 ? 'warn' : d > 1.5 ? 'up' : d < 0.5 ? 'down' : 'neutral',
      note:
        d > 3
          ? 'Wide US−JP gap — classic long USDJPY carry premium; vulnerable to vol / BoJ.'
          : d > 1.5
            ? 'Moderate carry premium — size to FX gamma, not just yield gap.'
            : 'Compressed differential — carry less attractive; JPY risk-off still bites.',
    });
  }

  if (input.usdjpy != null) {
    const j = input.usdjpy;
    out.push({
      id: 'usdjpy',
      label: 'USDJPY',
      value: j.toFixed(2),
      tone: j >= 155 ? 'warn' : j >= 145 ? 'up' : j < 140 ? 'down' : 'neutral',
      note:
        j >= 155
          ? 'Elevated USDJPY — intervention / vol-event risk elevated vs quiet carry.'
          : j >= 145
            ? 'Firm USDJPY — carry still in play with path risk.'
            : 'Lower USDJPY — less carry juice from the FX leg alone.',
    });
  }

  if (input.spread2s10s != null && Number.isFinite(input.spread2s10s)) {
    const bps = input.spread2s10s * 100;
    out.push({
      id: '2s10s',
      label: '2s10s',
      value: `${bps >= 0 ? '+' : ''}${bps.toFixed(0)} bp`,
      tone: bps < 0 ? 'down' : bps > 50 ? 'up' : 'neutral',
      note:
        bps < 0
          ? 'Curve inverted — front-end tight / recession pricing; watch STIR path.'
          : bps > 50
            ? 'Steep curve — roll-down / duration more friendly on belly–long.'
            : 'Mild slope — limited curve carry signal.',
    });
  }

  if (
    input.sofr != null
    && input.iorb != null
    && Number.isFinite(input.sofr)
    && Number.isFinite(input.iorb)
  ) {
    const gap = (input.sofr - input.iorb) * 100; // bp
    out.push({
      id: 'sofr_iorb',
      label: 'SOFR−IORB',
      value: `${gap >= 0 ? '+' : ''}${gap.toFixed(0)} bp`,
      tone: gap > 5 ? 'warn' : gap < -5 ? 'down' : 'neutral',
      note:
        gap > 5
          ? 'SOFR rich to IORB — funding stress / plumbing tight.'
          : gap < -5
            ? 'SOFR soft vs IORB — abundant reserves / quiet plumbing.'
            : 'Corridor calm — no strong funding stress signal.',
    });
  }

  return out;
}

/** One-line auction narrative vs curve. */
export function auctionCurveNote(
  nextCoupon: { security_type?: string | null; security_term?: string | null; auction_date?: string | null } | null | undefined,
  spread2s10sPp: number | null | undefined,
): string | null {
  if (!nextCoupon?.auction_date) return null;
  const label = [nextCoupon.security_type, nextCoupon.security_term].filter(Boolean).join(' ');
  const curve =
    spread2s10sPp == null
      ? ''
      : spread2s10sPp < 0
        ? ' · curve inverted — supply into tight front end'
        : spread2s10sPp * 100 > 40
          ? ' · steep curve — duration supply may be absorbed easier'
          : ' · mild slope';
  return `Next focus ${label || 'coupon'} ${nextCoupon.auction_date}${curve}`;
}
