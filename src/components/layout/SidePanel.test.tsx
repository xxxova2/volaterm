import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { SidePanel } from './SidePanel';
import { useTerminalStore } from '../../store/terminalStore';
import { buildSnapshot } from '../../lib/options/synthetic';

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver =
  ResizeObserverStub as unknown as typeof ResizeObserver;

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
    spotSource: 'none',
    historyMode: 'live',
    ...overrides,
  });
}

describe('SidePanel source badge', () => {
  beforeEach(() => {
    seedStore();
  });

  it('shows Waiting when live feed not yet connected', () => {
    seedStore({ liveAvailable: false, chainAvailable: false });
    render(<SidePanel />);
    expect(screen.getByTestId('source-badge').textContent).toMatch(/Waiting/);
  });

  it('shows Live when chain is available', () => {
    seedStore({ source: 'live', liveAvailable: true, chainAvailable: true, chainUsed: 'yfinance' });
    render(<SidePanel />);
    const badge = screen.getByTestId('source-badge');
    expect(badge.textContent).toMatch(/Live/);
    expect(screen.queryByText('Demo')).not.toBeInTheDocument();
  });

  it('switches badge when feed arrives', () => {
    const { rerender } = render(<SidePanel />);
    expect(screen.getByTestId('source-badge').textContent).toMatch(/Waiting/);

    act(() => {
      seedStore({ liveAvailable: true, chainAvailable: true, chainUsed: 'yfinance' });
    });
    rerender(<SidePanel />);
    expect(screen.getByTestId('source-badge').textContent).toMatch(/Live/);
  });
});
