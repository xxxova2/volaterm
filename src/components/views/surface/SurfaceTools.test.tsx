import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { SurfaceTools } from './SurfaceTools';
import { useTerminalStore } from '../../../store/terminalStore';
import { buildSnapshot, buildSurfaceGrid } from '../../../lib/options/synthetic';

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver =
  ResizeObserverStub as unknown as typeof ResizeObserver;

function seedStore(overrides: Partial<ReturnType<typeof useTerminalStore.getState>> = {}) {
  const snap = buildSnapshot('SPY', Date.now(), 500, 0, 0);
  useTerminalStore.setState({
    symbol: 'SPY',
    snapshot: snap,
    surface: buildSurfaceGrid(snap),
    sviReadout: null,
    arbResult: null,
    historicalFrames: [],
    frameIndex: 0,
    isPlaying: false,
    speed: 1,
    source: 'live',
    liveAvailable: false,
    loading: false,
    lastUpdate: Date.now(),
    activeTab: 'vol',
    displayMode: 'strike',
    selectedExpiry: null,
    playbackInterval: null,
    refreshInterval: null,
    chainAvailable: false,
    chainUsed: 'none',
    historyMode: 'live',
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

  it('shows Waiting when liveAvailable is false', () => {
    seedStore({ source: 'live', liveAvailable: false });
    render(toolsNode());
    expect(screen.getByTestId('source-badge').textContent).toBe('Waiting');
  });

  it('shows Live when source is live AND liveAvailable is true', () => {
    seedStore({ source: 'live', liveAvailable: true });
    render(toolsNode());
    expect(screen.getByTestId('source-badge').textContent).toBe('Live');
    expect(screen.queryByText('Demo')).not.toBeInTheDocument();
  });

  it('switches badge when feed arrives', () => {
    const { rerender } = render(toolsNode());
    expect(screen.getByTestId('source-badge').textContent).toBe('Waiting');

    act(() => {
      seedStore({ source: 'live', liveAvailable: true });
    });
    rerender(toolsNode());
    expect(screen.getByTestId('source-badge').textContent).toBe('Live');
  });
});
