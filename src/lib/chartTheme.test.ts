import { describe, expect, it } from 'vitest';
import {
  CANVAS,
  CHART,
  CHART_GREEK,
  CHART_HEX,
  CHART_RESOLVED,
  CHART_SCENARIO,
  CHART_SERIES_ORDINAL,
  CHART_SPREAD,
  DESK_SERIES,
  PLOTLY_CS_GEX,
  PLOTLY_CS_IV,
  PLOTLY_LAYOUT_BASE,
  canvasCellColor,
  chartAxisLabelStyle,
  chartCorrColors,
  chartDayTick,
  chartGridProps,
  chartPctTick,
  chartPriceTick,
  chartSignedTick,
  chartTooltipStyle,
  colorWithAlpha,
  cssVar,
  parseRgbChannels,
  resolveCanvasColors,
  tightDomain,
} from './chartTheme';

describe('tightDomain', () => {
  it('pads around data range instead of anchoring at 0', () => {
    const [lo, hi] = tightDomain([2.8, 3.1, 3.4, 3.0], 0.1);
    expect(typeof lo).toBe('number');
    expect(typeof hi).toBe('number');
    expect(lo as number).toBeGreaterThan(2);
    expect(lo as number).toBeLessThan(2.8);
    expect(hi as number).toBeGreaterThan(3.4);
    expect(hi as number).toBeLessThan(4);
  });

  it('can include zero for spread charts', () => {
    const [lo, hi] = tightDomain([-7, -3, -10], 0.1, { includeZero: true });
    expect(lo as number).toBeLessThan(0);
    expect(hi as number).toBeGreaterThanOrEqual(0);
  });
});

