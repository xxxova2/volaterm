import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { PositioningView } from './PositioningView';
import { useTerminalStore } from '../../store/terminalStore';
import { buildSnapshot } from '../../lib/options/synthetic';

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver =
  ResizeObserverStub as unknown as typeof ResizeObserver;

function seedStore(section: string) {
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
    activeTab: 'positioning',
    deskSectionId: section,
    displayMode: 'strike',
    selectedExpiry: null,
    playbackInterval: null,
    refreshInterval: null,
    chainAvailable: true,
    chainUsed: 'yfinance',
    spotSource: 'yfinance',
    historyMode: 'live',
    fmpHistory: null,
    historySource: 'none',
  });
}

describe('PositioningView W2 kit', () => {
  beforeEach(() => {
    seedStore('pos-sub-chain');
  });

  it('Book shows print strip levels and Strike axis title on dealer chart', () => {
    render(<PositioningView />);

    expect(screen.getAllByText('Max pain').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('CR').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('PS').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('HVL').length).toBeGreaterThanOrEqual(1);
    // Axis titles from DeskChartFrame captions and/or Recharts labels
    expect(screen.getAllByText('Strike').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Net GEX/).length).toBeGreaterThanOrEqual(1);
  });

  it('Tools shows dense level prints and parity strip', () => {
    seedStore('pos-sub-tools');
    render(<PositioningView />);

    expect(screen.getByText('Dealer Levels')).toBeTruthy();
    expect(screen.getAllByText('Σ GEX').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Σ DEX').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Pairs')).toBeTruthy();
    expect(screen.getByText('Tradeable')).toBeTruthy();
  });
});
