import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  invalidateGreeksCache,
  loadGreeksPack,
  peekGreeksCache,
  prefetchGreeks,
} from './greeksCache';

const greeksMock = vi.fn();
const historyMock = vi.fn();

vi.mock('./api', () => ({
  macrovolApi: {
    greeks: (...args: unknown[]) => greeksMock(...args),
    greeksHistory: (...args: unknown[]) => historyMock(...args),
  },
}));

describe('greeksCache', () => {
  beforeEach(() => {
    invalidateGreeksCache();
    greeksMock.mockReset();
    historyMock.mockReset();
    greeksMock.mockResolvedValue({
      ticker: 'SPY',
      spot: 500,
      total_points: 2,
      atm: {},
      gex: [],
      surfaces: {},
    });
    historyMock.mockResolvedValue({ ticker: 'SPY', data: [{ date: '2026-01-01', close: 500 }] });
  });

  it('dedupes concurrent loads for the same ticker', async () => {
    const a = loadGreeksPack('SPY');
    const b = loadGreeksPack('SPY');
    const [pa, pb] = await Promise.all([a, b]);
    expect(greeksMock).toHaveBeenCalledTimes(1);
    expect(pa.data.spot).toBe(500);
    expect(pb).toBe(pa);
    expect(peekGreeksCache('SPY')?.data.spot).toBe(500);
  });

  it('serves memory hit without second upstream call', async () => {
    await loadGreeksPack('SPY');
    await loadGreeksPack('SPY');
    expect(greeksMock).toHaveBeenCalledTimes(1);
  });

  it('prefetch is non-blocking and warms cache', async () => {
    prefetchGreeks('AAPL');
    await vi.waitFor(() => {
      expect(peekGreeksCache('AAPL')).not.toBeNull();
    });
    expect(greeksMock).toHaveBeenCalledWith('AAPL', null, null);
  });
});
