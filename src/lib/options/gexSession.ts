/**
 * GEX regime labels + session history (localStorage) for sticky desk levels.
 * Fail-closed: no synthetic GEX — only records live recomputes.
 */
import type { DealerExposure } from './analytics';

const STORAGE_KEY = 'terminal.gex.session.v1';
const MAX_POINTS = 96; // ~ half day at 5m if over-sampled; we throttle by min gap

export type GammaRegime = {
  id: 'long_gamma' | 'short_gamma' | 'mixed' | 'unknown';
  label: string;
  short: string;
  tone: 'up' | 'down' | 'warn' | 'neutral';
  note: string;
};

export type GexLevels = {
  symbol: string;
  spot: number;
  totalGEX: number;
  gammaFlip: number | null;
  callWall: number | null;
  putWall: number | null;
  /** High Vol Level — max |net GEX| strike. */
  highVolLevel: number | null;
  regime: GammaRegime;
  aboveFlip: boolean | null;
};

/** Compact net-GEX sample at a strike (for session strike×time heat). */
export type GexProfileSample = { k: number; g: number };

export type GexSessionPoint = {
  t: number;
  totalGEX: number;
  flip: number | null;
  spot: number;
  /** Sparse OI-inferred net GEX by strike at sample time (optional). */
  profile?: GexProfileSample[];
};

export type GexSessionSeries = {
  symbol: string;
  day: string; // YYYY-MM-DD local
  points: GexSessionPoint[];
};

/** Classify dealer gamma regime from net GEX + spot vs flip. */
export function classifyGammaRegime(
  totalGEX: number | null | undefined,
  spot?: number | null,
  flip?: number | null,
): GammaRegime {
  if (totalGEX == null || !Number.isFinite(totalGEX)) {
    return {
      id: 'unknown',
      label: 'GEX n/a',
      short: '—',
      tone: 'neutral',
      note: 'No dealer GEX yet — wait for live chain OI/γ.',
    };
  }
  const long = totalGEX >= 0;
  const above = flip != null && spot != null && Number.isFinite(spot) && Number.isFinite(flip)
    ? spot >= flip
    : null;

  if (long && (above === true || above === null)) {
    return {
      id: 'long_gamma',
      label: 'Long-γ dampening',
      short: 'GEX+',
      tone: 'up',
      note: above === true
        ? 'Net long dealer γ above flip — hedges buy dips / sell rips (mean-revert into walls).'
        : 'Net long dealer γ — spot moves tend to be absorbed if OI holds.',
    };
  }
  if (!long && (above === false || above === null)) {
    return {
      id: 'short_gamma',
      label: 'Toxic short-γ',
      short: 'GEX−',
      tone: 'down',
      note: above === false
        ? 'Toxic short-γ below flip — MM hedges amplify; expect wider range / traps, not a free direction.'
        : 'Net short dealer γ — lack of liquidity in the underlier; moves can accelerate into walls.',
    };
  }
  // Mixed: long GEX but below flip, or short GEX but above flip
  return {
    id: 'mixed',
    label: 'Mixed γ zone',
    short: long ? 'GEX+·xf' : 'GEX−·xf',
    tone: 'warn',
    note: 'Net GEX sign and spot vs flip disagree — transition risk; weight walls and charm/vanna interactions.',
  };
}

export function buildGexLevels(
  symbol: string,
  spot: number,
  dealer: Pick<
    DealerExposure,
    'totalGEX' | 'gammaFlip' | 'callWall' | 'putWall' | 'highVolLevel'
  > | null,
): GexLevels | null {
  if (!dealer || !Number.isFinite(spot)) return null;
  const aboveFlip =
    dealer.gammaFlip != null ? spot >= dealer.gammaFlip : null;
  return {
    symbol,
    spot,
    totalGEX: dealer.totalGEX,
    gammaFlip: dealer.gammaFlip,
    callWall: dealer.callWall,
    putWall: dealer.putWall,
    highVolLevel: dealer.highVolLevel ?? null,
    regime: classifyGammaRegime(dealer.totalGEX, spot, dealer.gammaFlip),
    aboveFlip,
  };
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function readStore(): GexSessionSeries | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GexSessionSeries;
    if (!parsed?.symbol || !Array.isArray(parsed.points)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStore(series: GexSessionSeries): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(series));
  } catch {
    /* quota / private mode */
  }
}

/**
 * Append a session sample (throttled ≥ 25s). Resets when symbol or calendar day changes.
 * Optional sparse profile enables strike×time GEX heat as the book is resampled live.
 * Returns the full series for the active symbol/day.
 */
export function recordGexSession(
  symbol: string,
  spot: number,
  totalGEX: number,
  flip: number | null,
  minGapMs = 25_000,
  profile?: GexProfileSample[],
): GexSessionSeries {
  const day = todayKey();
  let series = readStore();
  if (!series || series.symbol !== symbol || series.day !== day) {
    series = { symbol, day, points: [] };
  }
  const now = Date.now();
  const last = series.points[series.points.length - 1];
  if (!last || now - last.t >= minGapMs) {
    const pt: GexSessionPoint = { t: now, totalGEX, flip, spot };
    if (profile && profile.length > 0) {
      const capped = [...profile]
        .sort((a, b) => Math.abs(b.g) - Math.abs(a.g))
        .slice(0, 40)
        .sort((a, b) => a.k - b.k);
      pt.profile = capped;
    }
    series.points.push(pt);
    if (series.points.length > MAX_POINTS) {
      series.points = series.points.slice(-MAX_POINTS);
    }
    writeStore(series);
  }
  return series;
}

export function loadGexSession(symbol: string): GexSessionSeries | null {
  const s = readStore();
  if (!s || s.symbol !== symbol || s.day !== todayKey()) return null;
  return s;
}
