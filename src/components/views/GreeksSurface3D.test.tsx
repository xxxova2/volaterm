import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, renderHook, screen, fireEvent, cleanup, act } from '@testing-library/react';
import React from 'react';
import * as THREE from 'three';
import { useTerminalStore } from '../../store/terminalStore';
import { buildSnapshot } from '../../lib/options/synthetic';
import { GreeksSurface3D } from './GreeksSurface3D';
import { useGreekSurfaceGeometry } from './useGreekSurfaceGeometry';
import type { GreekKey } from './greeksTypes';

// jsdom polyfills required by @react-three/fiber / Recharts fallbacks.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver =
  ResizeObserverStub as unknown as typeof ResizeObserver;

// Mock WebGL-dependent libraries. jsdom has no WebGL context; @react-three/fiber
// would otherwise try to create one on Canvas mount. We replace Canvas with a
// pass-through div and the drei helpers with simple React equivalents.
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="r3f-canvas">{children}</div>
  ),
}));

vi.mock('@react-three/drei', () => ({
  OrbitControls: () => null,
  Html: ({ children }: { children?: React.ReactNode }) => (
    <span data-testid="r3f-html">{children}</span>
  ),
}));

describe('useGreekSurfaceGeometry hook', () => {
  beforeEach(() => {
    cleanup();
    useTerminalStore.setState({
      snapshot: buildSnapshot('SPY', Date.now(), 100, 0, 0),
    });
  });

  it('returns a geometry with non-zero vertex count for gamma', () => {
    const { result } = renderHook(() => useGreekSurfaceGeometry('gamma'));
    const info = result.current;
    expect(info).not.toBeNull();
    expect(info!.geo).toBeInstanceOf(THREE.BufferGeometry);

    const positions = info!.geo.getAttribute('position') as THREE.BufferAttribute;
    expect(positions.count).toBeGreaterThan(0);

    const indices = info!.geo.getIndex();
    expect(indices).not.toBeNull();
    expect(indices!.count).toBeGreaterThan(0);

    // Normals should have been computed.
    const normals = info!.geo.getAttribute('normal') as THREE.BufferAttribute;
    expect(normals).toBeTruthy();
    expect(normals.count).toBe(positions.count);
  });

  it('produces finite vertex positions and colors', () => {
    const { result } = renderHook(() => useGreekSurfaceGeometry('gamma'));
    const info = result.current!;
    const positions = info!.geo.getAttribute('position').array as Float32Array;
    const colors = info!.geo.getAttribute('color').array as Float32Array;

    for (let i = 0; i < positions.length; i++) {
      expect(Number.isFinite(positions[i]!)).toBe(true);
    }
    for (let i = 0; i < colors.length; i++) {
      expect(Number.isFinite(colors[i]!)).toBe(true);
    }

    // Vertex Y values should fall within [-eps, VISUAL_HEIGHT].
    for (let i = 0; i < positions.length; i += 3) {
      const y = positions[i + 1]!;
      expect(y).toBeGreaterThanOrEqual(-1e-6);
      expect(y).toBeLessThanOrEqual(1.7 + 1e-6);
    }

    // Alpha component is either 0 (no quote) or 1 (finite value).
    for (let i = 3; i < colors.length; i += 4) {
      const a = colors[i]!;
      expect(a === 0 || a === 1).toBe(true);
    }
  });

  it('reports minV <= maxV and excludes null strikes from the range', () => {
    const { result } = renderHook(() => useGreekSurfaceGeometry('gamma'));
    const info = result.current!;
    expect(Number.isFinite(info.minV)).toBe(true);
    expect(Number.isFinite(info.maxV)).toBe(true);
    expect(info.minV).toBeLessThanOrEqual(info.maxV);

    // Some gamma values must be > 0 for an SPY-like snapshot, so the range
    // must be strictly positive (the geometry would otherwise collapse).
    expect(info.maxV).toBeGreaterThan(0);
  });

  it('returns null when no snapshot is available', () => {
    useTerminalStore.setState({ snapshot: null });
    const { result } = renderHook(() => useGreekSurfaceGeometry('gamma'));
    expect(result.current).toBeNull();
  });

  it('produces a different range per Greek key', () => {
    const { result: deltaResult } = renderHook(() => useGreekSurfaceGeometry('delta'));
    const { result: gammaResult } = renderHook(() => useGreekSurfaceGeometry('gamma'));

    // Delta and gamma live on different scales (delta in [0, 1] for calls;
    // gamma small positive), so the (min, max) tuples must differ.
    expect(deltaResult.current).not.toBeNull();
    expect(gammaResult.current).not.toBeNull();
    const deltaKey = `${deltaResult.current!.minV},${deltaResult.current!.maxV}`;
    const gammaKey = `${gammaResult.current!.minV},${gammaResult.current!.maxV}`;
    expect(deltaKey).not.toBe(gammaKey);
    expect(gammaResult.current!.minV).toBeGreaterThanOrEqual(0);
  });

  it('mapPointToCell inverts the X/Z transforms', () => {
    const { result } = renderHook(() => useGreekSurfaceGeometry('gamma'));
    const info = result.current!;

    const nX = info.strikes.length;
    const nZ = info.dtes.length;

    // The geometry maps each strike to a per-strike world X coordinate
    // (strikeXs[i]) and expiry index z -> pz = z/(nZ-1)*DEPTH - DEPTH/2.
    // Round-trip those.
    for (const [x, z] of [
      [0, 0],
      [Math.floor(nX / 2), Math.floor(nZ / 2)],
      [nX - 1, nZ - 1],
    ] as const) {
      const px = info.strikeXs[x]!;
      const pz = nZ === 1 ? 0 : (z / (nZ - 1)) * 3.2 - 1.6;
      const cell = info.mapPointToCell(px, pz);
      expect(cell).not.toBeNull();
      expect(cell!.expiryIdx).toBe(z);
      expect(cell!.strikeIdx).toBe(x);
    }

    // Out-of-range Z should still return null (X uses closest-strike).
    expect(info.mapPointToCell(0, 100)).toBeNull();
    expect(info.mapPointToCell(0, -100)).toBeNull();
  });
});

