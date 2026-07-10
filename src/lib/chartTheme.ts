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

// ── Canvas 2D / R3F / Plotly resolved colors (hex OK only here) ─────────────

/**
 * Static hex fallbacks for canvas, Three.js, and Plotly.
 * Hex literals are intentional and confined to this module (KD-UI-04).
 * Approximate graphite–amber theme oklch tokens from `src/index.css`.
 */
export const CHART_RESOLVED = {
  brand: '#f0b400',
  up: '#3fb950',
  down: '#f0883e',
  info: '#4d8ff0',
  warn: '#c9a227',
  rate: '#a78bfa',
  /** Primary grid (gridHelper major / surface lattice) */
  grid: '#2a2a33',
  /** Secondary / minor grid lines */
  gridMinor: '#1f1f26',
  /** Axis / muted labels */
  label: '#9ca3af',
  foreground: '#ebe6dc',
  background: '#1c1a16',
  emptyCell: 'rgba(0,0,0,0.04)',
} as const;

/**
 * Canvas / R3F role colors — SSR-safe hex from CHART_RESOLVED.
 * Prefer `resolveCanvasColors()` at draw time when DOM theme should win.
 */
export const CANVAS = {
  brand: CHART_RESOLVED.brand,
  up: CHART_RESOLVED.up,
  down: CHART_RESOLVED.down,
  info: CHART_RESOLVED.info,
  warn: CHART_RESOLVED.warn,
  rate: CHART_RESOLVED.rate,
  grid: CHART_RESOLVED.grid,
  gridMinor: CHART_RESOLVED.gridMinor,
  label: CHART_RESOLVED.label,
  empty: CHART_RESOLVED.emptyCell,
  foreground: CHART_RESOLVED.foreground,
  background: CHART_RESOLVED.background,
} as const;

/** Read a CSS custom property from `:root`. Returns fallback when SSR/missing. */
export function cssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return raw || fallback;
}

let _colorProbe: HTMLSpanElement | null = null;

/**
 * Resolve any CSS color (var, oklch, named) to a canvas/WebGL-safe `rgb()` string.
 * Falls back when DOM is unavailable or resolution fails.
 */
export function resolveCssColor(cssColor: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const trimmed = cssColor.trim();
  if (/^#([0-9a-fA-F]{3,8})$/.test(trimmed)) return trimmed;
  try {
    if (!_colorProbe) {
      _colorProbe = document.createElement('span');
      _colorProbe.style.position = 'fixed';
      _colorProbe.style.left = '-9999px';
      _colorProbe.style.pointerEvents = 'none';
      _colorProbe.setAttribute('aria-hidden', 'true');
      document.documentElement.appendChild(_colorProbe);
    }
    _colorProbe.style.color = '';
    _colorProbe.style.color = trimmed;
    const c = getComputedStyle(_colorProbe).color;
    if (!c || c === 'rgba(0, 0, 0, 0)' || c === 'transparent') return fallback;
    return c;
  } catch {
    return fallback;
  }
}

/** Parse `#rgb` / `#rrggbb` / `rgb()` / `rgba()` → [r,g,b] 0–255. */
export function parseRgbChannels(color: string): [number, number, number] | null {
  const s = color.trim();
  const hex = s.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (hex) {
    const h = hex[1]!;
    if (h.length === 3) {
      return [
        parseInt(h[0]! + h[0]!, 16),
        parseInt(h[1]! + h[1]!, 16),
        parseInt(h[2]! + h[2]!, 16),
      ];
    }
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ];
  }
  const rgb = s.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*[\d.]+)?\s*\)$/i,
  );
  if (rgb) {
    return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  }
  return null;
}

/** Apply alpha to a hex/rgb color → `rgba(r,g,b,a)`. Falls back to input if unparseable. */
export function colorWithAlpha(color: string, alpha: number): string {
  const ch = parseRgbChannels(color);
  if (!ch) return color;
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${ch[0]}, ${ch[1]}, ${ch[2]}, ${a})`;
}

export type CanvasColors = {
  brand: string;
  up: string;
  down: string;
  info: string;
  warn: string;
  rate: string;
  grid: string;
  gridMinor: string;
  label: string;
  empty: string;
  foreground: string;
  background: string;
};

/**
 * Snapshot theme colors for one canvas paint or R3F mount.
 * Resolves CSS vars when DOM is present; otherwise CHART_RESOLVED hex.
 */
export function resolveCanvasColors(): CanvasColors {
  const r = CHART_RESOLVED;
  return {
    brand: resolveCssColor(cssVar('--brand', r.brand), r.brand),
    up: resolveCssColor(cssVar('--up', r.up), r.up),
    down: resolveCssColor(cssVar('--down', r.down), r.down),
    info: resolveCssColor(cssVar('--info', r.info), r.info),
    warn: resolveCssColor(cssVar('--warn', r.warn), r.warn),
    rate: resolveCssColor(cssVar('--rate', r.rate), r.rate),
    grid: resolveCssColor(cssVar('--grid', r.grid), r.grid),
    gridMinor: resolveCssColor(cssVar('--border', r.gridMinor), r.gridMinor),
    label: resolveCssColor(cssVar('--muted-foreground', r.label), r.label),
    empty: r.emptyCell,
    foreground: resolveCssColor(cssVar('--foreground', r.foreground), r.foreground),
    background: resolveCssColor(cssVar('--background', r.background), r.background),
  };
}

/**
 * Heatmap cell fill: diverging → up/down; sequential → info.
 * Matches prior opacity ramps used by Greeks/Canvas heatmaps.
 */
export function canvasCellColor(
  v: number,
  min: number,
  max: number,
  diverging: boolean,
  colors: Pick<CanvasColors, 'up' | 'down' | 'info'> = CANVAS,
): string {
  if (diverging) {
    const m = Math.max(Math.abs(min), Math.abs(max)) || 1;
    const t = v / m;
    if (t >= 0) return colorWithAlpha(colors.up, 0.12 + Math.min(1, t) * 0.78);
    return colorWithAlpha(colors.down, 0.12 + Math.min(1, -t) * 0.78);
  }
  const t = max > min ? (v - min) / (max - min) : 0.5;
  return colorWithAlpha(colors.info, 0.08 + t * 0.85);
}
