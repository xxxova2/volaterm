/**
 * Daily dealer-book samples for MenthorQ-style GEX/DEX Change 1D.
 * Browser localStorage only — fail-closed, no synthetic levels.
 *
 * Semantics:
 * - **1D Δ** = today latest − prior calendar day last sample (null until we have a prior day)
 * - **Session Δ** = today latest − first sample of today
 */
import type { DealerExpiryRow } from './analytics';

const STORAGE_KEY = 'terminal.gex.book.v1';
const MIN_GAP_MS = 60_000; // throttle same-day updates

export type GexBookExpirySample = {
  expiry: string;
  dte: number;
  totalGEX: number;
  totalDEX: number;
};

export type GexBookDay = {
  symbol: string;
  day: string; // YYYY-MM-DD local
  t: number;
  totalGEX: number;
  totalDEX: number;
  byExpiry: GexBookExpirySample[];
};

export type GexBookStore = {
  symbol: string;
  today: GexBookDay | null;
  /** Frozen last sample from a previous calendar day (for 1D Δ). */
  prior: GexBookDay | null;
  /** First sample of the current day (for session Δ). */
  sessionOpen: GexBookDay | null;
};

export type GexBookDeltas = {
  /** today.totalGEX − prior.totalGEX (null if no prior day) */
  gex1d: number | null;
  dex1d: number | null;
  /** today − sessionOpen */
  gexSession: number | null;
  dexSession: number | null;
  /** Per-expiry 1D when expiry still present on both books */
  byExpiry1d: Map<string, { gex1d: number | null; dex1d: number | null }>;
  hasPriorDay: boolean;
  priorDay: string | null;
};

export function todayKey(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function emptyStore(symbol: string): GexBookStore {
  return { symbol, today: null, prior: null, sessionOpen: null };
}

export function readGexBookStore(): GexBookStore | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GexBookStore;
    if (!parsed?.symbol) return null;
    return {
      symbol: parsed.symbol,
      today: parsed.today ?? null,
      prior: parsed.prior ?? null,
      sessionOpen: parsed.sessionOpen ?? null,
    };
  } catch {
    return null;
  }
}

function writeGexBookStore(store: GexBookStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* quota / private */
  }
}

export function buildGexBookDay(
  symbol: string,
  day: string,
  totalGEX: number,
  totalDEX: number,
  expiryRows: Pick<DealerExpiryRow, 'expiry' | 'dte' | 'totalGEX' | 'totalDEX'>[],
  t = Date.now(),
): GexBookDay {
  return {
    symbol,
    day,
    t,
    totalGEX,
    totalDEX,
    byExpiry: expiryRows.map((r) => ({
      expiry: r.expiry,
      dte: r.dte,
      totalGEX: r.totalGEX,
      totalDEX: r.totalDEX,
    })),
  };
}

/**
 * Record a live book sample. Rolls prior on calendar day / symbol change.
 * Throttles same-day updates to MIN_GAP_MS (first sample always written).
 */
export function recordGexBook(
  symbol: string,
  totalGEX: number,
  totalDEX: number,
  expiryRows: Pick<DealerExpiryRow, 'expiry' | 'dte' | 'totalGEX' | 'totalDEX'>[],
  opts?: { now?: number; minGapMs?: number },
): GexBookStore {
  const now = opts?.now ?? Date.now();
  const minGap = opts?.minGapMs ?? MIN_GAP_MS;
  const day = todayKey(new Date(now));
  const sample = buildGexBookDay(symbol, day, totalGEX, totalDEX, expiryRows, now);

  let store = readGexBookStore();
  if (!store || store.symbol !== symbol) {
    store = emptyStore(symbol);
  }

  // Day roll: freeze yesterday as prior
  if (store.today && store.today.day !== day) {
    store = {
      symbol,
      prior: store.today,
      today: sample,
      sessionOpen: sample,
    };
    writeGexBookStore(store);
    return store;
  }

  // First sample of this day
  if (!store.today) {
    store = {
      symbol,
      prior: store.prior?.symbol === symbol ? store.prior : null,
      today: sample,
      sessionOpen: sample,
    };
    writeGexBookStore(store);
    return store;
  }

  // Throttle mid-day updates
  if (now - store.today.t < minGap) {
    return store;
  }

  store = {
    ...store,
    today: sample,
    sessionOpen: store.sessionOpen ?? sample,
  };
  writeGexBookStore(store);
  return store;
}

export function loadGexBook(symbol: string): GexBookStore | null {
  const s = readGexBookStore();
  if (!s || s.symbol !== symbol) return null;
  return s;
}

/** Compute 1D and session deltas from a store snapshot. */
export function computeGexBookDeltas(store: GexBookStore | null): GexBookDeltas {
  const empty: GexBookDeltas = {
    gex1d: null,
    dex1d: null,
    gexSession: null,
    dexSession: null,
    byExpiry1d: new Map(),
    hasPriorDay: false,
    priorDay: null,
  };
  if (!store?.today) return empty;

  const today = store.today;
  const prior = store.prior?.symbol === store.symbol ? store.prior : null;
  const open = store.sessionOpen;

  const gex1d = prior != null ? today.totalGEX - prior.totalGEX : null;
  const dex1d = prior != null ? today.totalDEX - prior.totalDEX : null;
  const gexSession = open != null ? today.totalGEX - open.totalGEX : null;
  const dexSession = open != null ? today.totalDEX - open.totalDEX : null;

  const byExpiry1d = new Map<string, { gex1d: number | null; dex1d: number | null }>();
  const priorMap = new Map((prior?.byExpiry ?? []).map((e) => [e.expiry, e]));
  for (const e of today.byExpiry) {
    const p = priorMap.get(e.expiry);
    byExpiry1d.set(e.expiry, {
      gex1d: p != null ? e.totalGEX - p.totalGEX : null,
      dex1d: p != null ? e.totalDEX - p.totalDEX : null,
    });
  }

  return {
    gex1d,
    dex1d,
    gexSession,
    dexSession,
    byExpiry1d,
    hasPriorDay: prior != null,
    priorDay: prior?.day ?? null,
  };
}

/** Test helper — clear store. */
export function clearGexBookStore(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
