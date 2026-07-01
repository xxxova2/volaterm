import type { SurfaceGrid } from './types';

export interface NoArbResult {
  calendar: {
    flags: boolean[][];
    violations: number;
  };
  butterfly: {
    flags: boolean[][];
    violations: number;
  };
  clean: boolean;
}

function emptyFlags(rows: number, cols: number): boolean[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => false));
}

/**
 * Detect calendar arbitrage: for a fixed strike, total implied variance
 * w(k, T) = IV^2 * T should be non-decreasing with time to expiration.
 */
function detectCalendarArb(grid: SurfaceGrid): { flags: boolean[][]; violations: number } {
  const rows = grid.iv.length;
  const cols = grid.strikes.length;
  const flags = emptyFlags(rows, cols);
  let violations = 0;
  if (rows < 2 || cols === 0) return { flags, violations };

  // Use the DTE values carried by the grid. If absent (e.g. legacy/manual grids),
  // fall back to deriving from expiry strings as days since today, clamped to >= 1.
  const dtes: number[] = grid.dtes && grid.dtes.length === rows
    ? grid.dtes
    : grid.expiries.map((_, i) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const exp = new Date(grid.expiries[i]!);
        exp.setHours(0, 0, 0, 0);
        return Math.max(1, Math.round((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
      });
  const years = dtes.map(d => d / 365);
  const totalVar = grid.iv.map((row, i) => row.map(iv => (iv == null ? null : iv * iv * years[i]!)));

  for (let c = 0; c < cols; c++) {
    let prev: number | null = null;
    for (let r = 0; r < rows; r++) {
      const w = totalVar[r]![c];
      if (w == null) continue;
      if (prev != null && w < prev - 1e-10) {
        flags[r]![c] = true;
        violations++;
      }
      prev = w;
    }
  }
  return { flags, violations };
}

/**
 * Detect butterfly arbitrage: IV^2 should be convex in log-moneyness k.
 * For three consecutive strikes we check the discrete second difference of
 * w = IV^2 in k-space.
 */
function detectButterflyArb(grid: SurfaceGrid, spot: number): { flags: boolean[][]; violations: number } {
  const rows = grid.iv.length;
  const cols = grid.strikes.length;
  const flags = emptyFlags(rows, cols);
  let violations = 0;
  if (rows === 0 || cols < 3) return { flags, violations };

  const k = grid.strikes.map(s => Math.log(s / spot));

  for (let r = 0; r < rows; r++) {
    const row = grid.iv[r]!;
    for (let c = 1; c < cols - 1; c++) {
      const wL = row[c - 1] == null ? null : row[c - 1]! * row[c - 1]!;
      const wM = row[c] == null ? null : row[c]! * row[c]!;
      const wR = row[c + 1] == null ? null : row[c + 1]! * row[c + 1]!;
      if (wL == null || wM == null || wR == null) continue;

      const dkL = k[c]! - k[c - 1]!;
      const dkR = k[c + 1]! - k[c]!;
      if (dkL <= 0 || dkR <= 0) continue;

      // Convexity: second divided difference of w(k) should be >= 0.
      // Use non-uniform grid formula.
      const secondDiff = (wR - wM) / dkR - (wM - wL) / dkL;
      const avgDenom = (dkL + dkR) / 2;
      if (secondDiff < -1e-8 * avgDenom) {
        flags[r]![c] = true;
        violations++;
      }
    }
  }
  return { flags, violations };
}

/**
 * Run calendar and butterfly arbitrage diagnostics on a fitted surface grid.
 *
 * @param grid  surface IV grid (expiries x strikes)
 * @param spot  underlying spot/reference price for log-moneyness
 * @returns flags and violation counts for each arbitrage type plus a clean summary
 */
export function diagnoseArbitrage(grid: SurfaceGrid, spot: number): NoArbResult {
  const cal = detectCalendarArb(grid);
  const fly = detectButterflyArb(grid, spot);
  return {
    calendar: cal,
    butterfly: fly,
    clean: cal.violations === 0 && fly.violations === 0,
  };
}
