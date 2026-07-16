import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { StraddleTool } from './StraddleTool';
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

describe('StraddleTool', () => {
  beforeEach(() => {
    seedStore();
  });

  it('renders kit controls, print strip, and BE chart axis titles', () => {
    render(<StraddleTool />);

    expect(screen.getByText('Mode')).toBeTruthy();
    expect(screen.getByText('Side')).toBeTruthy();
    expect(screen.getByText('Expiry')).toBeTruthy();

    expect(screen.getByText('K')).toBeTruthy();
    expect(screen.getByText('Premium')).toBeTruthy();
    expect(screen.getByText('BE lo')).toBeTruthy();
    expect(screen.getByText('BE hi')).toBeTruthy();
    expect(screen.getByText('Mark Δ')).toBeTruthy();

    expect(screen.getByText('Spot')).toBeTruthy();
    expect(screen.getByText('PnL ($)')).toBeTruthy();
  });
});