describe('chartTheme', () => {
  it('exposes series role tokens without raw hex', () => {
    for (const v of Object.values(CHART.series)) {
      expect(v).not.toMatch(/#[0-9a-fA-F]{3,8}/);
      // CSS vars or color-mix of vars (tertiary ordinal slot)
      expect(v.startsWith('var(--') || v.startsWith('color-mix(')).toBe(true);
    }
    expect(CHART.series.up).toBe('var(--up)');
    expect(CHART.series.down).toBe('var(--down)');
  });

  it('CHART_SERIES_ORDINAL has 7 unique theme-aware entries', () => {
    expect(CHART_SERIES_ORDINAL).toHaveLength(7);
    expect(new Set(CHART_SERIES_ORDINAL).size).toBe(CHART_SERIES_ORDINAL.length);
    // cyan aliases info — ordinal uses info once, never a duplicate cyan slot
    expect(CHART.series.cyan).toBe(CHART.series.info);
    expect(CHART_SERIES_ORDINAL.filter((c) => c === CHART.series.info)).toHaveLength(1);
    expect(CHART_SERIES_ORDINAL[0]).toBe(CHART.series.info);
    expect(CHART_SERIES_ORDINAL[6]).toBe(CHART.series.tertiary);
  });

  it('CHART_SPREAD maps every spread key to unique colors', () => {
    const keys = Object.keys(CHART_SPREAD) as (keyof typeof CHART_SPREAD)[];
    expect(keys).toEqual([
      '2s10s',
      '5s30s',
      '2s5s',
      '5s10s',
      '10s30s',
      '3m10y',
      'fly_2s5s10s',
    ]);
    const colors = keys.map((k) => CHART_SPREAD[k]);
    expect(new Set(colors).size).toBe(colors.length);
    // fly must not collide with 10s30s (both were purple under partial migration)
    expect(CHART_SPREAD.fly_2s5s10s).not.toBe(CHART_SPREAD['10s30s']);
    // 5s10s must not collide with 2s10s (cyan was aliased to info)
    expect(CHART_SPREAD['5s10s']).not.toBe(CHART_SPREAD['2s10s']);
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
    expect(chartCorrColors(0.7).fg).toBe('#fff');
    expect(chartCorrColors(0.3).bg).toBe('#86efac');
    expect(chartCorrColors(0.3).fg).toBe('#1e3a5f');
    expect(chartCorrColors(0.05).bg).toBe('#ecfdf5');
    expect(chartCorrColors(-0.2).bg).toBe('#fde68a');
    expect(chartCorrColors(-0.2).fg).toBe('#1e3a5f');
  });

  it('chartCorrColors keeps readable contrast on strong negative ρ', () => {
    // Pale amber bin → dark ink (never white-on-yellow)
    const strongNeg = chartCorrColors(-0.9);
    expect(strongNeg.bg).toBe('#fde68a');
    expect(strongNeg.fg).toBe('#1e3a5f');
    expect(strongNeg.fg).not.toBe('#fff');
  });

  it('shared tooltip / grid helpers use CHART tokens', () => {
    expect(chartTooltipStyle.background).toBe(CHART.tooltipBg);
    expect(chartGridProps.stroke).toBe(CHART.grid);
  });

  it('CHART_RESOLVED / CANVAS expose brand/grid/label hex for canvas & Three', () => {
    expect(CHART_RESOLVED.brand).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(CHART_RESOLVED.grid).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(CHART_RESOLVED.gridMinor).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(CHART_RESOLVED.label).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(CANVAS.brand).toBe(CHART_RESOLVED.brand);
    expect(CANVAS.grid).toBe(CHART_RESOLVED.grid);
    expect(CANVAS.up).toBe(CHART_RESOLVED.up);
    expect(CANVAS.down).toBe(CHART_RESOLVED.down);
  });

  it('cssVar falls back when property missing', () => {
    expect(cssVar('--definitely-not-a-token-xyz', '#abc123')).toBe('#abc123');
  });

  it('parseRgbChannels and colorWithAlpha handle hex', () => {
    expect(parseRgbChannels('#f0b400')).toEqual([240, 180, 0]);
    expect(parseRgbChannels('#fff')).toEqual([255, 255, 255]);
    expect(colorWithAlpha('#3fb950', 0.5)).toBe('rgba(63, 185, 80, 0.5)');
  });

  it('canvasCellColor uses up/down for diverging and info for sequential', () => {
    const pos = canvasCellColor(1, -1, 1, true);
    const neg = canvasCellColor(-1, -1, 1, true);
    const seq = canvasCellColor(1, 0, 1, false);
    // Uses CANVAS/CHART_RESOLVED tokens (may change with theme hex tweaks)
    expect(pos).toMatch(/^rgba\(\d+, \d+, \d+,/);
    expect(neg).toMatch(/^rgba\(\d+, \d+, \d+,/);
    expect(seq).toMatch(/^rgba\(\d+, \d+, \d+,/);
    expect(pos).not.toBe(neg);
  });

  it('resolveCanvasColors returns brand/grid/label roles', () => {
    const c = resolveCanvasColors();
    expect(c.brand).toBeTruthy();
    expect(c.grid).toBeTruthy();
    expect(c.label).toBeTruthy();
    expect(c.up).toBeTruthy();
    expect(c.down).toBeTruthy();
  });

  it('PLOTLY_LAYOUT_BASE uses terminal card chrome (not pure black / matrix green)', () => {
    expect(PLOTLY_LAYOUT_BASE.paper_bgcolor).toBe(CHART_RESOLVED.card);
    expect(PLOTLY_LAYOUT_BASE.plot_bgcolor).toBe(CHART_RESOLVED.card);
    expect(PLOTLY_LAYOUT_BASE.font.color).toBe(CHART_RESOLVED.mutedForeground);
    expect(String(PLOTLY_LAYOUT_BASE.paper_bgcolor)).not.toMatch(/#0a0a0a|#000000/i);
  });

  it('PLOTLY_CS_GEX / IV anchor up-down and brand (no matrix green)', () => {
    const gexColors = PLOTLY_CS_GEX.map(([, c]) => c);
    expect(gexColors).toContain(CHART_RESOLVED.up);
    expect(gexColors).toContain(CHART_RESOLVED.down);
    const ivColors = PLOTLY_CS_IV.map(([, c]) => c);
    expect(ivColors).toContain(CHART_RESOLVED.brand);
    expect(ivColors.join(' ')).not.toMatch(/#00ff41/i);
  });

  it('CHART_HEX exposes concrete fills for Plotly candles/bars', () => {
    expect(CHART_HEX.up).toBe(CHART_RESOLVED.up);
    expect(CHART_HEX.down).toBe(CHART_RESOLVED.down);
    expect(CHART_HEX.brand).toBe(CHART_RESOLVED.brand);
    expect(CHART_HEX.card).toBe(CHART_RESOLVED.card);
  });
});

describe('DESK_SERIES', () => {
  it('maps desk roles to CHART series tokens', () => {
    expect(DESK_SERIES.combo).toBe(CHART.series.live);
    expect(DESK_SERIES.long).toBe(CHART.series.info);
    expect(DESK_SERIES.short).toBe(CHART.series.down);
    expect(DESK_SERIES.spot).toBe(CHART.series.amber);
    expect(DESK_SERIES.median).toBe(CHART.series.brand);
    expect(DESK_SERIES.bandOuter).toBe(CHART.series.info);
    expect(DESK_SERIES.bandInner).toBe(CHART.series.brand);
    expect(DESK_SERIES.zero).toBe(CHART.series.muted);
    expect(DESK_SERIES.historyLive).toBe(CHART.series.live);
    expect(DESK_SERIES.historyCompare).toBe(CHART.series.compare);
  });

  it('keeps long and short visually distinct', () => {
    expect(DESK_SERIES.long).not.toBe(DESK_SERIES.short);
  });
});

describe('chart tick formatters', () => {
  it('chartPriceTick formats by magnitude', () => {
    expect(chartPriceTick(1234)).toBe('1234');
    expect(chartPriceTick(12.34)).toBe('12.3');
    expect(chartPriceTick(1.234)).toBe('1.23');
    expect(chartPriceTick(NaN)).toBe('—');
  });

  it('chartPctTick formats fractions and raw percents', () => {
    expect(chartPctTick(0.123)).toBe('12.3%');
    expect(chartPctTick(12.3, false)).toBe('12.3%');
    expect(chartPctTick(NaN)).toBe('—');
  });

  it('chartDayTick rounds to whole days', () => {
    expect(chartDayTick(21.4)).toBe('21d');
    expect(chartDayTick(NaN)).toBe('—');
  });

  it('chartSignedTick adds + for positive values', () => {
    expect(chartSignedTick(-12.3)).toBe('-12.3');
    expect(chartSignedTick(12.3)).toBe('+12.3');
    expect(chartSignedTick(0)).toBe('0.0');
    expect(chartSignedTick(NaN)).toBe('—');
  });
});

describe('chartAxisLabelStyle', () => {
  it('uses muted axis fill and mono font', () => {
    expect(chartAxisLabelStyle.fill).toBe(CHART.axisMuted);
    expect(chartAxisLabelStyle.fontSize).toBe(10);
    expect(chartAxisLabelStyle.fontFamily).toMatch(/mono/);
  });
});
