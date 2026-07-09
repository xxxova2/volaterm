import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { SidePanel } from './SidePanel';
import { useTerminalStore } from '../../store/terminalStore';
import { buildSnapshot } from '../../lib/options/synthetic';

// jsdom polyfills required by some libraries pulled in via the layout tree.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver =
  ResizeObserverStub as unknown as typeof ResizeObserver;

/**
 * Reset the store to a deterministic, fully-populated demo state without
 * triggering any network calls. `buildSnapshot` produces a synthetic snapshot
 * with a non-empty `expiries` array so the SidePanel renders past the
 * loading branch.
 */
function seedStore(overrides: Partial<ReturnType<typeof useTerminalStore.getState>> = {}) {
  useTerminalStore.setState({
    symbol: 'SPY',
    snapshot: buildSnapshot('SPY', Date.now(), 100, 0, 0),
    surface: null,
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
    activeTab: 'home',
    displayMode: 'strike',
    selectedExpiry: null,
    playbackInterval: null,
    refreshInterval: null,
    ...overrides,
  });
}

describe('SidePanel source badge', () => {
  beforeEach(() => {
    seedStore();
  });

  it('shows "Demo" when source is demo regardless of liveAvailable', () => {
    seedStore({ source: 'demo', liveAvailable: false });
    render(<SidePanel />);

    const badge = screen.getByTestId('source-badge');
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).toBe('Demo');
    expect(screen.queryByText('Synthetic')).not.toBeInTheDocument();
  });

  it('still shows "Demo" when source is demo but liveAvailable is true', () => {
    seedStore({ source: 'demo', liveAvailable: true });
    render(<SidePanel />);

    expect(screen.getByTestId('source-badge').textContent).toBe('Demo');
  });

  it('shows "Demo" when source is live but liveAvailable is false (not yet connected)', () => {
    seedStore({ source: 'live', liveAvailable: false });
    render(<SidePanel />);

    expect(screen.getByTestId('source-badge').textContent).toBe('Demo');
  });

  it('shows "Live" only when source is live AND liveAvailable is true', () => {
    seedStore({ source: 'live', liveAvailable: true });
    render(<SidePanel />);

    const badge = screen.getByTestId('source-badge');
    expect(badge.textContent).toBe('Live');
    expect(screen.queryByText('Demo')).not.toBeInTheDocument();
    expect(screen.queryByText('Synthetic')).not.toBeInTheDocument();
  });

  it('switches the badge label when the store source/liveAvailable change', () => {
    const { rerender } = render(<SidePanel />);

    // Initial: demo + not live-available.
    expect(screen.getByTestId('source-badge').textContent).toBe('Demo');

    // Flip to live but not yet connected -> still Demo.
    act(() => {
      seedStore({ source: 'live', liveAvailable: false });
    });
    rerender(<SidePanel />);
    expect(screen.getByTestId('source-badge').textContent).toBe('Demo');

    // Live snapshot arrives -> Live.
    act(() => {
      seedStore({ source: 'live', liveAvailable: true });
    });
    rerender(<SidePanel />);
    expect(screen.getByTestId('source-badge').textContent).toBe('Live');

    // Network error -> falls back to demo + still labelled Demo.
    act(() => {
      seedStore({ source: 'demo', liveAvailable: false });
    });
    rerender(<SidePanel />);
    expect(screen.getByTestId('source-badge').textContent).toBe('Demo');
  });
});
