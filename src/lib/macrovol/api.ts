/**
 * MacroVol API client — all calls go through our Node proxy at /api/macrovol/*
 * which forwards to the MacroVol FastAPI (FRED + yfinance).
 */

const BASE = '/api/macrovol';

async function fetchJson<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { Accept: 'application/json', ...(init?.headers || {}) },
  });
  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  if (!res.ok) {
    const msg = (data as { error?: string; detail?: string })?.error
      || (data as { detail?: string })?.detail
      || `HTTP ${res.status}`;
    throw new Error(String(msg));
  }
  if (data && typeof data === 'object' && 'error' in data && (data as { error?: string }).error) {
    throw new Error(String((data as { error: string }).error));
  }
  return data as T;
}

export const macrovolApi = {
  /** Probe rates summary as a cheap health check (proxy → MacroVol FastAPI). */
  health: async () => {
    try {
      await fetchJson(`${BASE}/rates/summary`);
      return { status: 'ok' as const };
    } catch {
      return { status: 'down' as const };
    }
  },

  ratesSummary: () => fetchJson<RatesSummary>(`${BASE}/rates/summary`),
  ratesCurve: () => fetchJson<RatesCurve>(`${BASE}/rates/curve`),
  ratesPlumbing: () => fetchJson<PlumbingData>(`${BASE}/rates/plumbing`),
  ratesBasis: () => fetchJson<BasisData>(`${BASE}/rates/basis`),
  ratesBasisHistory: (limit = 90) =>
    fetchJson<BasisHistoryData>(`${BASE}/rates/basis-history?limit=${limit}`),
  ratesCurveHistory: (periods = '1M') =>
    fetchJson(`${BASE}/rates/curve-history?periods=${encodeURIComponent(periods)}`),
  ratesShape: (history = 60) =>
    fetchJson<CurveShapeData>(`${BASE}/rates/shape?history=${history}`),
  ratesDv01: (params?: {
    n2?: number; n5?: number; n10?: number; n30?: number;
    shock_2?: number; shock_5?: number; shock_10?: number; shock_30?: number;
  }) => {
    const q = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v != null) q.set(k, String(v));
      });
    }
    const qs = q.toString();
    return fetchJson<Dv01BookData>(`${BASE}/rates/dv01${qs ? `?${qs}` : ''}`);
  },
  ratesTermStructure: (T = 0.25) =>
    fetchJson<TermStructureData>(`${BASE}/rates/term-structure?T=${T}`),
  correlations: (window = 30, period = '1y') =>
    fetchJson<CorrelationData>(`${BASE}/rates/correlations?window=${window}&period=${encodeURIComponent(period)}`),

  macroSummary: () => fetchJson<MacroSummary>(`${BASE}/macro/summary`),
  series: (id: string, limit = 500) =>
    fetchJson<SeriesData>(`${BASE}/macro/series/${encodeURIComponent(id)}?limit=${limit}`),

  stirStrip: () => fetchJson<StirStripData>(`${BASE}/stir/strip`),

  /** Omit r to let MacroVol API default to live SOFR. */
  surface: (ticker: string, r?: number | null, q = 0.0) => {
    const params = new URLSearchParams();
    if (r != null) params.set('r', String(r));
    params.set('q', String(q));
    return fetchJson<IVSurfaceData>(`${BASE}/surface/${encodeURIComponent(ticker)}?${params}`);
  },
  surfacePreview: (ticker: string) =>
    fetchJson(`${BASE}/surface/${encodeURIComponent(ticker)}/preview`),

  /** Omit r to let API use live SOFR as risk-free. */
  greeks: (ticker: string, r?: number | null, q = 0.013) => {
    const params = new URLSearchParams();
    if (r != null) params.set('r', String(r));
    params.set('q', String(q));
    return fetchJson<GreeksData>(`${BASE}/greeks/${encodeURIComponent(ticker)}?${params}`);
  },
  greeksHistory: (ticker: string, period = '1mo') =>
    fetchJson<HistoryData>(`${BASE}/greeks/${encodeURIComponent(ticker)}/history?period=${encodeURIComponent(period)}`),
};

// ── Types ────────────────────────────────────────────────────

export interface RatesSummary {
  sofr: number | null;
  effr: number | null;
  usy2: number | null;
  usy10: number | null;
  /** FRED percentage points (0.35 = 35 bps). */
  spread_2s10s: number | null;
  spread_3m10y: number | null;
  spread_unit?: string;
  spread_note?: string;
  risk_free_rate?: number | null;
  field_source?: Record<string, string>;
  obs_dates?: Record<string, string | null>;
  as_of?: string;
  source?: string;
}

export interface RatesCurve {
  labels: string[];
  yields: (number | null)[];
  series_ids?: string[];
  obs_dates?: (string | null)[];
  note?: string;
  as_of?: string;
  source?: string;
}

