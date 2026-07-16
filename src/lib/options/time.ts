/**
 * Market time utilities for US equity options.
 *
 * Equity/ETF options typically stop trading at the regular close
 * (16:00 America/New_York) on the expiration date. Using integer calendar
 * days and bare `new Date('YYYY-MM-DD')` (UTC midnight) distorts 0DTE/weekly
 * IVs and Greeks. We convert the expiry wall-clock to UTC and use ACT/365.25
 * year fractions (common for continuous-time equity vol modelling).
 */

const ET = 'America/New_York';
const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

/** Convert a wall-clock time in America/New_York to a UTC epoch ms. */
export function etWallTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute = 0,
  second = 0,
): number {
  // Initial guess: treat ET as UTC-5 (EST). Iterate using the real offset.
  let utc = Date.UTC(year, month - 1, day, hour + 5, minute, second);
  for (let i = 0; i < 4; i++) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: ET,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(new Date(utc));
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? NaN);
    const gotY = get('year');
    const gotM = get('month');
    const gotD = get('day');
    let gotH = get('hour');
    // Some engines report midnight as 24.
    if (gotH === 24) gotH = 0;
    const gotMi = get('minute');
    const gotS = get('second');
    const desired = Date.UTC(year, month - 1, day, hour, minute, second);
    const actual = Date.UTC(gotY, gotM - 1, gotD, gotH, gotMi, gotS);
    const delta = desired - actual;
    if (Math.abs(delta) < 500) break;
    utc += delta;
  }
  return utc;
}

