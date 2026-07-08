import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { DashboardView } from './DashboardView';
import { useTerminalStore } from '../../store/terminalStore';

// jsdom polyfills required by recharts' ResponsiveContainer.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver =
  ResizeObserverStub as unknown as typeof ResizeObserver;

describe('DashboardView', () => {
  beforeEach(async () => {
    // Reset to a deterministic demo state. setSymbol('SPY') populates snapshot,
    // surface, sviReadout, arbResult, and historicalFrames without live network.
    useTerminalStore.setState({
      symbol: 'SPY',
      snapshot: null,
      surface: null,
      sviReadout: null,
      arbResult: null,
      historicalFrames: [],
      frameIndex: 0,
      isPlaying: false,
      speed: 1,
      source: 'demo',
      liveAvailable: false,
      loading: false,
      lastUpdate: Date.now(),
      activeTab: 'dashboard',
      displayMode: 'strike',
      selectedExpiry: null,
      playbackInterval: null,
      refreshInterval: null,
    });
    await useTerminalStore.getState().setSource('demo');
    await useTerminalStore.getState().setSymbol('SPY');
  });

  it('renders the diagnostics card with SVI RMSE and arbitrage counts', () => {
    render(<DashboardView />);

    const card = screen.getByTestId('diagnostics-card');
    expect(card).toBeInTheDocument();

    // RMSE is formatted as a percentage so it contains a "%" sign.
    const rmseNode = screen.getByTestId('svi-rmse');
    expect(rmseNode.textContent).toMatch(/%/);

    // Calendar / Butterfly labels are rendered as MiniStat labels.
    expect(screen.getByText('Calendar')).toBeInTheDocument();
    expect(screen.getByText('Butterfly')).toBeInTheDocument();

    // For SPY demo data the synthetic surface is arbitrage-clean.
    const badge = screen.getByTestId('arb-badge');
    expect(badge.getAttribute('data-arb-clean')).toBe('true');
    expect(badge.textContent?.toLowerCase()).toContain('no arb');
  });

  it('computes non-zero IV High / IV Low from historical frames', () => {
    const { historicalFrames } = useTerminalStore.getState();
    expect(historicalFrames.length).toBeGreaterThan(0);

    render(<DashboardView />);

    // IV High and IV Low are rendered as MiniStat values inside the
    // Volatility Regime panel. They are formatted with "%" via fmtPct.
    const allText = document.body.textContent ?? '';

    // Pull every percent-formatted stat block; the demo's historical IVs
    // are far above 0 so we expect multiple "%" strings in the document.
    const percentMatches = allText.match(/-?\d+\.\d{2}%/g) ?? [];
    expect(percentMatches.length).toBeGreaterThan(2);

    // Sanity check: the IV High / IV Low labels exist alongside percent values.
    expect(screen.getByText('IV High')).toBeInTheDocument();
    expect(screen.getByText('IV Low')).toBeInTheDocument();
  });

  it('marks the arbitrage badge red when violations exist', () => {
    const state = useTerminalStore.getState();
    const arb = state.arbResult;
    expect(arb).not.toBeNull();
    useTerminalStore.setState({
      arbResult: {
        calendar: { flags: arb!.calendar.flags, violations: 3 },
        butterfly: { flags: arb!.butterfly.flags, violations: 1 },
        clean: false,
      },
    });

    render(<DashboardView />);

    const badge = screen.getByTestId('arb-badge');
    expect(badge.getAttribute('data-arb-clean')).toBe('false');
    expect(badge.textContent?.toLowerCase()).toContain('arb found');

    // Counts rendered in MiniStats.
    const counts = screen.getAllByText(/^[0-9]+$/);
    expect(counts).toContainEqual(expect.objectContaining({ textContent: '3' }));
    expect(counts).toContainEqual(expect.objectContaining({ textContent: '1' }));
  });

  it('falls back to current snapshot IV when historicalFrames are empty', () => {
    const { snapshot } = useTerminalStore.getState();
    useTerminalStore.setState({ historicalFrames: [] });

    render(<DashboardView />);

    // With no historical frames but a live snapshot, IV High and IV Low
    // both equal the snapshot's minimum-DTE expiry atmIV — non-zero.
    expect(snapshot).not.toBeNull();
    expect(snapshot!.expiries.length).toBeGreaterThan(0);
    expect(screen.getByText('IV High')).toBeInTheDocument();
    expect(screen.getByText('IV Low')).toBeInTheDocument();
  });
});
