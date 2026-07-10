import { describe, expect, it } from 'vitest';
import {
  CHART,
  CHART_GREEK,
  CHART_SCENARIO,
  CHART_SERIES_ORDINAL,
  chartCorrColors,
  chartGridProps,
  chartTooltipStyle,
} from './chartTheme';

describe('chartTheme', () => {
  it('exposes series role tokens as CSS vars (no raw hex)', () => {
    for (const v of Object.values(CHART.series)) {
      expect(v.startsWith('var(--')).toBe(true);
      expect(v).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    }
    expect(CHART.series.up).toBe('var(--up)');
    expect(CHART.series.down).toBe('var(--down)');
  });

  it('CHART_SERIES_ORDINAL has 7 theme-aware entries', () => {
    expect(CHART_SERIES_ORDINAL).toHaveLength(7);
    for (const c of CHART_SERIES_ORDINAL) {
      expect(c.startsWith('var(--')).toBe(true);
    }
  });

  it('CHART_GREEK maps delta/gamma/theta/vega', () => {
    expect(CHART_GREEK.delta).toBe(CHART.series.info);
    expect(CHART_GREEK.gamma).toBe(CHART.series.up);
    expect(CHART_GREEK.theta).toBe(CHART.series.warn);
    expect(CHART_GREEK.vega).toBe(CHART.series.rate);
  });

  it('CHART_SCENARIO is down-shift · base · up-shift', () => {
    expect(CHART_SCENARIO).toEqual([
      CHART.series.warn,
      CHART.series.muted,
      CHART.series.up,
    ]);
  });

  it('chartCorrColors returns discrete bins for Pearson values', () => {
    expect(chartCorrColors(0.95).bg).toBe('#1d4ed8');
    expect(chartCorrColors(0.95).fg).toBe('#fff');
    expect(chartCorrColors(0.7).bg).toBe('#3b82f6');
    expect(chartCorrColors(0.3).bg).toBe('#86efac');
    expect(chartCorrColors(0.05).bg).toBe('#ecfdf5');
    expect(chartCorrColors(-0.2).bg).toBe('#fde68a');
    expect(chartCorrColors(-0.2).fg).toBe('#1e3a5f');
  });

  it('shared tooltip / grid helpers use CHART tokens', () => {
    expect(chartTooltipStyle.background).toBe(CHART.tooltipBg);
    expect(chartGridProps.stroke).toBe(CHART.grid);
  });
});
