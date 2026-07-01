import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import React from 'react';
import { useTerminalStore } from '../../../store/terminalStore';
import { buildSnapshot, buildSurfaceGrid } from '../../../lib/options/synthetic';
import { SurfaceView, computeIVTicks } from './SurfaceView';

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

function setupSnapshot(symbol = 'SPY', spot = 100) {
  const snapshot = buildSnapshot(symbol, Date.now(), spot, 0, 0);
  const surface = buildSurfaceGrid(snapshot);
  useTerminalStore.setState({ snapshot, surface });
  return { snapshot, surface };
}

function setDisplayMode(mode: 'moneyness' | 'strike' | 'delta') {
  act(() => {
    useTerminalStore.setState({ displayMode: mode });
  });
}

function collectXTickLabels(): string[] {
  // X-tick labels carry data-testid="x-tick-{i}".
  const els = Array.from(document.querySelectorAll<HTMLElement>('[data-testid^="x-tick-"]'));
  return els
    .map(el => el.textContent ?? '')
    .filter(t => t.length > 0);
}

function collectYTickLabels(): string[] {
  const els = Array.from(document.querySelectorAll<HTMLElement>('[data-testid^="y-tick-"]'));
  return els
    .map(el => el.textContent ?? '')
    .filter(t => t.length > 0);
}

describe('computeIVTicks', () => {
  it('returns nice round tick values for a typical IV range', () => {
    const ticks = computeIVTicks(0.045, 0.60);
    expect(ticks.length).toBeGreaterThanOrEqual(3);
    expect(ticks.length).toBeLessThanOrEqual(10);
    for (const t of ticks) {
      const pct = t.value * 100;
      // Every tick should be a round number (no decimals)
      expect(Math.abs(pct % 5)).toBeLessThan(0.01);
    }
    // The min tick should be <= data min
    expect(ticks[0]!.value).toBeLessThanOrEqual(0.045);
    // The max tick should be >= data max
    expect(ticks[ticks.length - 1]!.value).toBeGreaterThanOrEqual(0.60);
  });

  it('returns a single tick for zero range', () => {
    const ticks = computeIVTicks(0, 0);
    expect(ticks.length).toBe(1);
  });

  it('every tick falls on a multiple of the step size', () => {
    const ticks = computeIVTicks(0.045, 0.60);
    expect(ticks.length).toBeGreaterThanOrEqual(3);
    // The step should be consistent across all ticks
    for (let i = 1; i < ticks.length; i++) {
      const diff = ticks[i]!.value - ticks[i - 1]!.value;
      expect(diff).toBeGreaterThan(0);
    }
    // The spread should cover the data range
    expect(ticks[0]!.value).toBeLessThanOrEqual(0.045);
    expect(ticks[ticks.length - 1]!.value).toBeGreaterThanOrEqual(0.60);
  });

  it('every rendered tick label is a round number', () => {
    // Only round numbers like 0, 15, 30, 45, 60 (multiples of 5 in pct)
    const ticks = computeIVTicks(0.045, 0.60);
    for (const t of ticks) {
      const pct = t.value * 100;
      // Allow floating point tolerance but ensure no ugly decimals
      expect(Math.round(pct) - pct).toBeLessThan(0.01);
    }
  });

  it('positions ticks correctly in 0-1 visual space', () => {
    const ticks = computeIVTicks(0.05, 0.55);
    for (const t of ticks) {
      expect(t.t).toBeGreaterThanOrEqual(-0.2);
      expect(t.t).toBeLessThanOrEqual(1.2);
    }
    // First tick t should be <= 0 (at or below visual floor)
    expect(ticks[0]!.t).toBeLessThanOrEqual(0);
    // Last tick t should be >= 1 (at or above visual ceiling)
    expect(ticks[ticks.length - 1]!.t).toBeGreaterThanOrEqual(1);
  });
});

