import { describe, it, expect } from 'vitest';
import { buildCashFuturesSnapshot } from './cashFuturesBasis';
import type { StirContract } from '../macrovol/api';

const fut = (ticker: string, last: number, net = 0.05): StirContract => ({
  contract: ticker,
  ticker,
  month: ticker,
  product: ticker,
  implied_rate: null,
  last_price: last,
  net,
  source: 'live',
});

describe('buildCashFuturesSnapshot', () => {
  it('pairs ZN with 10Y cash yield', () => {
    const snap = buildCashFuturesSnapshot(
      [fut('ZN', 110.5), fut('ZF', 108.25)],
      [
        { label: '2Y', yield: 3.9 },
        { label: '5Y', yield: 3.85 },
        { label: '10Y', yield: 4.1 },
        { label: '30Y', yield: 4.4 },
      ],
      { sofr: 4.3, effr: 4.33 },
    );
    expect(snap.liveCount).toBe(2);
    const zn = snap.rows.find((r) => r.ticker === 'ZN');
    expect(zn?.cashYield).toBe(4.1);
    expect(zn?.futuresPrice).toBe(110.5);
    expect(snap.sofrEffrBps).toBeCloseTo(-3, 5);
    expect(snap.note).toMatch(/Not CTD/i);
  });

  it('handles empty futures', () => {
    const snap = buildCashFuturesSnapshot([], [{ label: '10Y', yield: 4 }]);
    expect(snap.liveCount).toBe(0);
    expect(snap.rows).toHaveLength(0);
  });
});
