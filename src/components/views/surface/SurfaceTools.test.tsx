import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { SurfaceTools } from './SurfaceTools';
import { useTerminalStore } from '../../../store/terminalStore';
import { buildSnapshot, buildSurfaceGrid } from '../../../lib/options/synthetic';

// jsdom polyfills required by some libraries pulled in via the tree.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver =
  ResizeObserverStub as unknown as typeof ResizeObserver;

/**
 * Reset the store to a deterministic, fully-populated state without triggering
 * any network calls. `buildSnapshot`/`buildSurfaceGrid` produce synthetic
 * objects with non-empty data so SurfaceTools renders past its empty branches.
 */
function seedStore(
  overrides: Partial<ReturnType<typeof useTerminalStore.getState>> = {},
) {
  const snapshot = buildSnapshot('SPY', Date.now(), 100, 0, 0);
  const surface = buildSurfaceGrid(snapshot);
  useTerminalStore.setState({
    symbol: 'SPY',
    snapshot,
    surface,
    sviReadout: null,
    arbResult: null,
    historicalFrames: [],
    frameIndex: 0,
    isPlaying: false,
    speed: 1,
    source: 'demo',
    liveAvailable: false,
    loading: false,
    lastUpdate: Date.now(),
    activeTab: 'vol',
    displayMode: 'strike',
    selectedExpiry: null,
    playbackInterval: null,
    refreshInterval: null,
    ...overrides,
  });
}

function toolsNode() {
  return (
    <SurfaceTools
      surface={null}
      sviReadout={null}
      arbResult={null}
      sliceMode="none"
      onSliceMode={() => {}}
      selectedExpiry={null}
      selectedStrike={null}
    />
  );
}

describe('SurfaceTools source badge', () => {
  beforeEach(() => {
    seedStore();
  });

  it('shows "Demo" when source is demo and liveAvailable is false', () => {
    seedStore({ source: 'demo', liveAvailable: false });
    render(toolsNode());

    const badge = screen.getByTestId('source-badge');
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).toBe('Demo');
  });

  it('still shows "Demo" when source is demo but liveAvailable is true', () => {
    seedStore({ source: 'demo', liveAvailable: true });
    render(toolsNode());

    expect(screen.getByTestId('source-badge').textContent).toBe('Demo');
  });

  it('shows "Demo" when source is live but liveAvailable is false (not yet connected)', () => {
    seedStore({ source: 'live', liveAvailable: false });
    render(toolsNode());

    expect(screen.getByTestId('source-badge').textContent).toBe('Demo');
  });

  it('shows "Live" only when source is live AND liveAvailable is true', () => {
    seedStore({ source: 'live', liveAvailable: true });
    render(toolsNode());

    const badge = screen.getByTestId('source-badge');
    expect(badge.textContent).toBe('Live');
    expect(screen.queryByText('Demo')).not.toBeInTheDocument();
  });

  it('switches the badge label when the store source/liveAvailable change', () => {
    const { rerender } = render(toolsNode());

    // Initial: demo + not live-available.
    expect(screen.getByTestId('source-badge').textContent).toBe('Demo');

    // Flip to live but not yet connected -> still Demo.
    act(() => {
      seedStore({ source: 'live', liveAvailable: false });
    });
    rerender(toolsNode());
    expect(screen.getByTestId('source-badge').textContent).toBe('Demo');

    // Live snapshot arrives -> Live.
    act(() => {
      seedStore({ source: 'live', liveAvailable: true });
    });
    rerender(toolsNode());
    expect(screen.getByTestId('source-badge').textContent).toBe('Live');

    // Network error -> falls back to demo + still labelled Demo.
    act(() => {
      seedStore({ source: 'demo', liveAvailable: false });
    });
    rerender(toolsNode());
    expect(screen.getByTestId('source-badge').textContent).toBe('Demo');
  });
});
