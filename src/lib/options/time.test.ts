import { describe, it, expect } from 'vitest';
import {
  parseYmd,
  expiryCloseUtc,
  yearFractionToExpiry,
  calendarDte,
  usEquitySession,
  etWallTimeToUtc,
} from './time';

describe('parseYmd', () => {
  it('parses valid dates', () => {
    expect(parseYmd('2026-07-17')).toEqual({ y: 2026, m: 7, d: 17 });
  });
  it('rejects garbage', () => {
    expect(parseYmd('not-a-date')).toBeNull();
    expect(parseYmd('')).toBeNull();
  });
});

describe('expiryCloseUtc / yearFractionToExpiry', () => {
  it('places close near 16:00 America/New_York', () => {
    // Pick a winter date (EST = UTC-5) so 16:00 ET == 21:00 UTC.
    const close = expiryCloseUtc('2026-01-16')!;
    const asEt = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(close));
    // hour can be "16" or "16:00" depending on engine; check starts with 16
    expect(asEt.startsWith('16')).toBe(true);
  });

  it('returns ~30/365 for a 30-calendar-day expiry from a fixed now', () => {
    // 16:00 ET on 2026-02-16 relative to 16:00 ET on 2026-01-17 = 30 days.
    const now = etWallTimeToUtc(2026, 1, 17, 16, 0, 0);
    const T = yearFractionToExpiry('2026-02-16', now)!;
    expect(T).toBeCloseTo(30 / 365.25, 3);
  });

  it('returns tiny residual after the close', () => {
    const after = etWallTimeToUtc(2026, 1, 16, 17, 0, 0);
    const T = yearFractionToExpiry('2026-01-16', after)!;
    expect(T).toBeGreaterThan(0);
    expect(T).toBeLessThan(1 / (365 * 24)); // less than an hour in year-fraction terms
  });

  it('calendarDte is at least 1 before close on expiry day', () => {
    const morning = etWallTimeToUtc(2026, 1, 16, 10, 0, 0);
    expect(calendarDte('2026-01-16', morning)).toBe(1);
  });
});

describe('usEquitySession', () => {
  it('marks midweek midday as open', () => {
    // Wednesday 2026-01-14 12:00 ET
    const noon = etWallTimeToUtc(2026, 1, 14, 12, 0, 0);
    const s = usEquitySession(noon);
    expect(s.isOpen).toBe(true);
    expect(s.phase).toBe('open');
  });

  it('marks Saturday as closed', () => {
    const sat = etWallTimeToUtc(2026, 1, 17, 12, 0, 0);
    const s = usEquitySession(sat);
    expect(s.isOpen).toBe(false);
    expect(s.phase).toBe('closed');
  });

  it('marks pre-open weekday as pre', () => {
    const pre = etWallTimeToUtc(2026, 1, 14, 8, 0, 0);
    const s = usEquitySession(pre);
    expect(s.isOpen).toBe(false);
    expect(s.phase).toBe('pre');
  });

  it('marks New Year observed holiday as holiday', async () => {
    const { isUsEquityHoliday } = await import('./time');
    // 2026-01-01 is Thursday — holiday
    expect(isUsEquityHoliday(2026, 1, 1)).toBe(true);
    const nye = etWallTimeToUtc(2026, 1, 1, 12, 0, 0);
    const s = usEquitySession(nye);
    expect(s.isOpen).toBe(false);
    expect(s.phase).toBe('holiday');
  });

  it('recognizes Thanksgiving 2026 (Nov 26)', async () => {
    const { isUsEquityHoliday } = await import('./time');
    expect(isUsEquityHoliday(2026, 11, 26)).toBe(true);
  });
});
