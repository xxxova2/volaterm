import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { SubjectiveTool } from './SubjectiveTool';
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

describe('SubjectiveTool', () => {
  beforeEach(() => {
    seedStore();
  });

  it('renders kit controls, print strip, and chart axis titles', () => {
    render(<SubjectiveTool />);

    expect(screen.getByText('Expiry')).toBeTruthy();
    expect(screen.getByText('μ')).toBeTruthy();
    expect(screen.getByText('VRP')).toBeTruthy();

    expect(screen.getByText('Avg edge')).toBeTruthy();
    expect(screen.getByText('Cheap')).toBeTruthy();
    expect(screen.getByText('Rich')).toBeTruthy();
    expect(screen.getByText('Best long')).toBeTruthy();

    expect(screen.getByText('Strike')).toBeTruthy();
    expect(screen.getByText('Price ($)')).toBeTruthy();
  });
});
