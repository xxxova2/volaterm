import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DashboardView } from './DashboardView';
import { useTerminalStore } from '../../store/terminalStore';
import { buildSnapshot, buildSurfaceGrid } from '../../lib/options/synthetic';
import { sviReadout } from '../../lib/options/surfaceTools';
import { diagnoseArbitrage } from '../../lib/options/noarb';
import { pushLiveFrame } from '../../lib/options/liveHistory';

// jsdom polyfills required by recharts' ResponsiveContainer.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver =
  ResizeObserverStub as unknown as typeof ResizeObserver;

/**
 * Seed a LIVE-shaped surface (real pipeline math on a fixture chain).
 * Tests do not call demo mode — production is LIVE-only.
 */
function seedLiveDashboard() {
  const snap = { ...buildSnapshot('SPY', Date.now(), 500, 0, 0), surfaceSource: 'live' as const };
  const surface = buildSurfaceGrid(snap);
  const readout = sviReadout(surface, snap.spot);
  const arb = diagnoseArbitrage(surface, snap.spot);
  let frames: ReturnType<typeof pushLiveFrame> = [];
  for (let i = 0; i < 8; i++) {
    const s = {
      ...buildSnapshot('SPY', Date.now() - (8 - i) * 60_000, 500 + i, i / 8, 0),
      surfaceSource: 'live' as const,
    };
    frames = pushLiveFrame(frames, s, buildSurfaceGrid(s));
  }
  useTerminalStore.setState({
    symbol: 'SPY',
    snapshot: snap,
    surface,
    sviReadout: readout,
    arbResult: arb,
    historicalFrames: frames,
    frameIndex: frames.length - 1,
    isPlaying: false,
    speed: 1,
    source: 'live',
    liveAvailable: true,
    loading: false,
    lastUpdate: Date.now(),
    activeTab: 'home',
    displayMode: 'strike',
    selectedExpiry: null,
    playbackInterval: null,
    refreshInterval: null,
    chainAvailable: true,
    chainUsed: 'yfinance',
    spotSource: 'yfinance',
    historyMode: 'live',
    historySource: 'yfinance',
    fmpHistory: null,
    fmpQuote: null,
  });
}

describe('DashboardView', () => {
  beforeEach(() => {
    seedLiveDashboard();
  });

  /**
   * Home Analytics (panels grid + full chip list) is collapsed by default so
   * the regime band, action chips, launchpad, and GEX strip dominate the
   * landing screen. Expand it before asserting on its contents.
   */
  function expandAnalytics(container: HTMLElement = document.body) {
    const toggle = screen.getByRole('button', { name: /analytics/i });
    fireEvent.click(toggle, { container });
  }

  it('renders the diagnostics card with SVI RMSE and arbitrage counts', () => {
    render(<DashboardView />);
    expandAnalytics();

    const card = screen.getByTestId('diagnostics-card');
    expect(card).toBeInTheDocument();

    const rmseNode = screen.getByTestId('svi-rmse');
    expect(rmseNode.textContent).toMatch(/%/);

    expect(screen.getByText('Calendar')).toBeInTheDocument();
    expect(screen.getByText('Butterfly')).toBeInTheDocument();

    const badge = screen.getByTestId('arb-badge');
    expect(badge.getAttribute('data-arb-clean')).toBe('true');
    expect(badge.textContent?.toLowerCase()).toContain('clean');
  });

  it('shows the Security DES card on the landing screen without expanding Analytics', () => {
    render(<DashboardView />);

    const card = screen.getByTestId('security-des-card');
    expect(card).toBeInTheDocument();
    expect(card.textContent).toContain('SPY');
    expect(card.textContent).toContain('ATM IV');
    expect(card.textContent).toContain('Nearest');

    // Analytics panels grid remains collapsed by default
    const analyticsToggle = screen.getByRole('button', { name: /analytics/i });
    expect(analyticsToggle).toBeInTheDocument();
    expect(screen.queryByTestId('diagnostics-card')).toBeNull();
  });

  it('shows the hist ATM IV (HIVG) strip on the landing screen without expanding Analytics', () => {
    const { historicalFrames } = useTerminalStore.getState();
    expect(historicalFrames.length).toBeGreaterThan(1);

    render(<DashboardView />);

    const strip = screen.getByTestId('hist-iv-strip');
    expect(strip).toBeInTheDocument();
    expect(strip.textContent).toContain('HIVG');
    expect(strip.textContent).toContain('hist ATM IV');

    // Analytics panels grid remains collapsed by default
    expect(screen.queryByTestId('diagnostics-card')).toBeNull();
  });

  it('computes non-zero IV High / IV Low from historical frames', () => {
    const { historicalFrames } = useTerminalStore.getState();
    expect(historicalFrames.length).toBeGreaterThan(0);

    render(<DashboardView />);
    expandAnalytics();

    const allText = document.body.textContent ?? '';
    const percentMatches = allText.match(/-?\d+\.\d{2}%/g) ?? [];
    expect(percentMatches.length).toBeGreaterThan(2);

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
    expandAnalytics();

    const badge = screen.getByTestId('arb-badge');
    expect(badge.getAttribute('data-arb-clean')).toBe('false');
    expect(badge.textContent?.toLowerCase()).toContain('flags');

    const counts = screen.getAllByText(/^[0-9]+$/);
    expect(counts).toContainEqual(expect.objectContaining({ textContent: '3' }));
    expect(counts).toContainEqual(expect.objectContaining({ textContent: '1' }));
  });

  it('falls back to current snapshot IV when historicalFrames are empty', () => {
    const { snapshot } = useTerminalStore.getState();
    useTerminalStore.setState({ historicalFrames: [] });

    render(<DashboardView />);
    expandAnalytics();

    expect(snapshot).not.toBeNull();
    expect(snapshot!.expiries.length).toBeGreaterThan(0);
    expect(screen.getByText('IV High')).toBeInTheDocument();
    expect(screen.getByText('IV Low')).toBeInTheDocument();
  });
});