export interface PlumbingData {
  iorb: number | null;
  sofr: number | null;
  effr: number | null;
  rrp_rate: number | null;
  rrp_rate_source?: string;
  rrp_rate_note?: string;
  rrp_volume_latest: number | null;
  rrp_volume_history: { date: string; volume: number }[];
  wresbal_history: { date: string; reserves: number }[];
  as_of?: string;
  source?: string;
}

export interface BasisData {
  sofr: number;
  effr: number;
  iorb: number;
  sofr_effr: number;
  sofr_iorb: number;
  effr_iorb: number;
  unit?: string;
  regime?: string;
  regime_note?: string;
  context?: Record<string, string>;
  obs_dates?: Record<string, string | null>;
  as_of?: string;
  source?: string;
}

export interface BasisHistoryPoint {
  date: string;
  sofr: number;
  effr: number;
  iorb: number;
  sofr_effr_bps: number;
  sofr_iorb_bps: number;
  effr_iorb_bps: number;
}

export interface BasisHistoryData {
  history: BasisHistoryPoint[];
  latest: BasisHistoryPoint | null;
  zscore: {
    sofr_effr: number | null;
    sofr_iorb: number | null;
    effr_iorb: number | null;
    window: number;
  };
  unit?: string;
  note?: string;
  as_of?: string;
  source?: string;
}

export interface MacroSummary {
  cpi_yoy: number | null;
  core_cpi_yoy: number | null;
  core_pce_yoy: number | null;
  nfp_mom: number | null;
  unemployment: number | null;
  retail_sales: number | null;
  housing_starts: number | null;
  fed_balance_sheet: number | null;
  units?: Record<string, string>;
  obs_dates?: Record<string, string | null>;
  fallback_fields?: string[];
  note?: string;
  as_of?: string;
  source?: string;
}

export interface StirContract {
  contract: string;
  /** Board ticker e.g. SFRM6 */
  ticker?: string;
  month: string;
  implied_rate: number | null;
  /** Futures price (≈ 100 − implied rate) */
  last_price?: number | null;
  prev_close?: number | null;
  /** Settlement proxy = previous close (CME board) */
  settlement?: number | null;
  high?: number | null;
  low?: number | null;
  open?: number | null;
  volume?: number | null;
  product?: string | null;
  /** Price change last − prev */
  net?: number | null;
  change?: number | null;
  source: 'live' | 'fallback' | 'unavailable' | string;
  historical_1w?: number | null;
  historical_1m?: number | null;
  historical_3m?: number | null;
}

export interface NyFedRefPrint {
  code: string;
  rate?: number | null;
  p1?: number | null;
  p25?: number | null;
  p75?: number | null;
  p99?: number | null;
  volume_bn?: number | null;
  effective_date?: string | null;
  target_from?: number | null;
  target_to?: number | null;
}

/** Trader-facing implication chip from strip/spread levels */
export interface ImplyRead {
  bias: string;
  label: string;
  text: string;
  confidence?: string;
}

export interface SerffBoardRow {
  cc: string;
  name: string;
  description?: string;
  last_bps?: number | null;
  price_spread?: number | null;
  legs?: string[];
  kind?: string;
  imply?: ImplyRead | null;
}

export interface StirSpread {
  name: string;
  kind: 'calendar' | 'fly' | 'pack' | 'serff' | 'inter' | 'cash' | string;
  legs: string[];
  rate_bps: number | null;
  price_spread?: number | null;
  implied_rate?: number | null;
  note?: string;
  priority?: number;
  imply?: ImplyRead | null;
}

export interface StirSpreadsBlock {
  spreads: StirSpread[];
  by_kind?: Record<string, StirSpread[]>;
  counts?: Record<string, number>;
  note?: string;
  labels3?: string[];
}

export interface StirPathPoint {
  contract?: string;
  month?: string;
  ticker?: string;
  implied_rate: number | null;
  source?: string;
  vs_sofr_bps?: number | null;
  imply?: ImplyRead | null;
}

export interface StirStripData {
  sr3: StirContract[];
  sr1?: StirContract[];
  zq: StirContract[];
  treasury_futures?: StirContract[];
  live_count: number;
  live_sr1?: number;
  live_zq?: number;
  live_tsy?: number;
  total_sr3: number;
  fallback_count?: number;
  unavailable_count?: number;
  history_note?: string | null;
  quality_note?: string;
  delivery_note?: string;
  spreads?: StirSpreadsBlock;
  serff_board?: SerffBoardRow[];
  nyfed?: {
    rates?: Record<string, unknown>;
    sofr_avg?: {
      avg_30d?: number | null;
      avg_90d?: number | null;
      avg_180d?: number | null;
      index?: number | null;
      effective_date?: string | null;
    } | null;
    target?: { from?: number | null; to?: number | null; mid?: number | null } | null;
    corridor?: { sofr_effr_bps?: number | null };
    as_of?: string | null;
    source?: string;
    note?: string;
    ref_print?: NyFedRefPrint[];
  };
  effr?: number | null;
  iorb?: number | null;
  path?: {
    points: StirPathPoint[];
    live_count?: number;
    sofr?: number | null;
    path_change_bps?: number | null;
    approx_25bp_cuts_priced?: number | null;
    front_vs_sofr_bps?: number | null;
    note?: string;
    front?: StirPathPoint | null;
    back?: StirPathPoint | null;
    imply?: ImplyRead | null;
    front_imply?: ImplyRead | null;
  };
  chart?: Array<{
    x: string;
    contract?: string;
    ticker?: string;
    implied_rate: number | null;
    /** Prior settlement implied yield = 100 − settlement/prev_close */
    prior_rate?: number | null;
    source?: string;
    vs_sofr_bps?: number | null;
  }>;
  sofr?: number | null;
  as_of?: string;
  source?: string;
}

