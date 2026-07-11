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
    amber: 'var(--warn)',
    /** Alias of info in CSS (`--cyan: var(--info)`); prefer not for multi-series ordinals */
    cyan: 'var(--info)',
    muted: 'var(--muted-foreground)',
    /** Dual-path live series (white) */
    live: 'var(--foreground)',
    /** Dual-path compare / prior series (blue) */
    compare: 'var(--info)',
    /** Selected / highlight stroke (smile focus) */
    selected: 'var(--info)',
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
 * Approximate terminal navy + amber chrome from `src/index.css`.
 */
export const CHART_RESOLVED = {
  brand: '#e8a838',
  up: '#3ecf6a',
  down: '#e07050',
  info: '#6b9fd4',
  warn: '#d4a017',
  rate: '#a78bfa',
  /** Primary grid (gridHelper major / surface lattice) */
  grid: '#1e2a3d',
  /** Secondary / minor grid lines */
  gridMinor: '#141c2b',
  /** Axis / muted labels */
  label: '#8b95a8',
  mutedForeground: '#8b95a8',
  foreground: '#ebe6d8',
  background: '#0a0e18',
  card: '#0e1420',
  muted: '#151c2c',
  border: '#243044',
  emptyCell: 'rgba(0,0,0,0.04)',
  /** Near-black navy for dense zero cells */
  ink: '#070a10',
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
  try {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return raw || fallback;
  } catch {
    return fallback;
  }
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
  return colorWithAlpha(colors.info, 0.1 + Math.max(0, Math.min(1, t)) * 0.75);
}

/**
 * Shared Plotly chrome — paper/plot/font/grid from terminal tokens.
 * Plotly paints on canvas; prefers concrete colors (use CHART_RESOLVED).
 */
export const PLOTLY_LAYOUT_BASE = {
  paper_bgcolor: CHART_RESOLVED.card,
  plot_bgcolor: CHART_RESOLVED.card,
  font: {
    color: CHART_RESOLVED.mutedForeground,
    size: 10,
    family: 'JetBrains Mono, ui-monospace, monospace',
  },
} as const;

/** 2D axis chrome for Plotly heatmaps / candles */
export const PLOTLY_AXIS = {
  color: CHART_RESOLVED.mutedForeground,
  gridcolor: CHART_RESOLVED.grid,
  tickfont: { size: 9, color: CHART_RESOLVED.mutedForeground },
  zerolinecolor: CHART_RESOLVED.border,
} as const;

/** 3D scene axis chrome (surfaces) */
export const PLOTLY_SCENE_AXIS = {
  color: CHART_RESOLVED.mutedForeground,
  gridcolor: CHART_RESOLVED.grid,
  backgroundcolor: CHART_RESOLVED.background,
  showbackground: true as const,
};

export const PLOTLY_COLORBAR = {
  thickness: 14,
  tickfont: { color: CHART_RESOLVED.mutedForeground, size: 10 },
  title: { font: { color: CHART_RESOLVED.mutedForeground, size: 11 } },
} as const;

/**
 * Diverging analytic scales — negative = down, positive = up, mid = card.
 * Positions span -1..1 so Plotly zmid:0 heatmaps stay symmetric.
 */
export const PLOTLY_CS_GEX: [number, string][] = [
  [-1, '#4a0a0e'],
  [-0.667, '#9a1820'],
  [-0.334, CHART_RESOLVED.down],
  [-0.001, '#3a2c22'],
  [0, CHART_RESOLVED.card],
  [0.001, '#1a2a1c'],
  [0.334, '#2d9a48'],
  [0.667, CHART_RESOLVED.up],
  [1, '#1a5c28'],
];

export const PLOTLY_CS_CHARM: [number, string][] = [
  [-1, '#2a1038'],
  [-0.667, '#6a3a8a'],
  [-0.334, CHART_RESOLVED.rate],
  [-0.001, '#3a2c22'],
  [0, CHART_RESOLVED.card],
  [0.001, '#1a2a1c'],
  [0.334, '#2d9a48'],
  [0.667, CHART_RESOLVED.up],
  [1, '#1a5c28'],
];

/** Sequential IV surface: graphite → info → brand → warn (no Matrix green) */
export const PLOTLY_CS_IV: [number, string][] = [
  [0, CHART_RESOLVED.muted],
  [0.2, '#1e3a42'],
  [0.4, CHART_RESOLVED.info],
  [0.6, '#5a9a6a'],
  [0.8, CHART_RESOLVED.brand],
  [1, CHART_RESOLVED.warn],
];

/** Per-greek surface colorscales (Plotly hex; sequential / diverging) */
export const PLOTLY_CS_GREEK: Record<string, string | [number, string][]> = {
  delta: [
    [0, CHART_RESOLVED.background],
    [0.5, '#0a5a6a'],
    [1, CHART_RESOLVED.info],
  ],
  gamma: [
    [0, CHART_RESOLVED.background],
    [0.5, '#1a5c28'],
    [1, CHART_RESOLVED.up],
  ],
  vega: [
    [0, CHART_RESOLVED.background],
    [0.5, CHART_RESOLVED.brand],
    [1, CHART_RESOLVED.foreground],
  ],
  theta: [
    [0, CHART_RESOLVED.background],
    [0.5, CHART_RESOLVED.down],
    [1, CHART_RESOLVED.foreground],
  ],
  vanna: [
    [0, CHART_RESOLVED.down],
    [0.5, CHART_RESOLVED.card],
    [1, CHART_RESOLVED.up],
  ],
  charm: [
    [0, CHART_RESOLVED.background],
    [0.4, CHART_RESOLVED.rate],
    [0.7, CHART_RESOLVED.info],
    [1, CHART_RESOLVED.up],
  ],
};

/** Named greek accent colors for labels / ATM chips (CSS vars OK in DOM) */
export const CHART_GREEK_EXT = {
  delta: CHART.series.info,
  gamma: CHART.series.up,
  vega: CHART.series.brand,
  theta: CHART.series.down,
  vanna: CHART.series.rate,
  charm: CHART.series.info,
} as const;

/** Hex accents for Plotly candle / bar fills that need concrete colors */
export const CHART_HEX = {
  up: CHART_RESOLVED.up,
  down: CHART_RESOLVED.down,
  brand: CHART_RESOLVED.brand,
  info: CHART_RESOLVED.info,
  warn: CHART_RESOLVED.warn,
  rate: CHART_RESOLVED.rate,
  muted: CHART_RESOLVED.mutedForeground,
  grid: CHART_RESOLVED.grid,
  card: CHART_RESOLVED.card,
  border: CHART_RESOLVED.border,
  foreground: CHART_RESOLVED.foreground,
  ink: CHART_RESOLVED.ink,
  /** GEX calendar positive intensity base */
  gexPos: CHART_RESOLVED.up,
  gexNeg: CHART_RESOLVED.down,
} as const;
