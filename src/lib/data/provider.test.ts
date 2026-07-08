import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

const providerMod = await import('./provider');
const fmpClient = await import('./fmpClient');
const yahoo = await import('../options/yahoo');

// Helper to build a minimal valid FMP option chain payload.
function fmpChain() {
  const mk = (type: 'call' | 'put', strike: number) => ({
    optionType: type, strike, bid: 1, ask: 2, last: 1.5,
    openInterest: 10, volume: 5, impliedVolatility: 0.2, expirationDate: '2026-08-10',
  });
  const data = [];
  for (const s of [90, 95, 100, 105, 110]) {
    data.push(mk('call', s));
    data.push(mk('put', s));
  }
  return [{ expirationDate: '2026-08-10', data }];
}
function yfChain() {
  const quotes = [];
  for (const s of [90, 95, 100, 105, 110]) {
    quotes.push({ strike: s, expiry: '2026-08-10', type: 'call', bid: 1, ask: 2, last: 1.5, iv: 0.2, volume: 5, openInterest: 10 });
    quotes.push({ strike: s, expiry: '2026-08-10', type: 'put', bid: 1, ask: 2, last: 1.5, iv: 0.2, volume: 5, openInterest: 10 });
  }
  return { symbol: 'SPY', spot: 500, expirations: ['2026-08-10'], quotes, timestamp: 0 };
}
function quote(price: number) {
  return res([{ symbol: 'SPY', price }]);
}
function res(body: unknown, ok = true) {
  return { ok, text: () => Promise.resolve(JSON.stringify(body)), json: () => Promise.resolve(body) };
}

const provider = new providerMod.LiveProvider();

describe('LiveProvider auto chain source', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    fmpClient.invalidateFmpCache();
    yahoo.invalidateYahooChainCache();
  });

  it('auto mode prefers yfinance chain, falls back to synthetic when both absent', async () => {
    // FMP quote ok (spot), yfinance /api/options returns a chain, FMP options 403.
    mockFetch
      .mockResolvedValueOnce(quote(500)) // FMP quote
      .mockResolvedValueOnce(res(yfChain())) // /api/options (yfinance)
      .mockResolvedValueOnce(res({ 'Error Message': 'Subscription does not include this endpoint' }, false)); // FMP options

    const snap = await provider.getSnapshot('SPY', { chainMode: 'auto' });
    expect(snap).not.toBeNull();
    expect(provider.lastChainSource).toBe('yfinance');
    expect(provider.lastChainAvailable).toBe(true);
    expect(snap!.spot).toBe(500);
  });

  it('auto mode falls back to FMP chain when yfinance is down', async () => {
    mockFetch
      .mockResolvedValueOnce(quote(500)) // FMP quote
      .mockRejectedValueOnce(new Error('yfinance unavailable')) // /api/options fails
      .mockResolvedValueOnce(res(fmpChain())); // FMP options ok

    const snap = await provider.getSnapshot('SPY', { chainMode: 'auto' });
    expect(snap).not.toBeNull();
    expect(provider.lastChainSource).toBe('fmp');
    expect(provider.lastChainAvailable).toBe(true);
  });

  it('auto mode yields synthetic when neither chain source is available', async () => {
    mockFetch
      .mockResolvedValueOnce(quote(500)) // FMP quote
      .mockRejectedValueOnce(new Error('yfinance unavailable'))
      .mockResolvedValueOnce(res({ 'Error Message': 'Subscription does not include this endpoint' }, false)); // FMP options

    const snap = await provider.getSnapshot('SPY', { chainMode: 'auto' });
    // Synthetic surface over the real spot.
    expect(snap).not.toBeNull();
    expect(provider.lastChainSource).toBe('synthetic');
    expect(provider.lastChainAvailable).toBe(false);
    expect(snap!.spot).toBe(500);
  });

  it('explicit fmp mode only uses FMP options', async () => {
    mockFetch
      .mockResolvedValueOnce(quote(500))
      .mockResolvedValueOnce(res(fmpChain()));
    const snap = await provider.getSnapshot('SPY', { chainMode: 'fmp' });
    expect(provider.lastChainSource).toBe('fmp');
    expect(snap!.spot).toBe(500);
  });
});
