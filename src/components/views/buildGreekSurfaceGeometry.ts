import * as THREE from 'three';
import { VISUAL_CONFIG } from '../../config/constants';
import type { SurfaceGrid } from '../../lib/macrovol/api';
import type { XTick } from './surfaceStrikeMapping';
import { greekRamp01 } from './greekRamp';

const { WIDTH, DEPTH, VISUAL_HEIGHT } = VISUAL_CONFIG.surface;

export type GreekSurfaceSource = 'macrovol' | 'desk';

export interface GreekSurfaceInfo {
  geo: THREE.BufferGeometry;
  minV: number;
  maxV: number;
  dtes: number[];
  strikes: number[];
  spot: number;
  startStrikeIdx: number;
  endStrikeIdx: number;
  strikeXs: number[];
  xTicks: XTick[];
  xAxisLabel: string;
  /** [expiryIdx][strikeIdx] — same layout as mesh vertices */
  values: (number | null)[][];
  source: GreekSurfaceSource;
  mapPointToCell: (px: number, pz: number) => { expiryIdx: number; strikeIdx: number } | null;
}

function linearStrikeXs(strikes: number[]): { xs: number[]; ticks: XTick[]; axisLabel: string } {
  const n = strikes.length;
  const kMin = strikes[0]!;
  const kMax = strikes[n - 1]!;
  const span = kMax - kMin || 1;
  const xs = strikes.map((k) => ((k - kMin) / span) * WIDTH - WIDTH / 2);
  const nTicks = Math.min(5, n);
  const ticks: XTick[] = [];
  for (let t = 0; t < nTicks; t++) {
    const frac = nTicks === 1 ? 0.5 : t / (nTicks - 1);
    const k = kMin + frac * span;
    ticks.push({
      px: frac * WIDTH - WIDTH / 2,
      label: k >= 100 ? k.toFixed(0) : k.toFixed(1),
    });
  }
  return { xs, ticks, axisLabel: 'Strike' };
}

function buildMapPointToCell(strikeXs: number[], nZ: number) {
  return (px: number, pz: number): { expiryIdx: number; strikeIdx: number } | null => {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < strikeXs.length; i++) {
      const d = Math.abs(strikeXs[i]! - px);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const zNorm = pz / DEPTH + 0.5;
    if (zNorm < 0 || zNorm > 1) return null;
    const z = Math.round(zNorm * (nZ - 1));
    if (z < 0 || z >= nZ) return null;
    return { expiryIdx: z, strikeIdx: bestIdx };
  };
}

/**
 * Shared mesh builder: values[z][x] with finite numbers colored on greek ramp.
 */
export function buildGreekSurfaceFromValues(params: {
  values: (number | null)[][];
  strikes: number[];
  dtes: number[];
  spot: number;
  strikeXs: number[];
  xTicks: XTick[];
  xAxisLabel: string;
  source: GreekSurfaceSource;
  startStrikeIdx?: number;
  endStrikeIdx?: number;
}): GreekSurfaceInfo | null {
  const { values, strikes, dtes, spot, strikeXs, xTicks, xAxisLabel, source } = params;
  const nZ = dtes.length;
  const nX = strikes.length;
  if (nZ < 1 || nX < 2 || values.length !== nZ) return null;

  let minV = Infinity;
  let maxV = -Infinity;
  for (let z = 0; z < nZ; z++) {
    const row = values[z];
    if (!row || row.length !== nX) return null;
    for (let x = 0; x < nX; x++) {
      const v = row[x];
      if (v == null || !Number.isFinite(v)) continue;
      if (v < minV) minV = v;
      if (v > maxV) maxV = v;
    }
  }
  if (!Number.isFinite(minV) || !Number.isFinite(maxV)) return null;
  const range = maxV - minV || 1;

  const positions = new Float32Array(nX * nZ * 3);
  const colors = new Float32Array(nX * nZ * 4);
  const indices: number[] = [];

  for (let z = 0; z < nZ; z++) {
    const pz = (nZ === 1 ? 0 : z / (nZ - 1) - 0.5) * DEPTH;
    for (let x = 0; x < nX; x++) {
      const idx = z * nX + x;
      const px = strikeXs[x]!;
      const v = values[z]![x]!;
      if (v == null || !Number.isFinite(v)) {
        positions[idx * 3] = px;
        positions[idx * 3 + 1] = 0;
        positions[idx * 3 + 2] = pz;
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

  return {
    geo,
    minV,
    maxV,
    dtes,
    strikes,
    spot,
    startStrikeIdx: params.startStrikeIdx ?? 0,
    endStrikeIdx: params.endStrikeIdx ?? nX - 1,
    strikeXs,
    xTicks,
    xAxisLabel,
    values,
    source,
    mapPointToCell: buildMapPointToCell(strikeXs, nZ),
  };
}

/**
 * MacroVol interpolated surface → same R3F mesh language as desk chain.
 * grid layout from Python `_interpolate_grid`: grid[tIdx][kIdx].
 */
export function buildGreekSurfaceFromMacroVolGrid(
  grid: SurfaceGrid,
  spot: number,
): GreekSurfaceInfo | null {
  const { T_vals, K_vals, grid: z } = grid;
  if (!T_vals?.length || !K_vals?.length || !z?.length) return null;
  if (T_vals.length < 2 || K_vals.length < 2) return null;

  const nZ = T_vals.length;
  const nX = K_vals.length;
  const values: (number | null)[][] = [];
  for (let t = 0; t < nZ; t++) {
    const row = z[t];
    if (!row || row.length < nX) {
      values.push(Array.from({ length: nX }, () => null));
      continue;
    }
    values.push(
      row.slice(0, nX).map((v) => (v != null && Number.isFinite(v) ? v : null)),
    );
  }

  const strikes = K_vals.slice();
  const dtes = T_vals.map((T) => Math.max(0, Math.round(T * 365)));
  const mapping = linearStrikeXs(strikes);

  return buildGreekSurfaceFromValues({
    values,
    strikes,
    dtes,
    spot,
    strikeXs: mapping.xs,
    xTicks: mapping.ticks,
    xAxisLabel: mapping.axisLabel,
    source: 'macrovol',
  });
}
