import type { CSSProperties } from 'react';

/**
 * Shared Recharts / chart styling — token roles only (D-PR-1).
 * Hex literals are allowed only in this file (ordinal / heatmap definitions).
 */
export const CHART = {
  grid: 'var(--grid)',
  gridDash: '2 3',
  axis: 'var(--muted-foreground)',
  axisSize: 10,
  axisMuted: 'var(--muted-foreground)',
  axisLine: 'var(--border)',
  refLine: 'var(--border)',
  tooltipBg: 'var(--card)',
  tooltipBorder: '1px solid var(--border)',
  tooltipRadius: 6,
  tooltipFont: 10,
  tooltipFamily: 'var(--font-mono), ui-monospace, monospace',
  tooltipFg: 'var(--foreground)',
  legend: 'var(--muted-foreground)',
  series: {
    primary: 'var(--brand)',
    brand: 'var(--brand)',
    up: 'var(--up)',
    down: 'var(--down)',
    warn: 'var(--warn)',
    info: 'var(--info)',
    rate: 'var(--rate)',
    amber: 'var(--brand)',
    cyan: 'var(--info)',
    muted: 'var(--muted-foreground)',
    /** Dual-path live series (white) */
    live: 'var(--foreground)',
    /** Dual-path compare / prior series (blue) */
    compare: 'var(--info)',
    /** Selected / highlight stroke (smile focus) */
    selected: 'var(--brand)',
    /** SVI fit overlay */
    svi: 'var(--rate)',
  },
} as const;

/**
 * Multi-series ordinal palette — cycle for spreads / smile expiries.
 * Distinct role tokens; theme-aware via CSS vars.
 */
export const CHART_SERIES_ORDINAL = [
  CHART.series.info, // 0 blue-ish
  CHART.series.up, // 1 green
  CHART.series.warn, // 2 amber
  CHART.series.rate, // 3 purple
  CHART.series.down, // 4 red
  CHART.series.brand, // 5 orange/brand
  CHART.series.cyan, // 6 cyan (= info, 2nd pass)
] as const;

/** Named greek series map (delta / gamma / theta / vega). */
export const CHART_GREEK = {
  delta: CHART.series.info,
  gamma: CHART.series.up,
  theta: CHART.series.warn,
  vega: CHART.series.rate,
} as const;

/** Scenario bars: down-shift · base · up-shift */
export const CHART_SCENARIO = [
  CHART.series.warn,
  CHART.series.muted,
  CHART.series.up,
] as const;

/**
 * Correlation matrix cell colors (hex OK inside chartTheme).
 * Returns background + foreground for a Pearson coefficient.
 */
export function chartCorrColors(v: number): { bg: string; fg: string } {
  const a = Math.abs(v);
  const bg =
    v >= 0.9
      ? '#1d4ed8'
      : v >= 0.6
        ? '#3b82f6'
        : v >= 0.2
          ? '#86efac'
          : v >= 0
            ? '#ecfdf5'
            : '#fde68a';
  const fg = a >= 0.85 ? '#fff' : '#1e3a5f';
  return { bg, fg };
}

export const chartTooltipStyle: CSSProperties = {
  background: CHART.tooltipBg,
  border: CHART.tooltipBorder,
  borderRadius: CHART.tooltipRadius,
  fontSize: CHART.tooltipFont,
  fontFamily: CHART.tooltipFamily,
  color: CHART.tooltipFg,
};

export const chartAxisTick = {
  fill: CHART.axisMuted,
  fontSize: CHART.axisSize,
  fontFamily: 'var(--font-mono), ui-monospace, monospace',
};

export const chartGridProps = {
  stroke: CHART.grid,
  strokeDasharray: CHART.gridDash,
};

export function chartTooltipProps() {
  return { contentStyle: chartTooltipStyle };
}
