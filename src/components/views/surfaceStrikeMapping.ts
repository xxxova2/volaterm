import { VISUAL_CONFIG } from '../../config/constants';
import type { DisplayMode } from '../../lib/options/types';
import { fmtPrice } from '../../lib/format';

const { WIDTH } = VISUAL_CONFIG.surface;

export interface XTick {
  px: number;
  label: string;
}

/**
 * Shape of the inputs required by `buildStrikeWorldXs` for delta lookup.
 * The Greek surface works directly from the `VolSnapshot` rather than the
 * precomputed `SurfaceGrid`, so we keep this loose to support both callers.
 */
export interface DeltaLookup {
  strikes: number[];
  delta?: (number | null)[][];
  expiries: string[];
}

export interface StrikeDeltaSnapshot {
  expiries: {
    dte: number;
    calls: { strike: number; delta: number | null }[];
    puts: { strike: number; delta: number | null }[];
  }[];
}

/**
 * Pick the per-strike X world coordinate for the given display mode.
 * Returns the coordinate (in WIDTH-centered world units) for each strike
 * in [start, end], plus the axis label and a list of formatted ticks.
 */
export function buildStrikeWorldXs(
  mode: DisplayMode,
  surface: DeltaLookup,
  snapshot: StrikeDeltaSnapshot,
  start: number,
  end: number,
  spot: number,
): { xs: number[]; ticks: XTick[]; axisLabel: string } {
  const xs: number[] = Array.from({ length: end - start + 1 });

  if (mode === 'moneyness') {
    const logM = (strike: number) => Math.log(strike / spot);
    const logMMin = logM(surface.strikes[start]!);
    const logMMax = logM(surface.strikes[end]!);
    const span = logMMax - logMMin || 1;
    for (let i = start; i <= end; i++) {
      xs[i - start] = (logM(surface.strikes[i]!) - logMMin) / span * WIDTH - WIDTH / 2;
    }
    const ticks: XTick[] = [0.80, 0.90, 1.00, 1.10, 1.20].map(ratio => ({
      px: (Math.log(ratio) - logMMin) / span * WIDTH - WIDTH / 2,
      label: `${Math.round(ratio * 100)}%`,
    }));
    return { xs, ticks, axisLabel: 'Strike / Spot' };
  }

  if (mode === 'strike') {
    const kMin = surface.strikes[start]!;
    const kMax = surface.strikes[end]!;
    const span = kMax - kMin || 1;
    for (let i = start; i <= end; i++) {
      xs[i - start] = (surface.strikes[i]! - kMin) / span * WIDTH - WIDTH / 2;
    }
    const nTicks = 5;
    const ticks: XTick[] = [];
    for (let t = 0; t < nTicks; t++) {
      const frac = t / (nTicks - 1);
      const k = kMin + frac * (kMax - kMin);
      ticks.push({ px: frac * WIDTH - WIDTH / 2, label: fmtPrice(k, 0) });
    }
    return { xs, ticks, axisLabel: 'Strike' };
  }

  // mode === 'delta': use call delta from the snapshot (fallback 1 + putDelta).
  const deltas: number[] = Array.from({ length: end - start + 1 });
  let hasAny = false;
  // Pick the slice closest to ~30 DTE; otherwise the first slice with deltas.
  let sliceIdx = snapshot.expiries.findIndex(s => s.dte >= 25 && s.dte <= 45);
  if (sliceIdx < 0) sliceIdx = snapshot.expiries.findIndex(s => s.calls.length > 0);
  if (sliceIdx < 0) sliceIdx = 0;
  const slice = snapshot.expiries[sliceIdx];

  for (let i = start; i <= end; i++) {
    const k = surface.strikes[i]!;
    let d = surface.delta?.[sliceIdx]?.[i] ?? null;
    if (d == null && slice) {
      const call = slice.calls.find(q => q.strike === k);
      const put = slice.puts.find(q => q.strike === k);
      if (call?.delta != null) d = call.delta;
      else if (put?.delta != null) d = 1 + put.delta;
    }
    deltas[i - start] = d ?? 0.5;
    if (d != null) hasAny = true;
  }
  const dMin = hasAny ? Math.min(...deltas) : 0;
  const dMax = hasAny ? Math.max(...deltas) : 1;
  if (!hasAny) {
    // Degenerate fallback: lay out evenly.
    const n = end - start + 1;
    for (let i = 0; i < n; i++) xs[i] = (i / (n - 1 || 1)) * WIDTH - WIDTH / 2;
  } else {
    const span = dMax - dMin || 1;
    for (let i = start; i <= end; i++) {
      xs[i - start] = ((deltas[i - start]! - dMin) / span) * WIDTH - WIDTH / 2;
    }
  }
  const nTicks = 5;
  const ticks: XTick[] = [];
  for (let t = 0; t < nTicks; t++) {
    const frac = t / (nTicks - 1);
    const d = dMin + frac * (dMax - dMin);
    ticks.push({ px: frac * WIDTH - WIDTH / 2, label: `${(d * 100).toFixed(0)}Δ` });
  }
  return { xs, ticks, axisLabel: 'Call Delta' };
}
