import type { CSSProperties } from 'react';

/**
 * Shared Recharts / chart styling — token roles only (D-PR-1).
 */
export const CHART = {
  grid: 'var(--grid)',
  gridDash: '2 3',
  axis: 'var(--muted-foreground)',
  axisSize: 10,
  axisMuted: 'var(--muted-foreground)',
  tooltipBg: 'var(--card)',
  tooltipBorder: '1px solid var(--border)',
  tooltipRadius: 6,
  tooltipFont: 10,
  tooltipFamily: 'var(--font-mono), ui-monospace, monospace',
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

export const chartGridProps = {
  stroke: CHART.grid,
  strokeDasharray: CHART.gridDash,
};

export function chartTooltipProps() {
  return { contentStyle: chartTooltipStyle };
}
