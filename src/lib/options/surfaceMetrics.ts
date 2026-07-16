/**
 * Session surface metrics for falsifying "shape changed" claims:
 * fixed-strike IVs vs 25Δ risk-reversal / fly (sticky-strike vs sticky-delta).
 */
import type { OptionQuote, VolSnapshot } from './types';

export type SurfaceUpdatePath = 'full_chain' | 'sticky_spot';

export interface FixedKIv {
  /** Target moneyness (e.g. 0.95) */
  m: number;
  /** Nearest listed strike used */
  k: number;
  iv: number | null;
}

export interface SurfaceMetricsFrame {
  ts: number;
  spot: number;
  atmIv: number | null;
  /** Fixed-strike wing samples (sticky-strike diagnostic). */
  fixedK: FixedKIv[];
  /** 25Δ RR = put wing − call wing (rich puts → positive). */
  rr25: number | null;
  /** 25Δ fly = avg wing − ATM. */
  fly25: number | null;
  path: SurfaceUpdatePath;
  expiry: string | null;
}

function interpolateIV(quotes: OptionQuote[], targetDelta: number): number | null {
  const sorted = [...quotes]
    .filter((q) => q.delta != null && q.iv != null && q.iv > 0)
    .sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0));
  if (sorted.length < 2) return null;

  const deltas = sorted.map((q) => q.delta!);
  const ivs = sorted.map((q) => q.iv!);

  if (targetDelta <= deltas[0]!) return ivs[0]!;
  if (targetDelta >= deltas[deltas.length - 1]!) return ivs[ivs.length - 1]!;

  for (let i = 0; i < deltas.length - 1; i++) {
    if (targetDelta >= deltas[i]! && targetDelta <= deltas[i + 1]!) {
      const t = (targetDelta - deltas[i]!) / (deltas[i + 1]! - deltas[i]! || 1);
      return ivs[i]! + t * (ivs[i + 1]! - ivs[i]!);
    }
  }
  return null;
}

function nearestOtmIv(
  slice: { calls: OptionQuote[]; puts: OptionQuote[] },
  spot: number,
  targetK: number,
): { k: number; iv: number | null } {
  // OTM convention: K >= S call, K < S put.
  const wing = targetK >= spot ? slice.calls : slice.puts;
  if (wing.length === 0) return { k: targetK, iv: null };
  const best = wing.reduce((a, b) =>
    Math.abs(a.strike - targetK) <= Math.abs(b.strike - targetK) ? a : b,
  );
  return {
    k: best.strike,
    iv: best.iv != null && best.iv > 0 ? best.iv : null,
  };
}

/**
 * Extract front-expiry metrics. Uses OTM quotes for fixed-K; delta interp for RR/fly.
 */
export function extractSurfaceMetrics(
  snap: VolSnapshot,
  path: SurfaceUpdatePath,
  ts: number = Date.now(),
): SurfaceMetricsFrame {
  const front = snap.expiries[0] ?? null;
  const spot = snap.spot;
  const atmIv = front?.atmIV != null && front.atmIV > 0 ? front.atmIV : null;

  const fixedK: FixedKIv[] = [];
  if (front && spot > 0) {
    for (const m of [0.95, 1.0, 1.05]) {
      const target = spot * m;
      const { k, iv } = nearestOtmIv(front, spot, target);
      fixedK.push({ m, k, iv });
    }
  }

  let rr25: number | null = null;
  let fly25: number | null = null;
  if (front) {
    const callQuotes = front.calls.filter((q) => q.delta != null && q.delta > 0 && q.iv != null);
    const putQuotes = front.puts.filter((q) => q.delta != null && q.delta < 0 && q.iv != null);
    const iv25c = interpolateIV(callQuotes, 0.25);
    const iv25p = interpolateIV(putQuotes, -0.25);
    const atm = atmIv;
    if (iv25c != null && iv25p != null) {
      rr25 = iv25p - iv25c;
      if (atm != null) fly25 = (iv25c + iv25p) / 2 - atm;
    }
  }

  return {
    ts,
    spot,
    atmIv,
    fixedK,
    rr25,
    fly25,
    path,
    expiry: front?.expiry ?? null,
  };
}

/** Delta between two frames (vol points for ATM/RR/fly; bps = *10000 for ATM). */
export function metricsDelta(
  prev: SurfaceMetricsFrame | null,
  next: SurfaceMetricsFrame,
): {
  atmBps: number | null;
  rrBps: number | null;
  flyBps: number | null;
  spotPct: number | null;
} {
  if (!prev) {
    return { atmBps: null, rrBps: null, flyBps: null, spotPct: null };
  }
  const atmBps =
    prev.atmIv != null && next.atmIv != null
      ? Math.round((next.atmIv - prev.atmIv) * 10_000)
      : null;
  const rrBps =
    prev.rr25 != null && next.rr25 != null
      ? Math.round((next.rr25 - prev.rr25) * 10_000)
      : null;
  const flyBps =
    prev.fly25 != null && next.fly25 != null
      ? Math.round((next.fly25 - prev.fly25) * 10_000)
      : null;
  const spotPct =
    prev.spot > 0 ? ((next.spot - prev.spot) / prev.spot) * 100 : null;
  return { atmBps, rrBps, flyBps, spotPct };
}

export const SURFACE_METRICS_MAX = 32;

export function pushSurfaceMetrics(
  frames: SurfaceMetricsFrame[],
  frame: SurfaceMetricsFrame,
  max = SURFACE_METRICS_MAX,
): SurfaceMetricsFrame[] {
  const last = frames[frames.length - 1];
  if (last && Math.abs(last.ts - frame.ts) < 2_000) {
    return [...frames.slice(0, -1), frame].slice(-max);
  }
  return [...frames, frame].slice(-max);
}
