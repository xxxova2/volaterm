import { describe, it, expect } from 'vitest';
import { pushLiveFrame, isLiveHistory, LIVE_HISTORY_MAX_FRAMES } from './liveHistory';
import type { VolSnapshot, SurfaceGrid } from './types';

function snap(ts: number, atm = 0.2): VolSnapshot {
  return {
    symbol: 'SPY',
    spot: 500,
    riskFreeRate: 0.05,
    dividendYield: 0.01,
    timestamp: ts,
    expiries: [{ expiry: '2026-08-01', dte: 30, calls: [], puts: [], atmIV: atm }],
  };
}

const surface: SurfaceGrid = {
  expiries: ['2026-08-01'],
  dtes: [30],
  strikes: [500],
  iv: [[0.2]],
  bid: [[1]],
  ask: [[2]],
  delta: [[0.5]],
};

describe('pushLiveFrame', () => {
  it('appends frames and caps length', () => {
    let frames: ReturnType<typeof pushLiveFrame> = [];
    for (let i = 0; i < LIVE_HISTORY_MAX_FRAMES + 10; i++) {
      frames = pushLiveFrame(frames, snap(i * 60_000, 0.2 + i * 0.001), surface, LIVE_HISTORY_MAX_FRAMES);
    }
    expect(frames.length).toBe(LIVE_HISTORY_MAX_FRAMES);
    expect(frames[0]!.timestamp).toBe(10 * 60_000);
  });

  it('replaces near-duplicate timestamps', () => {
    let frames = pushLiveFrame([], snap(1000, 0.2), surface);
    frames = pushLiveFrame(frames, snap(1500, 0.25), surface);
    expect(frames.length).toBe(1);
    expect(frames[0]!.snapshot.expiries[0]!.atmIV).toBe(0.25);
  });
});

describe('isLiveHistory', () => {
  it('detects tightly spaced live frames', () => {
    const frames = [
      { snapshot: snap(0), surface, timestamp: 0 },
      { snapshot: snap(45_000), surface, timestamp: 45_000 },
    ];
    expect(isLiveHistory(frames)).toBe(true);
  });

  it('rejects 2h synthetic spacing', () => {
    const frames = [
      { snapshot: snap(0), surface, timestamp: 0 },
      { snapshot: snap(2 * 3600_000), surface, timestamp: 2 * 3600_000 },
    ];
    expect(isLiveHistory(frames)).toBe(false);
  });
});
