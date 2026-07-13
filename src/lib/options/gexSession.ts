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
  /** Book total charm ($ Δ/day) at sample time when available. */
  totalCharm?: number;
  flip: number | null;
  spot: number;
  /** Sparse OI-inferred net GEX by strike at sample time (optional). */
  profile?: GexProfileSample[];
  /** Sparse OI-inferred net charm by strike (optional). */
  charmProfile?: GexProfileSample[];
};

export type GexSessionSeries = {
  symbol: string;
  day: string; // YYYY-MM-DD local
  points: GexSessionPoint[];
};

export type RecordGexSessionOpts = {
  minGapMs?: number;
  profile?: GexProfileSample[];
  charmProfile?: GexProfileSample[];
  totalCharm?: number;
};

/**
 * Classify dealer gamma regime from net GEX + spot vs flip.
 *
 * `totalGEX` uses SpotGamma-style **customer-long OI** (+call / −put).
 * Dealers are assumed short that OI, so sign is inverted for regime labels:
 *   customer GEX ≥ 0 (call-heavy) → dealers **short** γ → amplify
 *   customer GEX < 0 (put-heavy)  → dealers **long** γ → dampen
 */
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
  /** Customer-long OI convention: positive = call-heavy book. */
  const customerPositive = totalGEX >= 0;
  const above = flip != null && spot != null && Number.isFinite(spot) && Number.isFinite(flip)
    ? spot >= flip
    : null;

  // Dealer γ opposes customer-long OI: GEX+ → short-γ, GEX− → long-γ (labels inverted vs raw sign).
  if (customerPositive && (above === true || above === null)) {
    return {
      id: 'short_gamma',
      label: 'Toxic short-γ',
      short: 'GEX+',
      tone: 'down',
      note: above === true
        ? 'Customer call-heavy (GEX+) → dealers short γ above flip — MM hedges can amplify into walls.'
        : 'Customer call-heavy (GEX+) → dealers short γ — moves can accelerate into walls.',
    };
  }
  if (!customerPositive && (above === false || above === null)) {
    return {
      id: 'long_gamma',
      label: 'Long-γ dampening',
      short: 'GEX−',
      tone: 'up',
      note: above === false
        ? 'Customer put-heavy (GEX−) → dealers long γ below flip — hedges buy dips / sell rips.'
        : 'Customer put-heavy (GEX−) → dealers long γ — spot moves tend to be absorbed if OI holds.',
    };
  }
  // Mixed: GEX+ but below flip, or GEX− but above flip
  return {
    id: 'mixed',
    label: 'Mixed γ zone',
    short: customerPositive ? 'GEX+·xf' : 'GEX−·xf',
    tone: 'warn',
    note: 'Customer-long GEX sign and spot vs flip disagree — transition risk; weight walls and charm/vanna.',
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

function capProfile(profile: GexProfileSample[], max = 40): GexProfileSample[] {
  return [...profile]
    .sort((a, b) => Math.abs(b.g) - Math.abs(a.g))
    .slice(0, max)
    .sort((a, b) => a.k - b.k);
}

/**
 * Append a session sample (throttled ≥ 25s). Resets when symbol or calendar day changes.
 * Optional sparse GEX/charm profiles enable strike×time heat as the book is resampled live.
 * Returns the full series for the active symbol/day.
 *
 * Overloads keep older call sites (`minGapMs, profile`) working.
 */
export function recordGexSession(
  symbol: string,
  spot: number,
  totalGEX: number,
  flip: number | null,
  minGapMsOrOpts?: number | RecordGexSessionOpts,
  profileLegacy?: GexProfileSample[],
): GexSessionSeries {
  const opts: RecordGexSessionOpts =
    typeof minGapMsOrOpts === 'object' && minGapMsOrOpts != null
      ? minGapMsOrOpts
      : {
          minGapMs: typeof minGapMsOrOpts === 'number' ? minGapMsOrOpts : 25_000,
          profile: profileLegacy,
        };
  const minGapMs = opts.minGapMs ?? 25_000;
  const profile = opts.profile;
  const charmProfile = opts.charmProfile;

  const day = todayKey();
  let series = readStore();
  if (!series || series.symbol !== symbol || series.day !== day) {
    series = { symbol, day, points: [] };
  }
  const now = Date.now();
  const last = series.points[series.points.length - 1];
  if (!last || now - last.t >= minGapMs) {
    const pt: GexSessionPoint = { t: now, totalGEX, flip, spot };
    if (opts.totalCharm != null && Number.isFinite(opts.totalCharm)) {
      pt.totalCharm = opts.totalCharm;
    }
    if (profile && profile.length > 0) {
      pt.profile = capProfile(profile);
    }
    if (charmProfile && charmProfile.length > 0) {
      pt.charmProfile = capProfile(charmProfile);
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
