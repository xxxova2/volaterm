import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invalidateFmpCache } from './fmpClient';

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

// Import after mock setup
const mod = await import('./fmpClient');

beforeEach(() => {
  vi.clearAllMocks();
  // fmpClient keeps a module-level cache that must be cleared between cases.
  invalidateFmpCache();
});

// Mock response: fmpGet reads res.text() then JSON.parses it.
function res(data: unknown, ok = true) {
  return {
    ok,
    text: () => Promise.resolve(JSON.stringify(data)),
    json: () => Promise.resolve(data),
  };
}

describe('fetchFmpQuote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce(res(null, false));
    const result = await mod.fetchFmpQuote('SPY');
    expect(result).toBeNull();
  });

  it('returns parsed JSON on success', async () => {
    const data = [{ symbol: 'SPY', price: 500 }];
    mockFetch.mockResolvedValueOnce(res(data));
    const result = await mod.fetchFmpQuote('SPY');
    expect(result).toEqual(data);
    expect(mockFetch).toHaveBeenCalledWith('/api/fmp/stable/quote?symbol=SPY');
  });

  it('returns null on fetch error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network'));
    const result = await mod.fetchFmpQuote('SPY');
    expect(result).toBeNull();
  });
});

describe('fetchFmpTreasuryRates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls the correct endpoint', async () => {
    const data = [{ date: '2026-01-01', year1: 4.0 }];
    mockFetch.mockResolvedValueOnce(res(data));
    const result = await mod.fetchFmpTreasuryRates();
    expect(result).toEqual(data);
    expect(mockFetch).toHaveBeenCalledWith('/api/fmp/stable/treasury-rates');
  });

  it('returns null on failure', async () => {
    mockFetch.mockResolvedValueOnce(res(null, false));
    const result = await mod.fetchFmpTreasuryRates();
    expect(result).toBeNull();
  });
});

describe('fetchFmpEtfHoldings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls the correct endpoint', async () => {
    const data = [{ symbol: 'AAPL', weight: 0.07 }];
    mockFetch.mockResolvedValueOnce(res(data));
    const result = await mod.fetchFmpEtfHoldings('SPY');
    expect(result).toEqual(data);
    expect(mockFetch).toHaveBeenCalledWith('/api/fmp/stable/etf/holdings?symbol=SPY');
  });
});

describe('fetchFmpPriceHistory normalisation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalises an array of bars', async () => {
    const data = [
      { date: '2026-01-02', open: 1, high: 2, low: 0.5, close: 1.5, volume: 10 },
    ];
    mockFetch.mockResolvedValueOnce(res(data));
    const result = await mod.fetchFmpPriceHistory('SPY');
    expect(result).toEqual([
      { date: '2026-01-02', open: 1, high: 2, low: 0.5, close: 1.5, volume: 10 },
    ]);
  });

  it('normalises the { historical: [...] } envelope shape', async () => {
    const data = { symbol: 'SPY', historical: [{ date: '2026-01-02', close: 2 }] };
    mockFetch.mockResolvedValueOnce(res(data));
    const result = await mod.fetchFmpPriceHistory('SPY');
    expect(result).toEqual([{ date: '2026-01-02', open: 0, high: 0, low: 0, close: 2, volume: 0 }]);
  });
});
