import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ComboPnlTool } from './ComboPnlTool';
import { useTerminalStore } from '../../../store/terminalStore';
import { buildSnapshot } from '../../../lib/options/synthetic';

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver =
  ResizeObserverStub as unknown as typeof ResizeObserver;

function seedStore() {
  useTerminalStore.setState({
    symbol: 'SPY',
    snapshot: buildSnapshot('SPY', Date.now(), 500, 0, 0),
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
    fmpHistory: null,
    historySource: 'none',
  });
}

describe('ComboPnlTool', () => {
  beforeEach(() => {
    seedStore();
  });

  it('renders kit controls, print strip, and history axis titles', () => {
    render(<ComboPnlTool />);

    expect(screen.getByText('Structure')).toBeTruthy();
    expect(screen.getByText('Expiry')).toBeTruthy();

    expect(screen.getByText('Term PnL')).toBeTruthy();
    expect(screen.getByText('Σ Δ')).toBeTruthy();
    expect(screen.getByText('Σ Γ')).toBeTruthy();
    expect(screen.getByText('Σ Θ')).toBeTruthy();
    expect(screen.getByText('Path')).toBeTruthy();

    expect(screen.getByText('Date')).toBeTruthy();
    expect(screen.getByText('PnL ($)')).toBeTruthy();
  });
});