describe('GreeksSurface3D component', () => {
  beforeEach(() => {
    cleanup();
    useTerminalStore.setState({
      snapshot: buildSnapshot('SPY', Date.now(), 100, 0, 0),
    });
  });

  it('renders without crashing and shows the wireframe toggle', () => {
    render(<GreeksSurface3D />);

    // The mocked Canvas must be in the tree.
    expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();

    // The wireframe toggle is present and starts in 'Wireframe' (solid off).
    const toggle = screen.getByTestId('wireframe-toggle');
    expect(toggle).toBeInTheDocument();
    expect(toggle.textContent).toBe('Wireframe');
  });

  it('toggles the wireframe button label and state', () => {
    render(<GreeksSurface3D />);
    const toggle = screen.getByTestId('wireframe-toggle');

    // Initial state: wireframe off -> label "Wireframe".
    expect(toggle.textContent).toBe('Wireframe');

    fireEvent.click(toggle);
    expect(toggle.textContent).toBe('Solid');

    fireEvent.click(toggle);
    expect(toggle.textContent).toBe('Wireframe');
  });

  it('renders all 13 Greek selector buttons', () => {
    const { container } = render(<GreeksSurface3D />);
    const greekButtons = Array.from(
      container.querySelectorAll<HTMLButtonElement>('button[data-greek-button]'),
    );
    expect(greekButtons.length).toBe(13);
    const keys = greekButtons
      .map(b => b.getAttribute('data-greek-button'))
      .filter((k): k is GreekKey => k != null);
    expect(new Set(keys).size).toBe(13);
    expect(keys).toContain('gamma');
    expect(keys).toContain('delta');
  });

  it('switching the Greek selector updates the highlighted button', () => {
    const { container } = render(<GreeksSurface3D />);
    const deltaBtn = container.querySelector<HTMLButtonElement>(
      'button[data-greek-button="delta"]',
    );
    expect(deltaBtn).toBeTruthy();
    fireEvent.click(deltaBtn!);
    // After clicking delta, the delta button should have the "active" classes
    // (bg-secondary text-foreground ring-1 ring-border).
    expect(deltaBtn!.className).toContain('text-foreground');
  });

  it('shows a placeholder when no snapshot is available', () => {
    useTerminalStore.setState({ snapshot: null });
    render(<GreeksSurface3D />);
    expect(screen.getByText('No surface for 3D mesh')).toBeInTheDocument();
    expect(screen.getByText(/MacroVol greeks or a LIVE chain/i)).toBeInTheDocument();
    expect(screen.queryByText(/LIVE or demo/i)).toBeNull();
  });
});

