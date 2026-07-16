import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { BreakEvenTool } from './BreakEvenTool';
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

describe('BreakEvenTool', () => {
  beforeEach(() => {
    seedStore();
  });

  it('renders BBG-first kit: controls, print strip, matrix headers, chart titles', () => {
    render(<BreakEvenTool />);

    expect(screen.getByText('Expiry')).toBeTruthy();
    expect(screen.getAllByText('Type').length).toBeGreaterThanOrEqual(2);

    expect(screen.getByText('Spot')).toBeTruthy();
    expect(screen.getByText('Rows')).toBeTruthy();

    expect(screen.getByText('K')).toBeTruthy();
    expect(screen.getByText('BE')).toBeTruthy();
    expect(screen.getByText('BE dist')).toBeTruthy();
    expect(screen.getByText('N(d2)')).toBeTruthy();
    expect(screen.getByText('IV')).toBeTruthy();

    expect(screen.getByText('Strike')).toBeTruthy();
    expect(screen.getByText('BE dist %')).toBeTruthy();
  });
});