export interface CurveShapeSpread {
  pp: number | null;
  bps: number | null;
  formula?: string;
  note?: string;
  imply?: ImplyRead | null;
}

export interface CurveShapeData {
  spreads: Record<string, CurveShapeSpread>;
  levels: Record<string, number | null>;
  regime: string;
  regime_note?: string;
  imply?: ImplyRead | null;
  unit_note?: string;
  curve?: { labels: string[]; yields: (number | null)[]; obs_dates?: (string | null)[] };
  history?: {
    spark_2s10s?: number[];
    spark_5s30s?: number[];
    spark_2s5s?: number[];
    spark_5s10s?: number[];
    spark_10s30s?: number[];
    spark_3m10y?: number[];
    spark_fly?: number[];
    '2s10s'?: { date: string; spread_bps: number }[];
    '5s30s'?: { date: string; spread_bps: number }[];
    '2s5s'?: { date: string; spread_bps: number }[];
    '5s10s'?: { date: string; spread_bps: number }[];
    '10s30s'?: { date: string; spread_bps: number }[];
    '3m10y'?: { date: string; spread_bps: number }[];
    fly_2s5s10s?: { date: string; spread_bps: number }[];
  };
  as_of?: string;
  source?: string;
}

export interface Dv01Row {
  tenor: string;
  years: number;
  yield_pct: number | null;
  face_mm: number;
  mac_duration?: number | null;
  mod_duration?: number | null;
  dv01_usd: number | null;
  dv01_per_mm?: number | null;
}

export interface Dv01BookData {
  rows: Dv01Row[];
  parallel_dv01_usd: number;
  key_rate_dv01_usd: Record<string, number | null>;
  shock_bp?: number;
  pnl_if_parallel_up_1bp_usd?: number;
  pnl_if_parallel_down_1bp_usd?: number;
  note?: string;
  scenario?: {
    total_pnl_usd: number;
    details: Array<{ tenor: string; shock_bp: number; dv01_usd?: number; pnl_usd: number | null }>;
    note?: string;
  };
  curve_yields?: Record<string, number | null>;
  as_of?: string;
  source?: string;
}

export interface TermStructureData {
  T: number;
  r: number;
  r_pct: number;
  r_source?: string;
  curve_points?: { T: number; r: number; r_pct: number }[];
  sofr?: number | null;
  as_of?: string;
  source?: string;
}

export interface SeriesData {
  series: string;
  data: { date: string; value: number }[];
  as_of?: string;
  source?: string;
}

export interface CorrelationData {
  instruments: string[];
  matrix: number[][];
  as_of?: string;
  note?: string;
  source?: string;
  error?: string;
}

export interface IVSurfaceData {
  ticker?: string;
  spot: number;
  strikes: number[];
  expiries: number[];
  iv_grid: number[][];
  raw_points?: number;
  r?: number;
  q?: number;
  r_source?: string;
  timestamp?: string;
  as_of?: string;
  source?: string;
  error?: string;
}

export interface GreeksPoint {
  T: number;
  K: number;
  iv: number;
  oi: number;
  type: 'call' | 'put';
  delta: number;
  gamma: number;
  vega: number;
  theta: number;
  vanna: number;
  charm: number;
}

export interface SurfaceGrid {
  T_vals: number[];
  K_vals: number[];
  grid: (number | null)[][];
}

export interface GreeksData {
  ticker: string;
  spot: number;
  timestamp?: string;
  total_points: number;
  atm: GreeksPoint | null;
  gex: { strike: number; gex: number }[];
  gex_flip?: { strike: number; spot_vs_flip: string; net_gex: number } | null;
  gex_convention?: string;
  points: GreeksPoint[];
  surfaces?: Record<string, SurfaceGrid>;
  gex_grid?: SurfaceGrid;
  charm_grid?: SurfaceGrid;
  r?: number;
  q?: number;
  r_source?: string;
  charm_note?: string;
  as_of?: string;
  source?: string;
  error?: string;
}

export interface HistoryData {
  ticker: string;
  data: { date: string; open: number; high: number; low: number; close: number; volume: number }[];
  as_of?: string;
  source?: string;
}
