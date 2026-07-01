import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBar } from './StatusBar';
import { useTerminalStore } from '../../store/terminalStore';

describe('StatusBar', () => {
  it('renders source indicator and contract info', () => {
    useTerminalStore.setState({
      symbol: 'SPY', source: 'demo', lastUpdate: Date.now(),
      fmpQuote: null, liveRFR: null,
      snapshot: null,
    });
    render(<StatusBar />);
    expect(screen.getByText(/SPY/)).toBeTruthy();
    expect(screen.getByText('DEMO')).toBeTruthy();
  });

  it('shows FMP price when available', () => {
    useTerminalStore.setState({
      symbol: 'SPY', source: 'live', lastUpdate: Date.now(),
      fmpQuote: {
        symbol: 'SPY', name: '', price: 500.50,
        changePercentage: 0, change: 0, dayLow: 0, dayHigh: 0,
        yearHigh: 0, yearLow: 0, volume: 0, marketCap: 0,
        priceAvg50: 0, priceAvg200: 0, exchange: '',
        open: 0, previousClose: 0, timestamp: Date.now(),
      } as any,
      liveRFR: null, snapshot: null,
    });
    render(<StatusBar />);
    expect(screen.getByText(/FMP/)).toBeTruthy();
  });

  it('shows live RFR when available', () => {
    useTerminalStore.setState({
      symbol: 'SPY', source: 'live', lastUpdate: Date.now(),
      fmpQuote: null, liveRFR: 0.0398,
      snapshot: null,
    });
    render(<StatusBar />);
    expect(screen.getByText(/RFR/)).toBeTruthy();
  });
});
