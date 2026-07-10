import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { OptionChain } from './OptionChain';
import { useTerminalStore } from '../../store/terminalStore';
import {
  buildSnapshot,
  buildSurfaceGrid,
} from '../../lib/options/synthetic';
import { sviReadout } from '../../lib/options/surfaceTools';
import { diagnoseArbitrage } from '../../lib/options/noarb';

// jsdom polyfills for code that touches ResizeObserver indirectly.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver =
  ResizeObserverStub as unknown as typeof ResizeObserver;

describe('OptionChain', () => {
  beforeEach(() => {
    // Reset store to a deterministic synthetic state. Seeding sviReadout and
    // arbResult means the diagnostics strip is non-null out of the gate.
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
      activeTab: 'positioning',
      displayMode: 'strike',
      selectedExpiry: null,
      playbackInterval: null,
      refreshInterval: null,
    });
  });

  it('renders the diagnostics strip below the sticky header with seeded values', () => {
    render(<OptionChain />);

    // The header row remains visible above the strip.
    expect(screen.getByText('Strike')).toBeInTheDocument();

    const strip = screen.getByTestId('chain-diagnostics');
    expect(strip).toBeInTheDocument();

    // RMSE is rendered through fmtPct so it carries a "%" suffix.
    const rmse = within(strip).getByTestId('diagnostics-svi-rmse');
    expect(rmse.textContent).toMatch(/%/);

    // Calendar and Butterfly counts are rendered as integer strings.
    const calendar = within(strip).getByTestId('diagnostics-calendar');
    const butterfly = within(strip).getByTestId('diagnostics-butterfly');
    expect(calendar.textContent).toMatch(/^\d+$/);
    expect(butterfly.textContent).toMatch(/^\d+$/);

    // The synthetic SPY demo surface is arbitrage-clean for the seeded state.
    const badge = within(strip).getByTestId('diagnostics-arb-badge');
    expect(badge.getAttribute('data-arb-clean')).toBe('true');
  });

  it('still renders the header and a diagnostics strip with placeholders when diagnostics are null', () => {
    useTerminalStore.setState({ sviReadout: null, arbResult: null });

    render(<OptionChain />);

    // The header row must remain present even without diagnostics.
    expect(screen.getByText('Strike')).toBeInTheDocument();

    const strip = screen.getByTestId('chain-diagnostics');
    expect(strip).toBeInTheDocument();

    // Strip falls back to em-dashes and a clean badge when both are null.
    const rmse = within(strip).getByTestId('diagnostics-svi-rmse');
    const calendar = within(strip).getByTestId('diagnostics-calendar');
    const butterfly = within(strip).getByTestId('diagnostics-butterfly');
    expect(rmse.textContent).toBe('\u2014');
    expect(calendar.textContent).toBe('\u2014');
    expect(butterfly.textContent).toBe('\u2014');

    const badge = within(strip).getByTestId('diagnostics-arb-badge');
    expect(badge.getAttribute('data-arb-clean')).toBe('true');
  });

  it('reflects arbitrage violations on the diagnostics strip', () => {
    const state = useTerminalStore.getState();
    const arb = state.arbResult;
    expect(arb).not.toBeNull();
    useTerminalStore.setState({
      arbResult: {
        calendar: { flags: arb!.calendar.flags, violations: 3 },
        butterfly: { flags: arb!.butterfly.flags, violations: 0 },
        clean: false,
      },
    });

    render(<OptionChain />);

    const strip = screen.getByTestId('chain-diagnostics');
    expect(strip.getAttribute('data-arb-clean')).toBe('false');

    const calendar = within(strip).getByTestId('diagnostics-calendar');
    const butterfly = within(strip).getByTestId('diagnostics-butterfly');
    expect(calendar.textContent).toBe('3');
    expect(butterfly.textContent).toBe('0');

    const badge = within(strip).getByTestId('diagnostics-arb-badge');
    expect(badge.getAttribute('data-arb-clean')).toBe('false');
  });

  it('shows the no-data placeholder when there is no snapshot', () => {
    useTerminalStore.setState({ snapshot: null });

    render(<OptionChain />);

    // No-data placeholder is rendered; the diagnostics strip is only mounted
    // when there is at least one row of chain data to display.
    expect(screen.getByText('No live option chain')).toBeInTheDocument();
    expect(screen.queryByTestId('chain-diagnostics')).toBeNull();
  });
});
