import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { BasisTool } from './BasisTool';
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
    fundingAnn: null,
  });
}

describe('BasisTool', () => {
  beforeEach(() => {
    seedStore();
  });

  it('renders print strip and dual-axis basis chart titles', () => {
    render(<BasisTool />);

    expect(screen.getByText('Spot')).toBeTruthy();
    expect(screen.getByText('r')).toBeTruthy();
    expect(screen.getByText('q_eff')).toBeTruthy();
    expect(screen.getByText('Front basis')).toBeTruthy();
    expect(screen.getByText('Marks')).toBeTruthy();

    expect(screen.getByText('Time (DTE)')).toBeTruthy();
    expect(screen.getByText('Basis % · Ann. carry %')).toBeTruthy();
  });
});
