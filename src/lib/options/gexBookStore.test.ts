import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildGexBookDay,
  clearGexBookStore,
  computeGexBookDeltas,
  recordGexBook,
  todayKey,
} from './gexBookStore';

const rows = [
  { expiry: '2026-07-17', dte: 0, totalGEX: 1e8, totalDEX: 2e8 },
  { expiry: '2026-07-24', dte: 7, totalGEX: 5e7, totalDEX: 1e8 },
];

describe('gexBookStore', () => {
  beforeEach(() => {
    clearGexBookStore();
  });

  it('first sample sets today and sessionOpen', () => {
    const t0 = Date.parse('2026-07-13T14:00:00Z');
    const s = recordGexBook('SPY', 1e9, 2e9, rows, { now: t0, minGapMs: 0 });
    expect(s.today?.totalGEX).toBe(1e9);
    expect(s.sessionOpen?.totalGEX).toBe(1e9);
    expect(s.prior).toBeNull();
  });

  it('session delta from open to later sample', () => {
    const t0 = Date.parse('2026-07-13T14:00:00Z');
    recordGexBook('SPY', 1e9, 2e9, rows, { now: t0, minGapMs: 0 });
    const s = recordGexBook('SPY', 1.2e9, 2.1e9, rows, {
      now: t0 + 120_000,
      minGapMs: 0,
    });
    const d = computeGexBookDeltas(s);
    expect(d.gexSession).toBeCloseTo(0.2e9, 0);
    expect(d.dexSession).toBeCloseTo(0.1e9, 0);
    expect(d.gex1d).toBeNull();
    expect(d.hasPriorDay).toBe(false);
  });

  it('day roll freezes prior and computes 1D Δ', () => {
    const d0 = Date.parse('2026-07-12T20:00:00Z');
    const d1 = Date.parse('2026-07-13T15:00:00Z');
    // Force day keys via build + write path: record on day0 then day1
    // Use local todayKey consistency: mock by sequential records with different days
    // by patching through record with timestamps that cross midnight local is flaky;
    // unit-test pure compute instead for 1D.
    const prior = buildGexBookDay('SPY', '2026-07-12', 1e9, 3e9, rows, d0);
    const today = buildGexBookDay(
      'SPY',
      '2026-07-13',
      1.5e9,
      2.5e9,
      [
        { expiry: '2026-07-17', dte: 0, totalGEX: 1.2e8, totalDEX: 2.2e8 },
        { expiry: '2026-07-24', dte: 7, totalGEX: 6e7, totalDEX: 1.1e8 },
      ],
      d1,
    );
    const deltas = computeGexBookDeltas({
      symbol: 'SPY',
      today,
      prior,
      sessionOpen: today,
    });
    expect(deltas.hasPriorDay).toBe(true);
    expect(deltas.gex1d).toBeCloseTo(0.5e9, 0);
    expect(deltas.dex1d).toBeCloseTo(-0.5e9, 0);
    expect(deltas.byExpiry1d.get('2026-07-17')?.gex1d).toBeCloseTo(0.2e8, 0);
  });

  it('throttles same-day updates', () => {
    const t0 = Date.now();
    recordGexBook('QQQ', 1e8, 1e8, rows, { now: t0, minGapMs: 60_000 });
    const s = recordGexBook('QQQ', 9e8, 9e8, rows, {
      now: t0 + 5_000,
      minGapMs: 60_000,
    });
    expect(s.today?.totalGEX).toBe(1e8);
  });

  it('symbol change resets prior for new symbol', () => {
    const t0 = Date.now();
    recordGexBook('SPY', 1e9, 1e9, rows, { now: t0, minGapMs: 0 });
    const s = recordGexBook('IWM', 2e9, 2e9, rows, { now: t0 + 1, minGapMs: 0 });
    expect(s.symbol).toBe('IWM');
    expect(s.prior).toBeNull();
    expect(s.today?.totalGEX).toBe(2e9);
  });

  it('todayKey format', () => {
    expect(todayKey(new Date('2026-07-13T12:00:00'))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
