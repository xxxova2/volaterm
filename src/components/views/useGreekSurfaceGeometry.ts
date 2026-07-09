import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useTerminalStore } from '../../store/terminalStore';
import { VISUAL_CONFIG } from '../../config/constants';
import type { GreekKey } from './greeksTypes';
import { buildStrikeWorldXs, type XTick } from './surfaceStrikeMapping';

const { DEPTH, VISUAL_HEIGHT } = VISUAL_CONFIG.surface;

/** Moneyness band (strike / spot) used to filter strikes before meshing. */
const GREEK_MONEYNESS_MIN = 0.70;
const GREEK_MONEYNESS_MAX = 1.30;

/** Maximum number of expiries included on the Z axis. */
const MAX_EXPIRIES = 8;

/**
 * Three-stop ramp used to color Greek vertices: cyan -> white -> amber.
 * `t` is clamped to [0, 1].
 */
export function greekRamp01(t: number): [number, number, number] {
  const v = Math.max(0, Math.min(1, t));
  if (v < 0.5) {
    const u = v / 0.5;
    return [u, 0.8 + 0.2 * u, 0.95 + 0.05 * u];
  }
  const u = (v - 0.5) / 0.5;
  return [1.0, 1.0 - 0.25 * u, 1.0 - u];
}

export interface GreekSurfaceInfo {
  geo: THREE.BufferGeometry;
  minV: number;
  maxV: number;
  dtes: number[];
  strikes: number[];
  spot: number;
  startStrikeIdx: number;
  endStrikeIdx: number;
  /** Per-strike world X coordinates, in [start..end] order. Length = strikes.length. */
  strikeXs: number[];
  xTicks: XTick[];
  xAxisLabel: string;
  mapPointToCell: (px: number, pz: number) => { expiryIdx: number; strikeIdx: number } | null;
}

/**
 * Build a 3D BufferGeometry whose Y axis is the magnitude of `greek`,
 * X is derived from the active displayMode (strike / moneyness / delta)
 * mapped to half-WIDTH and Z is expiry index mapped to [-DEPTH/2, DEPTH/2].
 * Returns null when the snapshot is missing or too small to build a mesh.
 */
export function useGreekSurfaceGeometry(greek: GreekKey): GreekSurfaceInfo | null {
  const snapshot = useTerminalStore(s => s.snapshot);
  const displayMode = useTerminalStore(s => s.displayMode);

  const info = useMemo<GreekSurfaceInfo | null>(() => {
    if (!snapshot || snapshot.expiries.length < 2) return null;

    const slices = snapshot.expiries.slice(0, MAX_EXPIRIES);
    const spot = snapshot.spot;

    // Collect all strikes across the chosen expiries.
    const allStrikes = [...new Set(
      slices.flatMap(s => [...s.calls, ...s.puts].map(q => q.strike)),
    )].sort((a, b) => a - b);
    if (allStrikes.length < 2) return null;

    // Filter to moneyness within +/-30% of spot.
    const filteredStrikes = allStrikes.filter(k => {
      const m = k / spot;
      return m >= GREEK_MONEYNESS_MIN && m <= GREEK_MONEYNESS_MAX;
    });
    if (filteredStrikes.length < 2) return null;

    const nZ = slices.length;
    const nX = filteredStrikes.length;

    // Compute displayMode-aware X positions for each filtered strike plus
    // tick labels for the X axis.
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
    const strikeXs = mapping.xs;
    const xTicks = mapping.ticks;
    const xAxisLabel = mapping.axisLabel;

    // OTM market convention: put wing K < spot, call wing K ≥ spot.
    // Mixing call+put deltas (or blindly preferring calls) makes 3D greek
    // surfaces unreadable near ATM — same convention as the heatmap.
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

    // Compute min/max over finite values.
    let minV = Infinity;
    let maxV = -Infinity;
    for (let z = 0; z < nZ; z++) {
      for (let x = 0; x < nX; x++) {
        const v = values[z]![x]!;
        if (v == null) continue;
        if (v < minV) minV = v;
        if (v > maxV) maxV = v;
      }
    }
    if (!Number.isFinite(minV) || !Number.isFinite(maxV)) return null;
    const range = (maxV - minV) || 1;

    // Build vertex buffers. Colors use 4 components so per-vertex alpha
    // can hide cells with missing quotes.
    const positions = new Float32Array(nX * nZ * 3);
    const colors = new Float32Array(nX * nZ * 4);
    const indices: number[] = [];

    for (let z = 0; z < nZ; z++) {
      const pz = (nZ === 1 ? 0 : z / (nZ - 1) - 0.5) * DEPTH;
      for (let x = 0; x < nX; x++) {
        const idx = z * nX + x;

        const px = strikeXs[x]!;

        const v = values[z]![x]!;
        if (v == null) {
          positions[idx * 3] = px;
          positions[idx * 3 + 1] = 0;
          positions[idx * 3 + 2] = pz;
          // colors default to 0 (alpha=0), so the cell is invisible.
        } else {
          const py = ((v - minV) / range) * VISUAL_HEIGHT;
          positions[idx * 3] = px;
          positions[idx * 3 + 1] = py;
          positions[idx * 3 + 2] = pz;

          const t = (v - minV) / range;
          const [r, g, b] = greekRamp01(t);
          colors[idx * 4] = r;
          colors[idx * 4 + 1] = g;
          colors[idx * 4 + 2] = b;
          colors[idx * 4 + 3] = 1;
        }

        if (x < nX - 1 && z < nZ - 1) {
          const a = idx;
          const b = idx + 1;
          const c = idx + nX;
          const d = idx + nX + 1;
          indices.push(a, b, c, b, d, c);
        }
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 4));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mapPointToCell = (px: number, pz: number): { expiryIdx: number; strikeIdx: number } | null => {
      // Invert X by finding closest per-strike world coordinate.
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let i = 0; i < strikeXs.length; i++) {
        const d = Math.abs(strikeXs[i]! - px);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }
      const zNorm = (pz / DEPTH) + 0.5;
      if (zNorm < 0 || zNorm > 1) return null;
      const z = Math.round(zNorm * (nZ - 1));
      if (z < 0 || z >= nZ) return null;
      return { expiryIdx: z, strikeIdx: bestIdx };
    };

    return {
      geo,
      minV,
      maxV,
      dtes: slices.map(s => s.dte),
      strikes: filteredStrikes,
      spot,
      startStrikeIdx: start,
      endStrikeIdx: end,
      strikeXs,
      xTicks,
      xAxisLabel,
      mapPointToCell,
    };
  }, [snapshot, greek, displayMode]);

  // Dispose the old geometry whenever a new one is computed or on unmount.
  useEffect(() => {
    return () => {
      info?.geo.dispose();
    };
  }, [info]);

  return info;
}
