import { describe, it, expect } from 'vitest';
import { buildCarryScores, auctionCurveNote, ratesFromFxPairs } from './carryScores';

describe('carryScores', () => {
  it('maps FX pairs', () => {
    const r = ratesFromFxPairs([
      { pair: 'USDJPY', rate: 160 },
      { pair: 'EURUSD', rate: 1.1 },
    ]);
    expect(r.usdjpy).toBe(160);
    expect(r.eurusd).toBe(1.1);
  });

  it('builds chips from wide carry', () => {
    const scores = buildCarryScores({
      usdjpy: 160,
      usJp10yPp: 3.5,
      spread2s10s: -0.2,
      sofr: 4.35,
      iorb: 4.4,
    });
    expect(scores.length).toBeGreaterThanOrEqual(3);
    expect(scores.find((s) => s.id === 'usjp')?.tone).toBe('warn');
    expect(scores.find((s) => s.id === '2s10s')?.tone).toBe('down');
  });

  it('auction note', () => {
    const n = auctionCurveNote(
      { security_type: 'Note', security_term: '10-Year', auction_date: '2026-07-23' },
      -0.1,
    );
    expect(n).toMatch(/10-Year/);
    expect(n).toMatch(/inverted/);
  });
});
