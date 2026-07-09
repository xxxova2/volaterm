import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TerminalHeader } from './TerminalHeader';
import { useTerminalStore } from '../../store/terminalStore';

describe('TerminalHeader', () => {
  it('renders symbol and LIVE badge (demo disabled)', () => {
    useTerminalStore.setState({
      symbol: 'SPY',
      source: 'live',
      loading: false,
      fmpQuote: null,
      liveRFR: null,
      snapshot: null,
      chainAvailable: false,
      chainUsed: 'none',
    });
    render(<TerminalHeader />);
    expect(screen.getByText('SPY')).toBeTruthy();
    expect(screen.getByText('LIVE')).toBeTruthy();
    expect(screen.queryByText('DEMO')).toBeNull();
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
    });
    render(<TerminalHeader />);
    expect(screen.getByText('3.98%')).toBeTruthy();
  });
});
