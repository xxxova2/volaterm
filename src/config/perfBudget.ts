/**
 * Performance budgets — measure first (DEV marks), then encode targets.
 * Dual-chart crypto mode is excluded from the 16ms store-tick budget.
 */

export const PERF_BUDGET = {
  /** Desk switch time-to-interactive (main content painted / interactive). */
  deskSwitchTtiMs: 100,
  /** Option chain row model build (not paint). */
  chainRowBuildMs: 8,
  /** Rates panel Promise.allSettled aggregate load p95. */
  ratesLoadP95Ms: 2_500,
  /** Store refresh main-thread work when only spot patches (not dual-chart rebuild). */
  storeSpotPatchMs: 16,
  /** Virtual list overscan (rows above/below viewport). */
  virtualOverscan: 6,
  /** Max DOM rows for virtualized boards (approx overscan*2 + visible). */
  maxVirtualDomRows: 40,
  /** Dual crypto excluded from storeSpotPatchMs — flag for docs/tests. */
  dualChartExcludedFromStoreTick: true,
} as const;

const isDev =
  typeof import.meta !== 'undefined' &&
  // vite
  !!(import.meta as { env?: { DEV?: boolean } }).env?.DEV;

/** DEV-only performance mark helper; no-ops in production. */
export function perfMark(name: string): void {
  if (!isDev || typeof performance === 'undefined') return;
  try {
    performance.mark(name);
  } catch {
    /* ignore */
  }
}

export function perfMeasure(name: string, startMark: string, endMark?: string): number | null {
  if (!isDev || typeof performance === 'undefined') return null;
  try {
    const end = endMark ?? `${startMark}-end`;
    if (!endMark) performance.mark(end);
    performance.measure(name, startMark, end);
    const entries = performance.getEntriesByName(name, 'measure');
    const last = entries[entries.length - 1];
    return last?.duration ?? null;
  } catch {
    return null;
  }
}

/** Time a sync function in DEV; returns result + optional duration. */
export function perfTimeSync<T>(label: string, fn: () => T): T {
  if (!isDev) return fn();
  const t0 = performance.now();
  try {
    return fn();
  } finally {
    const ms = performance.now() - t0;
    if (ms > PERF_BUDGET.storeSpotPatchMs) {
      // eslint-disable-next-line no-console
      console.debug(`[perf] ${label}: ${ms.toFixed(1)}ms`);
    }
  }
}
