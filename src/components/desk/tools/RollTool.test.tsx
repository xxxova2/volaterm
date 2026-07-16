import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { RollTool } from './RollTool';
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
    fundingAnn: null,
  });
}

describe('RollTool', () => {
  beforeEach(() => {
    seedStore();
  });

  it('renders print strip, axis header labels, and heatmap axes', () => {
    render(<RollTool />);

    expect(screen.getByText('Carry ann')).toBeTruthy();
    expect(screen.getByText('Notional')).toBeTruthy();
    expect(screen.getByText('Source')).toBeTruthy();

    expect(screen.getByText('spot shock %')).toBeTruthy();
    expect(screen.getByText('hold horizon (days)')).toBeTruthy();
    expect(screen.getByText('Shock % \\ Days')).toBeTruthy();
    expect(screen.getByText('7d')).toBeTruthy();
    expect(screen.getByText('30d')).toBeTruthy();
  });
});
