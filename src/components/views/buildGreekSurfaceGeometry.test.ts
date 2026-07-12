import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  buildGreekSurfaceFromMacroVolGrid,
  buildGreekSurfaceFromValues,
} from './buildGreekSurfaceGeometry';

describe('buildGreekSurfaceFromMacroVolGrid', () => {
  const grid = {
    T_vals: [0.08, 0.16, 0.25],
    K_vals: [90, 100, 110],
    grid: [
      [0.1, 0.2, 0.15],
      [0.12, 0.22, 0.16],
      [0.11, 0.21, 0.14],
    ],
  };

  it('builds geometry matching MacroVol T×K layout', () => {
    const info = buildGreekSurfaceFromMacroVolGrid(grid, 100);
    expect(info).not.toBeNull();
    expect(info!.source).toBe('macrovol');
    expect(info!.strikes).toEqual([90, 100, 110]);
    expect(info!.dtes).toEqual([29, 58, 91]); // round(T*365)
    expect(info!.values[0]![1]).toBe(0.2);
    expect(info!.geo).toBeInstanceOf(THREE.BufferGeometry);
    expect(info!.minV).toBeLessThanOrEqual(info!.maxV);

    const positions = info!.geo.getAttribute('position') as THREE.BufferAttribute;
    expect(positions.count).toBe(9);
  });

  it('mapPointToCell recovers corner cells', () => {
    const info = buildGreekSurfaceFromMacroVolGrid(grid, 100)!;
    const nX = info.strikes.length;
    const nZ = info.dtes.length;
    for (const [x, z] of [
      [0, 0],
      [1, 1],
      [nX - 1, nZ - 1],
    ] as const) {
      const px = info.strikeXs[x]!;
      const pz = nZ === 1 ? 0 : (z / (nZ - 1)) * 3.2 - 1.6;
      const cell = info.mapPointToCell(px, pz);
      expect(cell).toEqual({ expiryIdx: z, strikeIdx: x });
    }
  });

  it('returns null for sparse grids', () => {
    expect(
      buildGreekSurfaceFromMacroVolGrid(
        { T_vals: [0.1], K_vals: [100], grid: [[1]] },
        100,
      ),
    ).toBeNull();
  });
});

describe('buildGreekSurfaceFromValues', () => {
  it('tags desk source and hides null alphas', () => {
    const info = buildGreekSurfaceFromValues({
      values: [
        [1, null, 2],
        [1.5, 1.2, 2.1],
      ],
      strikes: [90, 100, 110],
      dtes: [30, 60],
      spot: 100,
      strikeXs: [-1.8, 0, 1.8],
      xTicks: [{ px: 0, label: '100' }],
      xAxisLabel: 'Strike',
      source: 'desk',
    });
    expect(info).not.toBeNull();
    expect(info!.source).toBe('desk');
    const colors = info!.geo.getAttribute('color').array as Float32Array;
    // vertex (z=0,x=1) is null → alpha 0
    expect(colors[1 * 4 + 3]).toBe(0);
  });
});
