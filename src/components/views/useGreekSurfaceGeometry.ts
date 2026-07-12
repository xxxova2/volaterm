import { useEffect, useMemo } from 'react';
import { useTerminalStore } from '../../store/terminalStore';
import type { GreekKey } from './greeksTypes';
import { buildStrikeWorldXs } from './surfaceStrikeMapping';
import {
  buildGreekSurfaceFromValues,
  type GreekSurfaceInfo,
} from './buildGreekSurfaceGeometry';

export type { GreekSurfaceInfo } from './buildGreekSurfaceGeometry';
export { greekRamp01 } from './greekRamp';

/** Moneyness band (strike / spot) used to filter strikes before meshing. */
const GREEK_MONEYNESS_MIN = 0.70;
const GREEK_MONEYNESS_MAX = 1.30;

/** Maximum number of expiries included on the Z axis. */
const MAX_EXPIRIES = 8;

/**
 * Build a 3D BufferGeometry whose Y axis is the magnitude of `greek` from the
 * terminal LIVE chain (desk engine). Prefer MacroVol grid via
 * `buildGreekSurfaceFromMacroVolGrid` when same-API truth is required.
 */
export function useGreekSurfaceGeometry(greek: GreekKey): GreekSurfaceInfo | null {
  const snapshot = useTerminalStore(s => s.snapshot);
  const displayMode = useTerminalStore(s => s.displayMode);

  const info = useMemo<GreekSurfaceInfo | null>(() => {
    if (!snapshot || snapshot.expiries.length < 2) return null;

    const slices = snapshot.expiries.slice(0, MAX_EXPIRIES);
    const spot = snapshot.spot;

    const allStrikes = [...new Set(
      slices.flatMap(s => [...s.calls, ...s.puts].map(q => q.strike)),
    )].sort((a, b) => a - b);
    if (allStrikes.length < 2) return null;

    const filteredStrikes = allStrikes.filter(k => {
      const m = k / spot;
      return m >= GREEK_MONEYNESS_MIN && m <= GREEK_MONEYNESS_MAX;
    });
    if (filteredStrikes.length < 2) return null;

    const nZ = slices.length;
    const nX = filteredStrikes.length;

    const start = allStrikes.indexOf(filteredStrikes[0]!);
    const end = allStrikes.indexOf(filteredStrikes[nX - 1]!);
    const mapping = buildStrikeWorldXs(
      displayMode,
      { strikes: allStrikes, expiries: slices.map(s => s.expiry) },
      snapshot,
      start,
      end,
      spot,
    );

    // OTM market convention: put wing K < spot, call wing K ≥ spot.
    const values: (number | null)[][] = [];
    for (let z = 0; z < nZ; z++) {
      const slice = slices[z]!;
      const row: (number | null)[] = [];
      for (let x = 0; x < nX; x++) {
        const strike = filteredStrikes[x]!;
        const preferPut = strike < spot;
        const primary = preferPut ? slice.puts : slice.calls;
        const secondary = preferPut ? slice.calls : slice.puts;
        const q =
          primary.find(qq => qq.strike === strike)
          ?? secondary.find(qq => qq.strike === strike)
          ?? null;
        const v = q?.[greek] ?? null;
        row.push(v != null && Number.isFinite(v) ? v : null);
      }
      values.push(row);
    }

    return buildGreekSurfaceFromValues({
      values,
      strikes: filteredStrikes,
      dtes: slices.map(s => s.dte),
      spot,
      strikeXs: mapping.xs,
      xTicks: mapping.ticks,
      xAxisLabel: mapping.axisLabel,
      source: 'desk',
      startStrikeIdx: start,
      endStrikeIdx: end,
    });
  }, [snapshot, greek, displayMode]);

  useEffect(() => {
    return () => {
      info?.geo.dispose();
    };
  }, [info]);

  return info;
}