/** Parse `YYYY-MM-DD` safely (no UTC-midnight Date parse). */
export function parseYmd(expiry: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(expiry.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return { y, m: mo, d };
}

/** Epoch ms of regular-session close (16:00 ET) on the expiry date. */
export function expiryCloseUtc(expiry: string): number | null {
  const p = parseYmd(expiry);
  if (!p) return null;
  return etWallTimeToUtc(p.y, p.m, p.d, 16, 0, 0);
}

/** Memo close-epoch per YYYY-MM-DD (stable calendar mapping). */
const expiryCloseCache = new Map<string, number | null>();

function cachedExpiryCloseUtc(expiry: string): number | null {
  if (expiryCloseCache.has(expiry)) return expiryCloseCache.get(expiry)!;
  const close = expiryCloseUtc(expiry);
  expiryCloseCache.set(expiry, close);
  return close;
}

/**
 * Continuous year fraction from `now` to the expiry close (16:00 ET).
 * Returns null if the expiry cannot be parsed.
 * After the close, returns a tiny positive residual so solvers don't blow up
 * (callers should still filter expired slices).
 */
export function yearFractionToExpiry(expiry: string, now: number = Date.now()): number | null {
  const close = cachedExpiryCloseUtc(expiry);
  if (close == null) return null;
  const left = close - now;
  if (left <= 0) return 1 / (365.25 * 24 * 60 * 60); // ~1 second
  return left / MS_PER_YEAR;
}

/**
 * Continuous T for pricing / greeks from an expiry slice.
 * Prefer ACT/365.25 to 16:00 ET when that residual is still meaningful.
 * After the close, yearFractionToExpiry returns ~1s residual — then use dte/365
 * if the slice still carries a positive calendar dte (tests / delayed chain labels).
 * Do not use bare `dte/365` alone for live 0DTE midday — continuous wins while open.
 */
export function yearFractionFromSlice(
  slice: { expiry: string; dte: number },
  now: number = Date.now(),
): number {
  const T = yearFractionToExpiry(slice.expiry, now);
  // ~1 second residual after close (see yearFractionToExpiry)
  const postCloseFloor = 1 / (365.25 * 24 * 60 * 60);
  if (T != null && Number.isFinite(T) && T > postCloseFloor * 10) {
    return T;
  }
  if (slice.dte > 0) {
    return Math.max(1e-8, slice.dte / 365);
  }
  if (T != null && T > 0 && Number.isFinite(T)) return T;
  return 1e-8;
}

/** Whole calendar days remaining (ceil), for display / DTE labels. */
export function calendarDte(expiry: string, now: number = Date.now()): number {
  const close = expiryCloseUtc(expiry);
  if (close == null) {
    const fallback = Math.round((new Date(expiry).getTime() - now) / (1000 * 60 * 60 * 24));
    return Math.max(0, fallback);
  }
  const left = close - now;
  if (left <= 0) return 0;
  return Math.max(1, Math.ceil(left / (1000 * 60 * 60 * 24)));
}

export interface SessionStatus {
  /** Regular US equity session open (Mon–Fri 09:30–16:00 ET, excluding holidays). */
  isOpen: boolean;
  /** 'pre' | 'open' | 'after' | 'closed' | 'holiday' */
  phase: 'pre' | 'open' | 'after' | 'closed' | 'holiday';
  /** Minutes since regular open, or null if not a weekday session day. */
  minutesSinceOpen: number | null;
}

/** nth weekday of month (n=1..5; n=-1 = last). weekday: 0=Sun..6=Sat. */
function nthWeekday(year: number, month: number, weekday: number, n: number): number {
  if (n > 0) {
    const first = new Date(Date.UTC(year, month - 1, 1));
    const firstWd = first.getUTCDay();
    let day = 1 + ((weekday - firstWd + 7) % 7) + (n - 1) * 7;
    return day;
  }
  // last weekday of month
  const last = new Date(Date.UTC(year, month, 0)); // last day of month
  const lastWd = last.getUTCDay();
  const day = last.getUTCDate() - ((lastWd - weekday + 7) % 7);
  return day;
}

/** Western Easter Sunday (Anonymous Gregorian algorithm). Returns {m,d}. */
function easterSunday(year: number): { m: number; d: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { m: month, d: day };
}

/** Observed weekday when a fixed holiday falls on a weekend (US markets). */
function observedFixed(year: number, month: number, day: number): string {
  const dt = new Date(Date.UTC(year, month - 1, day));
  const wd = dt.getUTCDay();
  if (wd === 0) day += 1; // Sunday → Monday
  if (wd === 6) day -= 1; // Saturday → Friday
  // Handle month rollover for edge cases (rare for US fixed holidays).
  const obs = new Date(Date.UTC(year, month - 1, day));
  const y = obs.getUTCFullYear();
  const mo = String(obs.getUTCMonth() + 1).padStart(2, '0');
  const d = String(obs.getUTCDate()).padStart(2, '0');
  return `${y}-${mo}-${d}`;
}

/**
 * NYSE / US equity full-day holiday calendar (major fixed + floating).
 * Good enough for session gating; not a full exchange calendar (early closes omitted).
 */
export function isUsEquityHoliday(year: number, month: number, day: number): boolean {
  const ymd = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const holidays = new Set<string>();

  holidays.add(observedFixed(year, 1, 1)); // New Year's
  holidays.add(
    `${year}-01-${String(nthWeekday(year, 1, 1, 3)).padStart(2, '0')}`,
  ); // MLK (3rd Mon Jan)
  holidays.add(
    `${year}-02-${String(nthWeekday(year, 2, 1, 3)).padStart(2, '0')}`,
  ); // Presidents (3rd Mon Feb)

  const easter = easterSunday(year);
  // Good Friday = Easter − 2 days
  const gf = new Date(Date.UTC(year, easter.m - 1, easter.d - 2));
  holidays.add(
    `${gf.getUTCFullYear()}-${String(gf.getUTCMonth() + 1).padStart(2, '0')}-${String(gf.getUTCDate()).padStart(2, '0')}`,
  );

  holidays.add(
    `${year}-05-${String(nthWeekday(year, 5, 1, -1)).padStart(2, '0')}`,
  ); // Memorial (last Mon May)
  holidays.add(observedFixed(year, 6, 19)); // Juneteenth
  holidays.add(observedFixed(year, 7, 4)); // Independence
  holidays.add(
    `${year}-09-${String(nthWeekday(year, 9, 1, 1)).padStart(2, '0')}`,
  ); // Labor (1st Mon Sep)
  holidays.add(
    `${year}-11-${String(nthWeekday(year, 11, 4, 4)).padStart(2, '0')}`,
  ); // Thanksgiving (4th Thu Nov)
  holidays.add(observedFixed(year, 12, 25)); // Christmas

  return holidays.has(ymd);
}

/** Rough US equity session status with holiday awareness. */
export function usEquitySession(now: number = Date.now()): SessionStatus {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ET,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(now));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const wd = get('weekday');
  const year = Number(get('year'));
  const month = Number(get('month'));
  const day = Number(get('day'));
  let hour = Number(get('hour'));
  if (hour === 24) hour = 0;
  const minute = Number(get('minute'));
  const mins = hour * 60 + minute;

  if (wd === 'Sat' || wd === 'Sun') {
    return { isOpen: false, phase: 'closed', minutesSinceOpen: null };
  }
  if (isUsEquityHoliday(year, month, day)) {
    return { isOpen: false, phase: 'holiday', minutesSinceOpen: null };
  }
  const open = 9 * 60 + 30;
  const close = 16 * 60;
  if (mins < open) return { isOpen: false, phase: 'pre', minutesSinceOpen: null };
  if (mins >= close) return { isOpen: false, phase: 'after', minutesSinceOpen: mins - open };
  return { isOpen: true, phase: 'open', minutesSinceOpen: mins - open };
}
