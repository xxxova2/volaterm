import { describe, it, expect } from 'vitest';
import {
  classifyDomainFreshness,
  classifyFreshnessFromIso,
  FRESHNESS_THRESHOLDS,
  makeProvenance,
  worstFreshnessKind,
} from './freshness';

describe('classifyDomainFreshness', () => {
  const now = 1_700_000_000_000;

  it('returns demo/down/unknown overrides', () => {
    expect(classifyDomainFreshness(now, 'spot', { demo: true, nowMs: now })).toBe('demo');
    expect(classifyDomainFreshness(now, 'spot', { down: true, nowMs: now })).toBe('down');
    expect(classifyDomainFreshness(null, 'spot', { nowMs: now })).toBe('unknown');
    expect(classifyDomainFreshness(0, 'chain', { nowMs: now })).toBe('unknown');
  });

  it('classifies spot thresholds', () => {
    const t = FRESHNESS_THRESHOLDS.spot;
    expect(classifyDomainFreshness(now - 10_000, 'spot', { nowMs: now })).toBe('live');
    expect(classifyDomainFreshness(now - t.delayedMs - 1, 'spot', { nowMs: now })).toBe('delayed');
    expect(classifyDomainFreshness(now - t.staleMs - 1, 'spot', { nowMs: now })).toBe('stale');
    expect(classifyDomainFreshness(now - t.expiredMs - 1, 'spot', { nowMs: now })).toBe('expired');
  });

  it('applies leave-LIVE hysteresis', () => {
    // Age slightly past delayed but previous was live → stay live at 1.2×
    const delayed = FRESHNESS_THRESHOLDS.spot.delayedMs;
    const age = delayed + 1_000; // still < 1.2 * delayed (54s)
    expect(
      classifyDomainFreshness(now - age, 'spot', {
        nowMs: now,
        previousKind: 'live',
        leaveLiveFactor: 1.2,
      }),
    ).toBe('live');
  });

  it('macro domain matches 15m/30m order of magnitude', () => {
    expect(FRESHNESS_THRESHOLDS.macro.delayedMs).toBe(900_000);
    expect(FRESHNESS_THRESHOLDS.macro.staleMs).toBe(1_800_000);
  });
});

describe('classifyFreshnessFromIso', () => {
  it('defaults stale at 30m (DataBadge alignment)', () => {
    const iso = new Date(Date.now() - 20 * 60_000).toISOString();
    expect(classifyFreshnessFromIso(iso)).toBe('delayed');
    const older = new Date(Date.now() - 45 * 60_000).toISOString();
    expect(classifyFreshnessFromIso(older)).toBe('stale');
  });
});

describe('makeProvenance', () => {
  it('builds store record', () => {
    const p = makeProvenance('chain', 'yfinance', Date.now(), { label: 'chain:yf' });
    expect(p.domain).toBe('chain');
    expect(p.source).toBe('yfinance');
    expect(p.kind).toBe('live');
    expect(p.asOfMs).toBeTruthy();
  });
});

describe('worstFreshnessKind', () => {
  it('returns min rank (down < expired < stale < delayed < unknown < live)', () => {
    expect(worstFreshnessKind('live', 'delayed')).toBe('delayed');
    expect(worstFreshnessKind('live', 'stale', 'delayed')).toBe('stale');
    expect(worstFreshnessKind('unknown', 'live')).toBe('unknown');
    expect(worstFreshnessKind('expired', 'down', 'live')).toBe('down');
    expect(worstFreshnessKind('live')).toBe('live');
  });

  it('ranks demo with stale (worse than delayed)', () => {
    expect(worstFreshnessKind('demo', 'delayed')).toBe('demo');
    expect(worstFreshnessKind('delayed', 'demo')).toBe('demo');
    // same rank as stale — either may win; both must beat delayed/live
    const demoVsStale = worstFreshnessKind('demo', 'stale');
    expect(demoVsStale === 'demo' || demoVsStale === 'stale').toBe(true);
    expect(worstFreshnessKind('demo', 'live')).toBe('demo');
  });

  it('returns unknown for empty input', () => {
    expect(worstFreshnessKind()).toBe('unknown');
  });
});