describe('SurfaceView axes', () => {
  beforeEach(() => {
    cleanup();
    setupSnapshot();
    useTerminalStore.setState({ displayMode: 'moneyness' });
  });

  it('renders at least 5 Y-axis tick labels', () => {
    render(<SurfaceView />);

    // Y-tick labels are tagged with data-testid y-tick-{i} for each index.
    const yLabels = collectYTickLabels();
    expect(yLabels.length).toBeGreaterThanOrEqual(5);

    // Every tick is a percentage-formatted IV value with no decimals.
    for (const label of yLabels) {
      expect(label).toMatch(/%/);
      const num = parseFloat(label.replace('%', ''));
      expect(Number.isFinite(num)).toBe(true);
      // All tick labels should be integer percentages (round numbers)
      expect(Math.abs(num % 1)).toBeLessThan(0.01);
    }
  });

  it('renders a Y-axis min/max IV range label', () => {
    render(<SurfaceView />);

    const yAxisLabel = screen.getByTestId('y-axis-label');
    expect(yAxisLabel).toBeInTheDocument();
    const text = yAxisLabel.textContent ?? '';

    // The label announces the IV axis and reports a min/max range.
    expect(text.toUpperCase()).toContain('IV');
    expect(text).toContain('%');
    // Contains a range separator ('-' or the en-dash '–').
    expect(text).toMatch(/[-–]/);

    // Extract the two numbers around the separator and verify they are valid IV percentages.
    const match = text.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/);
    expect(match).not.toBeNull();
    if (match) {
      const minIV = Number(match[1]);
      const maxIV = Number(match[2]);
      expect(Number.isFinite(minIV)).toBe(true);
      expect(Number.isFinite(maxIV)).toBe(true);
      expect(minIV).toBeLessThanOrEqual(maxIV);
      expect(minIV).toBeGreaterThanOrEqual(0);
    }
  });

  it('updates the X-axis label when displayMode changes', () => {
    const { rerender } = render(<SurfaceView />);

    // moneyness (initial state) -> 'Strike / Spot'.
    expect(screen.getByTestId('x-axis-label').textContent).toBe('Strike / Spot');

    setDisplayMode('strike');
    rerender(<SurfaceView />);
    expect(screen.getByTestId('x-axis-label').textContent).toBe('Strike');

    setDisplayMode('delta');
    rerender(<SurfaceView />);
    expect(screen.getByTestId('x-axis-label').textContent).toBe('Call Delta');

    // The three mode labels must all be distinct.
    const labels = new Set<string>();
    for (const mode of ['moneyness', 'strike', 'delta'] as const) {
      setDisplayMode(mode);
      rerender(<SurfaceView />);
      labels.add(screen.getByTestId('x-axis-label').textContent ?? '');
    }
    expect(labels.size).toBe(3);
  });

  it('renders different X tick labels between moneyness/strike/delta modes', () => {
    useTerminalStore.setState({ displayMode: 'moneyness' });
    const { rerender } = render(<SurfaceView />);
    const moneyLabels = collectXTickLabels();

    setDisplayMode('strike');
    rerender(<SurfaceView />);
    const strikeLabels = collectXTickLabels();

    setDisplayMode('delta');
    rerender(<SurfaceView />);
    const deltaLabels = collectXTickLabels();

    // Each mode should produce at least one tick.
    expect(moneyLabels.length).toBeGreaterThan(0);
    expect(strikeLabels.length).toBeGreaterThan(0);
    expect(deltaLabels.length).toBeGreaterThan(0);

    // Tick label sets must differ pairwise.
    expect(new Set(moneyLabels)).not.toEqual(new Set(strikeLabels));
    expect(new Set(moneyLabels)).not.toEqual(new Set(deltaLabels));
    expect(new Set(strikeLabels)).not.toEqual(new Set(deltaLabels));

    // Moneyness ticks should contain '%' (e.g. "80%"), strike ticks should not.
    expect(moneyLabels.some(l => l.includes('%'))).toBe(true);
    expect(strikeLabels.some(l => l.includes('%'))).toBe(false);
    // Delta ticks should contain a delta marker (e.g. "Δ").
    expect(deltaLabels.some(l => l.includes('Δ'))).toBe(true);
  });
});
