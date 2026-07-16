import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { DFollowTool } from './DFollowTool';
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
  });
}

describe('DFollowTool', () => {
  beforeEach(() => {
    seedStore();
  });

  it('renders kit controls, print strip, and dual-Y chart titles', () => {
    render(<DFollowTool />);

    expect(screen.getByText('Band')).toBeTruthy();
    expect(screen.getByText('Option qty')).toBeTruthy();
    expect(screen.getByText('Realized σ')).toBeTruthy();

    expect(screen.getByText('Terminal PnL')).toBeTruthy();
    expect(screen.getByText('Trades')).toBeTruthy();
    expect(screen.getByText('Max DD')).toBeTruthy();
    expect(screen.getByText('Avg |Δ|')).toBeTruthy();

    expect(screen.getByText('Day')).toBeTruthy();
    expect(screen.getByText('PnL ($) · Net Δ')).toBeTruthy();
  });
});
