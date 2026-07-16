import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { GridTool } from './GridTool';
import { useTerminalStore } from '../../../store/terminalStore';
import { buildSnapshot } from '../../../lib/options/synthetic';

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

describe('GridTool', () => {
  beforeEach(() => {
    seedStore();
  });

  it('renders kit controls, print strip, and sticky grid header', () => {
    render(<GridTool />);

    expect(screen.getByText('Type')).toBeTruthy();
    expect(screen.getByText('Metric')).toBeTruthy();

    expect(screen.getByText('Strikes')).toBeTruthy();
    expect(screen.getByText('Expiries')).toBeTruthy();
    expect(screen.getByText('Spot')).toBeTruthy();

    expect(screen.getByText('K \\ T')).toBeTruthy();
  });
});
