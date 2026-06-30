import { describe, it, expect, beforeEach } from 'vitest';
import { useTerminalStore } from './terminalStore';

describe('terminalStore', () => {
  beforeEach(() => {
    // Reset to a deterministic demo state without triggering live network calls.
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
      activeTab: 'surface',
      displayMode: 'strike',
      selectedExpiry: null,
      playbackInterval: null,
      refreshInterval: null,
    });
  });

  it('computes sviReadout and arbResult after setSymbol', () => {
    useTerminalStore.getState().setSource('demo');
    useTerminalStore.getState().setSymbol('SPY');

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
  });

  it('updates sviReadout and arbResult on refresh in demo mode', () => {
    useTerminalStore.getState().setSource('demo');
    useTerminalStore.getState().setSymbol('SPY');

    const before = useTerminalStore.getState();
    expect(before.sviReadout).not.toBeNull();

    useTerminalStore.getState().refresh();
    const after = useTerminalStore.getState();
    expect(after.snapshot).not.toBeNull();
    expect(after.surface).not.toBeNull();
    expect(after.sviReadout).not.toBeNull();
    expect(after.arbResult).not.toBeNull();
    expect(after.sviReadout!.samples).toBeGreaterThanOrEqual(5);
    expect(after.arbResult!.clean).toBe(true);
  });
});
