import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TerminalHeader } from './TerminalHeader';
import { useTerminalStore } from '../../store/terminalStore';
import { EMPTY_PROVENANCE } from '../../lib/data/freshness';

describe('TerminalHeader', () => {
  it('renders MODE LIVE product chip (muted) and data freshness (demo disabled)', () => {
    useTerminalStore.setState({
      symbol: 'SPY',
      source: 'live',
      loading: false,
      fmpQuote: null,
      liveRFR: null,
      snapshot: null,
      chainAvailable: false,
      chainUsed: 'none',
      spotSource: 'none',
      lastSpotUpdate: 0,
      lastChainUpdate: 0,
      provenance: { ...EMPTY_PROVENANCE },
    });
    render(<TerminalHeader />);
    expect(screen.getByText('SPY')).toBeTruthy();
    const modeChip = screen.getByText('MODE LIVE');
    expect(modeChip).toBeTruthy();
    expect(
      screen.getByLabelText('LIVE-only terminal — market feeds only; no demo mode.'),
    ).toBeTruthy();
    // Product mode is muted — not an up/green freshness pill
    expect(modeChip.className).toMatch(/text-muted-foreground/);
    expect(modeChip.className).toMatch(/bg-muted/);
    expect(modeChip.className).not.toMatch(/text-up|bg-up/);
    // Missing feeds → down (fail-closed); chip label is API DOWN
    expect(screen.getByLabelText('Data freshness: down')).toBeTruthy();
    expect(screen.getByText('API DOWN')).toBeTruthy();
    // Rich title on the data chip itself (not swallowed by nested default title)
    expect(screen.getByTitle(/Spot: down · Chain: down/)).toBeTruthy();
    // No permanent solid green LIVE product pill, no DEMO
    expect(screen.queryByText('DEMO')).toBeNull();
  });

  it('data summary is worst of live spot + missing chain (never greener than StatusBar)', () => {
    const now = Date.now();
    useTerminalStore.setState({
      symbol: 'SPY',
      source: 'live',
      loading: false,
      fmpQuote: null,
      liveRFR: null,
      snapshot: null,
      chainAvailable: false,
      chainUsed: 'none',
      spotSource: 'fmp',
      lastSpotUpdate: now,
      lastChainUpdate: 0,
      provenance: {
        ...EMPTY_PROVENANCE,
        spot: {
          domain: 'spot',
          source: 'fmp',
          asOfMs: now,
          fetchedAtMs: now,
          kind: 'live',
        },
      },
    });
    render(<TerminalHeader />);
    expect(screen.getByText('MODE LIVE')).toBeTruthy();
    // chain missing → down; worst(live, down) = down
    expect(screen.getByLabelText('Data freshness: down')).toBeTruthy();
  });

  it('calls onOpenShortcuts when keyboard button is clicked', () => {
    useTerminalStore.setState({
      symbol: 'SPY',
      source: 'live',
      loading: false,
      fmpQuote: null,
      liveRFR: null,
      snapshot: null,
      chainAvailable: false,
      chainUsed: 'none',
      spotSource: 'none',
      lastSpotUpdate: 0,
      lastChainUpdate: 0,
      provenance: { ...EMPTY_PROVENANCE },
    });
    const onOpenShortcuts = vi.fn();
    render(<TerminalHeader onOpenShortcuts={onOpenShortcuts} />);
    fireEvent.click(screen.getByTitle('Shortcuts (?)'));
    expect(onOpenShortcuts).toHaveBeenCalledTimes(1);
  });

  it('shows FMP company name when available', () => {
    useTerminalStore.setState({
      symbol: 'SPY',
      source: 'live',
      loading: false,
      fmpQuote: {
        symbol: 'SPY', name: 'State Street SPDR S&P 500 ETF', price: 500,
        changePercentage: 0, change: 0, dayLow: 0, dayHigh: 0,
        yearHigh: 0, yearLow: 0, volume: 0, marketCap: 0,
        priceAvg50: 0, priceAvg200: 0, exchange: 'AMEX',
        open: 0, previousClose: 0, timestamp: Date.now(),
      },
      liveRFR: null,
      snapshot: null,
      chainAvailable: false,
      chainUsed: 'none',
      spotSource: 'none',
      lastSpotUpdate: 0,
      lastChainUpdate: 0,
      provenance: { ...EMPTY_PROVENANCE },
    });
    render(<TerminalHeader />);
    expect(screen.getByText('State Street SPDR S&P 500 ETF')).toBeTruthy();
  });

  it('shows live RFR when available', () => {
    useTerminalStore.setState({
      symbol: 'SPY',
      source: 'live',
      loading: false,
      fmpQuote: null,
      liveRFR: 0.0398,
      snapshot: null,
      chainAvailable: false,
      chainUsed: 'none',
      spotSource: 'none',
      lastSpotUpdate: 0,
      lastChainUpdate: 0,
      provenance: { ...EMPTY_PROVENANCE },
    });
    render(<TerminalHeader />);
    expect(screen.getByText('3.98%')).toBeTruthy();
  });
});
