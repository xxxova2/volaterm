import type { HeatmapCell } from './greeksTypes';

export interface HeatmapAggregate {
  min: number | null;
  max: number | null;
  mean: number | null;
}

export interface HeatmapAggregateByExpiry extends HeatmapAggregate {
  dte: number;
}

export interface HeatmapAggregateByStrike extends HeatmapAggregate {
  strike: number;
}

export interface HeatmapAggregates {
  byExpiry: HeatmapAggregateByExpiry[];
  byStrike: HeatmapAggregateByStrike[];
}

/**
 * Aggregate finite `value` fields across the heatmap. Each expiry row produces
 * one entry in `byExpiry`; each strike column produces one entry in `byStrike`.
 *
 * Cells with `null`, `undefined`, or non-finite numeric values are excluded
 * from min/max/mean. If no cells contribute finite values for a row/column,
 * all three statistics are reported as `null`.
 */
export function computeHeatmapAggregates(
  cellMatrix: HeatmapCell[][],
): HeatmapAggregates {
  const byExpiry: HeatmapAggregateByExpiry[] = [];
  for (let r = 0; r < cellMatrix.length; r += 1) {
    const row = cellMatrix[r] ?? [];
    const stats = finiteStats(row.map(c => c.value));
    const dte = row[0]?.dte ?? 0;
    byExpiry.push({ dte, ...stats });
  }

  const colCount = cellMatrix.reduce((m, row) => Math.max(m, row.length), 0);
  const byStrike: HeatmapAggregateByStrike[] = [];
  for (let c = 0; c < colCount; c += 1) {
    const colValues = cellMatrix.map(row => row[c]?.value ?? null);
    const stats = finiteStats(colValues);
    const strike = cellMatrix.find(row => row[c])?.[c]?.strike ?? 0;
    byStrike.push({ strike, ...stats });
  }

  return { byExpiry, byStrike };
}

function finiteStats(values: Array<number | null | undefined>): {
  min: number | null;
  max: number | null;
  mean: number | null;
} {
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  let count = 0;
  for (const v of values) {
    if (v == null) continue;
    if (typeof v !== 'number') continue;
    if (!isFinite(v)) continue;
    if (v < min) min = v;
    if (v > max) max = v;
    sum += v;
    count += 1;
  }
  if (count === 0) {
    return { min: null, max: null, mean: null };
  }
  return { min, max, mean: sum / count };
}