describe('GreeksSurface3D axes (displayMode)', () => {
  beforeEach(() => {
    cleanup();
    useTerminalStore.setState({
      snapshot: buildSnapshot('SPY', Date.now(), 100, 0, 0),
      displayMode: 'moneyness',
    });
  });

  function setDisplayMode(mode: 'moneyness' | 'strike' | 'delta') {
    act(() => {
      useTerminalStore.setState({ displayMode: mode });
    });
  }

  function collectXTickLabels(): string[] {
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-testid^="x-tick-"]'));
    return els.map(el => el.textContent ?? '').filter(t => t.length > 0);
  }

  it('renders at least 5 Y-axis tick labels plus a min/max range label', () => {
    render(<GreeksSurface3D />);

    // 5 Y ticks at t in [0, 0.25, 0.5, 0.75, 1].
    const yTickTestIds = ['y-tick-0', 'y-tick-0.25', 'y-tick-0.5', 'y-tick-0.75', 'y-tick-1'];
    for (const tid of yTickTestIds) {
      expect(screen.getByTestId(tid)).toBeInTheDocument();
    }

    // Collect every Y-tick label and verify we have at least 5.
    const yTickEls = Array.from(document.querySelectorAll<HTMLElement>('[data-testid^="y-tick-"]'));
    const yTickTexts = yTickEls.map(el => el.textContent ?? '');
    expect(yTickTexts.length).toBeGreaterThanOrEqual(5);

    // Every Y tick is in exponential notation (e.g. "1.23e-2").
    const exponentialRe = /^[+-]?\d+\.\d+e[+-]?\d+$/;
    for (const label of yTickTexts) {
      expect(label.trim()).toMatch(exponentialRe);
    }

    // Y tick values are monotonically non-decreasing from y-tick-0 to y-tick-1.
    const tickValues: number[] = [];
    for (const tid of yTickTestIds) {
      const raw = screen.getByTestId(tid).textContent ?? '';
      tickValues.push(Number(raw));
    }
    for (let i = 1; i < tickValues.length; i++) {
      expect(tickValues[i]).toBeGreaterThanOrEqual(tickValues[i - 1]!);
    }

    // Y-axis label carries the Greek name plus a min–max range.
    const yLabel = screen.getByTestId('y-axis-label');
    expect(yLabel).toBeInTheDocument();
    const yLabelText = yLabel.textContent ?? '';
    expect(yLabelText).toMatch(/[A-Za-z]+\s+\d+\.\d+e[+-]?\d+[–-]\d+\.\d+e[+-]?\d+/);

    // The Greek name (e.g. "Gamma") appears at the start of the label.
    // Default greek for the component is 'gamma'.
    expect(yLabelText.startsWith('Gamma')).toBe(true);

    // Extract the two numbers around the dash and verify they bracket the y-tick-0/y-tick-1 values.
    const rangeMatch = yLabelText.match(/(\d+\.\d+e[+-]?\d+)\s*[–-]\s*(\d+\.\d+e[+-]?\d+)/);
    expect(rangeMatch).not.toBeNull();
    if (rangeMatch) {
      const minFromLabel = Number(rangeMatch[1]);
      const maxFromLabel = Number(rangeMatch[2]);
      expect(minFromLabel).toBe(tickValues[0]);
      expect(maxFromLabel).toBe(tickValues[tickValues.length - 1]);
      expect(minFromLabel).toBeLessThanOrEqual(maxFromLabel);
    }
  });

  it('updates the X-axis label when displayMode changes', () => {
    const { rerender } = render(<GreeksSurface3D />);

    // Initial state is moneyness (set in beforeEach).
    expect(screen.getByTestId('x-axis-label').textContent).toBe('Strike / Spot');

    setDisplayMode('strike');
    rerender(<GreeksSurface3D />);
    expect(screen.getByTestId('x-axis-label').textContent).toBe('Strike');

    setDisplayMode('delta');
    rerender(<GreeksSurface3D />);
    expect(screen.getByTestId('x-axis-label').textContent).toBe('Call Delta');

    // All three mode labels must be distinct.
    const observedLabels = new Set<string>();
    for (const mode of ['moneyness', 'strike', 'delta'] as const) {
      setDisplayMode(mode);
      rerender(<GreeksSurface3D />);
      observedLabels.add(screen.getByTestId('x-axis-label').textContent ?? '');
    }
    expect(observedLabels.size).toBe(3);
    expect(observedLabels).toEqual(new Set(['Strike / Spot', 'Strike', 'Call Delta']));
  });

  it('renders different X tick labels between moneyness/strike/delta modes', () => {
    useTerminalStore.setState({ displayMode: 'moneyness' });
    const { rerender } = render(<GreeksSurface3D />);
    const moneyLabels = collectXTickLabels();

    setDisplayMode('strike');
    rerender(<GreeksSurface3D />);
    const strikeLabels = collectXTickLabels();

    setDisplayMode('delta');
    rerender(<GreeksSurface3D />);
    const deltaLabels = collectXTickLabels();

    // Each mode should produce at least one tick.
    expect(moneyLabels.length).toBeGreaterThan(0);
    expect(strikeLabels.length).toBeGreaterThan(0);
    expect(deltaLabels.length).toBeGreaterThan(0);

    // Tick label sets must differ pairwise.
    expect(new Set(moneyLabels)).not.toEqual(new Set(strikeLabels));
    expect(new Set(moneyLabels)).not.toEqual(new Set(deltaLabels));
    expect(new Set(strikeLabels)).not.toEqual(new Set(deltaLabels));

    // Moneyness ticks are percentage labels (e.g. "80%"), contain no "Δ".
    for (const label of moneyLabels) {
      expect(label).toMatch(/^\d+%$/);
      expect(label.includes('Δ')).toBe(false);
    }

    // Strike ticks are numeric strings (no '%', no 'Δ'). Formatted via
    // fmtPrice(k, 0) -> e.g. "100".
    for (const label of strikeLabels) {
      expect(label.includes('%')).toBe(false);
      expect(label.includes('Δ')).toBe(false);
      expect(label).toMatch(/^\d+$/);
    }

    // Delta ticks end with the delta marker (e.g. "30Δ") and contain no '%'.
    for (const label of deltaLabels) {
      expect(label).toMatch(/^\d+Δ$/);
      expect(label.includes('%')).toBe(false);
    }
  });
});
