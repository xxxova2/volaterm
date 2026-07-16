import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { SmileView } from './SmileView';
import { TermView } from './TermView';
import { ArbitrageView } from './ArbitrageView';
import { useTerminalStore } from '../../store/terminalStore';
import { buildSnapshot, buildSurfaceGrid } from '../../lib/options/synthetic';
import { sviReadout } from '../../lib/options/surfaceTools';
import { diagnoseArbitrage } from '../../lib/options/noarb';

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver =
  ResizeObserverStub as unknown as typeof ResizeObserver;

function seedVolStore() {
  const snapshot = buildSnapshot('SPY', Date.now(), 100, 0, 0);
  const surface = buildSurfaceGrid(snapshot);
  useTerminalStore.setState({
    symbol: 'SPY',
    snapshot,
    surface,
    sviReadout: sviReadout(surface, snapshot.spot),
    arbResult: diagnoseArbitrage(surface, snapshot.spot),
    historicalFrames: [],
    frameIndex: 0,
    isPlaying: false,
    speed: 1,
    source: 'demo',
    liveAvailable: false,
    loading: false,
    lastUpdate: Date.now(),
    activeTab: 'vol',
    displayMode: 'strike',
    selectedExpiry: null,
    playbackInterval: null,
    refreshInterval: null,
    fmpHistory: null,
    historySource: 'none',
  });
}

describe('W3 vol secondary kit', () => {
  beforeEach(() => {
    seedVolStore();
  });

  it('Smile shows print strip, X-mode bar, and axis titles', () => {
    render(<SmileView />);

    expect(screen.getByText('Moneyness')).toBeTruthy();
    expect(screen.getAllByText('Strike').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Delta')).toBeTruthy();
    expect(screen.getAllByText('ATM').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('25Δ RR')).toBeTruthy();
    expect(screen.getAllByText(/IV %|Log-m/).length).toBeGreaterThanOrEqual(1);
  });

  it('Term shows print strip stats and DTE / IV axis titles', () => {
    render(<TermView />);

    expect(screen.getByText('Front ATM IV')).toBeTruthy();
    expect(screen.getByText('Term Slope')).toBeTruthy();
    expect(screen.getByText('Back ATM IV')).toBeTruthy();
    expect(screen.getAllByText(/DTE/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/ATM IV/).length).toBeGreaterThanOrEqual(1);
  });

  it('Surface Fit shows mode bar, arb print strip, and Strike/DTE captions', () => {
    render(<ArbitrageView />);

    expect(screen.getByRole('tab', { name: /Butterfly/ })).toBeTruthy();
    expect(screen.getAllByText('SVI RMSE').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Status')).toBeTruthy();
    expect(screen.getAllByText('Strike').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('DTE').length).toBeGreaterThanOrEqual(1);
    expect(document.querySelector('canvas')).toBeTruthy();
  });
});
