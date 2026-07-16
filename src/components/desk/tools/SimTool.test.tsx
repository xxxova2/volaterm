import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { SimTool } from './SimTool';
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

describe('SimTool', () => {
  beforeEach(() => {
    seedStore();
  });

  it('renders kit controls, print strip, and chart axis titles', () => {
    render(<SimTool />);

    expect(screen.getByText('Structure')).toBeTruthy();
    expect(screen.getByText('Drift μ')).toBeTruthy();
    expect(screen.getByText('Realized σ')).toBeTruthy();
    expect(screen.getByText('Horizon d')).toBeTruthy();

    expect(screen.getByText('E[PnL]')).toBeTruthy();
    expect(screen.getByText('Win')).toBeTruthy();
    expect(screen.getByText('p5 term')).toBeTruthy();
    expect(screen.getByText('p95 term')).toBeTruthy();

    expect(screen.getByText('Horizon (days)')).toBeTruthy();
    expect(screen.getByText('PnL ($)')).toBeTruthy();
  });
});
