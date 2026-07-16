import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ComboGreeksTool } from './ComboGreeksTool';
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

describe('ComboGreeksTool', () => {
  beforeEach(() => {
    seedStore();
  });

  it('renders kit controls, print strip, and dual chart titles', () => {
    render(<ComboGreeksTool />);

    expect(screen.getByText('Template')).toBeTruthy();
    expect(screen.getByText('Expiry')).toBeTruthy();

    expect(screen.getByText('Mark')).toBeTruthy();
    expect(screen.getByText('PnL')).toBeTruthy();
    expect(screen.getByText('Δ')).toBeTruthy();
    expect(screen.getByText('Γ')).toBeTruthy();
    expect(screen.getByText('ν')).toBeTruthy();
    expect(screen.getByText('Θ')).toBeTruthy();
    expect(screen.getByText('BEs')).toBeTruthy();

    expect(screen.getAllByText('Spot').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('PnL ($)')).toBeTruthy();
    expect(screen.getByText('Greeks')).toBeTruthy();
  });
});
