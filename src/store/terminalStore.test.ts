import { describe, it, expect, beforeEach } from 'vitest';
import { useTerminalStore } from './terminalStore';
import { buildSnapshot, buildSurfaceGrid } from '../lib/options/synthetic';
import { sviReadout } from '../lib/options/surfaceTools';
import { diagnoseArbitrage } from '../lib/options/noarb';

/**
 * LIVE-only store tests. Network-backed setSymbol is not exercised here —
 * seed a real-shaped snapshot (from the shared builder used in unit fixtures)
 * and assert SVI/arb math + symbol validation.
 */
function seedLiveSurface(symbol = 'SPY') {
  const snap = buildSnapshot(symbol, Date.now(), 500, 0, 0);
  // Mark as live so store provenance paths treat it as market data.
  const liveSnap = { ...snap, surfaceSource: 'live' as const };
  const surface = buildSurfaceGrid(liveSnap);
  const readout = sviReadout(surface, liveSnap.spot);
  const arb = diagnoseArbitrage(surface, liveSnap.spot);
  useTerminalStore.setState({
    symbol,
    snapshot: liveSnap,
    surface,
    sviReadout: readout,
    arbResult: arb,
    historicalFrames: [],
    frameIndex: 0,
    isPlaying: false,
    speed: 1,
    source: 'live',
    liveAvailable: true,
    loading: false,
    lastUpdate: Date.now(),
    activeTab: 'vol',
    displayMode: 'strike',
    selectedExpiry: null,
    playbackInterval: null,
    refreshInterval: null,
    fmpQuote: null,
    fmpTreasuryRates: null,
    liveRFR: null,
    fmpSpot: null,
    chainAvailable: true,
    chainUsed: 'yfinance',
    spotSource: 'yfinance',
    historyMode: 'live',
  });
}

describe('terminalStore', () => {
  beforeEach(() => {
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
      source: 'live',
      liveAvailable: false,
      loading: false,
      lastUpdate: Date.now(),
      activeTab: 'vol',
      displayMode: 'strike',
      selectedExpiry: null,
      playbackInterval: null,
      refreshInterval: null,
      fmpQuote: null,
      fmpTreasuryRates: null,
      liveRFR: null,
      fmpSpot: null,
      chainAvailable: false,
      chainUsed: 'none',
      spotSource: 'none',
      historyMode: 'live',
    });
  });

  it('computes sviReadout and arbResult on a live-shaped surface', () => {
    seedLiveSurface('SPY');
    const state = useTerminalStore.getState();
    expect(state.snapshot).not.toBeNull();
    expect(state.surface).not.toBeNull();
    expect(state.sviReadout).not.toBeNull();
    expect(state.arbResult).not.toBeNull();

    expect(state.sviReadout!.samples).toBeGreaterThanOrEqual(5);
    expect(state.sviReadout!.rmse).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(state.sviReadout!.params.a)).toBe(true);
    expect(Number.isFinite(state.sviReadout!.params.b)).toBe(true);
    expect(Number.isFinite(state.sviReadout!.params.rho)).toBe(true);
    expect(Number.isFinite(state.sviReadout!.params.m)).toBe(true);
    expect(Number.isFinite(state.sviReadout!.params.sigma)).toBe(true);

    expect(state.arbResult!.calendar.violations).toBe(0);
    expect(state.arbResult!.butterfly.violations).toBe(0);
    expect(state.arbResult!.clean).toBe(true);
    expect(state.source).toBe('live');
    expect(state.chainUsed).toBe('yfinance');
  });

  it('rejects invalid symbols and preserves previous state', async () => {
    seedLiveSurface('SPY');
    const validSnapshot = useTerminalStore.getState().snapshot;

    await useTerminalStore.getState().setSymbol('123INVALID');
    const afterInvalid = useTerminalStore.getState();

    expect(afterInvalid.symbol).toBe('SPY');
    expect(afterInvalid.snapshot).toBe(validSnapshot);
  });

  it('setSource(demo) forces live-only', async () => {
    seedLiveSurface('SPY');
    await useTerminalStore.getState().setSource('demo');
    expect(useTerminalStore.getState().source).toBe('live');
  }, 30_000);
});
