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
    /** Alias of info in CSS (`--cyan: var(--info)`); prefer not for multi-series ordinals */
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
    /**
     * 7th ordinal slot — not aliased to info.
     * CSS `--cyan` equals `--info`, so multi-series needs a distinct mix.
     */
    tertiary: 'color-mix(in oklab, var(--rate) 55%, var(--down) 45%)',
  },
} as const;

/**
 * Multi-series ordinal palette — cycle for spreads / smile expiries.
 * All entries are unique string tokens (no cyan≡info collision).
 */
export const CHART_SERIES_ORDINAL = [
  CHART.series.info, // 0
  CHART.series.up, // 1
  CHART.series.warn, // 2
  CHART.series.rate, // 3
  CHART.series.down, // 4
  CHART.series.brand, // 5
  CHART.series.tertiary, // 6 distinct pink-purple mix
] as const;

/**
 * Shared spread series colors for CurvesBoard + ShapeSection.
 * One map so both boards always paint the same logical series the same way.
 */
export const CHART_SPREAD = {
  '2s10s': CHART_SERIES_ORDINAL[0],
  '5s30s': CHART_SERIES_ORDINAL[1],
  '2s5s': CHART_SERIES_ORDINAL[2],
  '5s10s': CHART_SERIES_ORDINAL[5], // brand — not cyan/info
  '10s30s': CHART_SERIES_ORDINAL[3], // rate
  '3m10y': CHART_SERIES_ORDINAL[4], // down
  'fly_2s5s10s': CHART_SERIES_ORDINAL[6], // tertiary (distinct from rate)
} as const;

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
 * Fixed bins intentionally — high-contrast heatmap for dense numeric grids;
 * not theme-tracked (light mint / amber cells stay readable on dark desk).
 * Returns background + foreground for a Pearson coefficient.
 */
export function chartCorrColors(v: number): { bg: string; fg: string } {
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
  // White only on saturated blue bins; pale mint/amber need dark ink (incl. strong neg ρ)
  const fg = v >= 0.6 ? '#fff' : '#1e3a5f';
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
