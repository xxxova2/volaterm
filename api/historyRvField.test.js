/**
 * Honesty: SPY history RV must not be named `vix` (that is FRED VIXCLS).
 */
import { describe, it, expect } from 'vitest';
import { barsToSpyHistoryPayload, buildSpyHistorySynthetic } from './_shared.js';

describe('barsToSpyHistoryPayload RV naming', () => {
  it('emits rv_20d_pct and never vix on live-shaped bars', () => {
    const sorted = [];
    let px = 100;
    for (let i = 0; i < 40; i++) {
      px *= 1 + (i % 5 === 0 ? 0.01 : -0.005);
      sorted.push({ date: `2026-01-${String(i + 1).padStart(2, '0')}`, close: px });
    }
    const payload = barsToSpyHistoryPayload(sorted, 'yfinance');
    expect(payload.source).toBe('yfinance');
    expect(payload.data.length).toBe(40);
    const last = payload.data[payload.data.length - 1];
    expect(last).toHaveProperty('rv_20d_pct');
    expect(last).not.toHaveProperty('vix');
    expect(typeof last.rv_20d_pct).toBe('number');
    expect(last.rv_20d_pct).toBeGreaterThan(0);
  });
});

describe('synthetic history RV naming', () => {
  it('does not label synthetic series as VIX', () => {
    const payload = buildSpyHistorySynthetic();
    expect(payload.source).toBe('synthetic');
    const row = payload.data[payload.data.length - 1];
    expect(row).toHaveProperty('rv_20d_pct');
    expect(row).not.toHaveProperty('vix');
  });
});
