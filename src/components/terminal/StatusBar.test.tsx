import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBar } from './StatusBar';
import { useTerminalStore } from '../../store/terminalStore';

describe('StatusBar', () => {
  it('renders source indicator and contract info', () => {
    useTerminalStore.setState({
      symbol: 'SPY',
      source: 'live',
      lastUpdate: Date.now(),
      lastSpotUpdate: 0,
      lastChainUpdate: 0,
      fmpQuote: null,
      liveRFR: null,
      snapshot: null,
      chainUsed: 'none',
      spotSource: 'none',
      chainAvailable: false,
      streamConnected: false,
      historyMode: 'live',
      historicalFrames: [],
      session: { isOpen: false, phase: 'closed', minutesSinceOpen: null },
    });
    render(<StatusBar />);
    expect(screen.getByText(/SPY/)).toBeTruthy();
    expect(screen.getByText(/chain:none/)).toBeTruthy();
    // Missing live feeds should still render freshness chips (spot/chain labels)
    expect(screen.getByTitle('Spot freshness')).toBeTruthy();
    expect(screen.getByTitle('Chain / surface freshness')).toBeTruthy();
  });

  it('shows spot price when available', () => {
    useTerminalStore.setState({
      symbol: 'SPY',
      source: 'live',
      lastUpdate: Date.now(),
      lastSpotUpdate: Date.now(),
      lastChainUpdate: Date.now(),
      fmpQuote: {
        symbol: 'SPY',
        name: '',
        price: 500.5,
        changePercentage: 0,
        change: 0,
        dayLow: 0,
        dayHigh: 0,
        yearHigh: 0,
        yearLow: 0,
        volume: 0,
        marketCap: 0,
        priceAvg50: 0,
        priceAvg200: 0,
        exchange: '',
        open: 0,
        previousClose: 0,
        timestamp: Date.now(),
      } as any,
      liveRFR: null,
      snapshot: null,
      chainUsed: 'yfinance',
      spotSource: 'fmp',
      chainAvailable: true,
      streamConnected: true,
      historyMode: 'live',
      historicalFrames: [{ snapshot: null as any, surface: null as any, timestamp: Date.now() }],
      session: { isOpen: true, phase: 'open', minutesSinceOpen: 60 },
    });
    render(<StatusBar />);
    expect(screen.getByText(/spot:500/)).toBeTruthy();
    expect(screen.getByText(/chain:yfinance/)).toBeTruthy();
    expect(screen.getByText('RTH')).toBeTruthy();
    expect(screen.getByText('SSE')).toBeTruthy();
  });

  it('shows live RFR when available', () => {
    useTerminalStore.setState({
      symbol: 'SPY',
      source: 'live',
      lastUpdate: Date.now(),
      lastSpotUpdate: Date.now(),
      lastChainUpdate: Date.now(),
      fmpQuote: null,
      liveRFR: 0.0398,
      snapshot: null,
      chainUsed: 'none',
      spotSource: 'none',
      chainAvailable: false,
      streamConnected: false,
      historyMode: 'live',
      historicalFrames: [],
      session: { isOpen: false, phase: 'after', minutesSinceOpen: 400 },
    });
    render(<StatusBar />);
    expect(screen.getByText(/RFR:/)).toBeTruthy();
  });
});
