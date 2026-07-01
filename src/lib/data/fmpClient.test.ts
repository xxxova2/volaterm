import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

// Import after mock setup
const mod = await import('./fmpClient');

describe('fetchFmpQuote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });
    const result = await mod.fetchFmpQuote('SPY');
    expect(result).toBeNull();
  });

  it('returns parsed JSON on success', async () => {
    const data = [{ symbol: 'SPY', price: 500 }];
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(data) });
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
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(data) });
    const result = await mod.fetchFmpTreasuryRates();
    expect(result).toEqual(data);
    expect(mockFetch).toHaveBeenCalledWith('/api/fmp/stable/treasury-rates');
  });

  it('returns null on failure', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });
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
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(data) });
    const result = await mod.fetchFmpEtfHoldings('SPY');
    expect(result).toEqual(data);
    expect(mockFetch).toHaveBeenCalledWith('/api/fmp/stable/etf/holdings?symbol=SPY');
  });
});
