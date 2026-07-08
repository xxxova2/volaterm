import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invalidateFmpCache } from '../data/fmpClient';

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

// Import after the fetch mock is installed.
const fmp = await import('./fmp');

function res(body: unknown, ok = true) {
  return { ok, text: () => Promise.resolve(JSON.stringify(body)) };
}

function chain() {
  const mk = (type: 'call' | 'put', strike: number, iv: number) => ({
    optionType: type,
    strike,
    bid: strike < 100 ? 6 : 2,
    ask: strike < 100 ? 7 : 3,
    last: strike < 100 ? 6.5 : 2.5,
    openInterest: 10,
    volume: 5,
    impliedVolatility: iv,
    expirationDate: '2026-08-10',
  });
  return [
    {
      expirationDate: '2026-08-10',
      data: [mk('call', 95, 0.2), mk('call', 100, 0.21), mk('call', 105, 0.24), mk('put', 95, 0.22), mk('put', 100, 0.23)],
    },
  ];
}

describe('fetchFmpSnapshot', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // The cached fmpClient persists across cases — clear it so each case
    // gets a fresh fetch (including negative-cached failures).
    invalidateFmpCache();
  });

  it('builds a VolSnapshot from the FMP option chain + quote', async () => {
    mockFetch
      .mockResolvedValueOnce(res(chain())) // options
      .mockResolvedValueOnce(res([{ symbol: 'SPY', price: 100 }])); // quote

    const snap = await fmp.fetchFmpSnapshot('SPY');
    expect(snap.symbol).toBe('SPY');
    expect(snap.spot).toBe(100);
    expect(snap.expiries.length).toBeGreaterThanOrEqual(1);
    const total = snap.expiries.reduce((n, e) => n + e.calls.length + e.puts.length, 0);
    expect(total).toBeGreaterThan(0);
  });

  it('throws a descriptive error when the options endpoint fails', async () => {
    mockFetch
      .mockResolvedValueOnce(res({ 'Error Message': 'Subscription does not include this endpoint' }, false))
      .mockResolvedValueOnce(res([{ symbol: 'SPY', price: 100 }]));
    await expect(fmp.fetchFmpSnapshot('SPY')).rejects.toThrow(/Subscription does not include this endpoint/);
  });

  it('throws when no spot price is available', async () => {
    mockFetch
      .mockResolvedValueOnce(res(chain()))
      .mockResolvedValueOnce(res([{ symbol: 'SPY', price: NaN }]));
    await expect(fmp.fetchFmpSnapshot('SPY')).rejects.toThrow(/spot quote missing or invalid/);
  });

  it('throws when the chain has too few contracts', async () => {
    mockFetch
      .mockResolvedValueOnce(res([{ expirationDate: '2026-08-10', data: [chain()[0]!.data[0]!] }]))
      .mockResolvedValueOnce(res([{ symbol: 'SPY', price: 100 }]));
    await expect(fmp.fetchFmpSnapshot('SPY')).rejects.toThrow(/too few option contracts/);
  });
});
