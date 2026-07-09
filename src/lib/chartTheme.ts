import type { CSSProperties } from 'react';

/**
 * Shared Recharts / chart styling — one terminal look across desks (Phase B).
 */
export const CHART = {
  grid: 'var(--grid)',
  gridDash: '2 3',
  axis: 'var(--muted-foreground)',
  axisSize: 9,
  axisMuted: '#71717a',
  tooltipBg: 'var(--card)',
  tooltipBorder: '1px solid var(--border)',
  tooltipRadius: 6,
  tooltipFont: 10,
  tooltipFamily: 'var(--font-mono), ui-monospace, monospace',
  /** Series palette — avoid rainbow defaults */
  series: {
    primary: '#3b82f6',
    up: '#22c55e',
    down: '#ef4444',
    amber: '#f59e0b',
    violet: '#a78bfa',
    cyan: '#06b6d4',
    muted: '#71717a',
  },
} as const;

export const chartTooltipStyle: CSSProperties = {
  background: CHART.tooltipBg,
  border: CHART.tooltipBorder,
  borderRadius: CHART.tooltipRadius,
  fontSize: CHART.tooltipFont,
  fontFamily: CHART.tooltipFamily,
  color: 'var(--foreground)',
};

export const chartAxisTick = {
  fill: CHART.axisMuted,
  fontSize: CHART.axisSize,
  fontFamily: 'var(--font-mono), ui-monospace, monospace',
};

/** Common props for <CartesianGrid /> */
export const chartGridProps = {
  stroke: CHART.grid,
  strokeDasharray: CHART.gridDash,
};

/** Common props for <Tooltip contentStyle=… /> */
export function chartTooltipProps() {
  return { contentStyle: chartTooltipStyle };
}
