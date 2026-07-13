/**
 * Greeks 1.0 — MacroVol-backed Greeks desk (surfaces, GEX, OI ladder, calendar).
 * IV surface is Vol Structure only — no peer IV tab here.
 * GEX / positions / calendar: dense VS3D/MenthorQ-style chrome (OI-inferred).
 */
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell,
  ComposedChart, Line,
} from 'recharts';
import { dealerExposure } from '../../lib/options/analytics';
import type { VolSnapshot } from '../../lib/options/types';
import { fmtCompact, fmtPrice } from '../../lib/format';
import { macrovolApi, type GreeksData, type HistoryData } from '../../lib/macrovol/api';
import {
  CHART,
  CHART_GREEK_EXT,
  CHART_HEX,
  CHART_RESOLVED,
  PLOTLY_AXIS,
  PLOTLY_COLORBAR,
  PLOTLY_CS_CHARM,
  PLOTLY_CS_GEX,
  PLOTLY_CS_GREEK,
  PLOTLY_LAYOUT_BASE,
  PLOTLY_SCENE_AXIS,
  chartAxisTick,
  chartGridProps,
  chartTooltipStyle,
} from '../../lib/chartTheme';
import { DataBadge } from '../macrovol/DataBadge';
import { Explain } from '../common/Explain';
import { useTerminalStore } from '../../store/terminalStore';
import type { GreekKey } from './greeksTypes';
import { cn } from '../../lib/utils';
import { DealerGreekProfiles } from './DealerGreekProfiles';
import { ChartZoom, useChartZoom } from '../common/ChartZoom';
import { SessionGexHeatmap } from './SessionGexHeatmap';

const Plot = lazy(() => import('react-plotly.js'));
const GreeksSurface3D = lazy(() =>
  import('./GreeksSurface3D').then((m) => ({ default: m.GreeksSurface3D })),
);

type SurfaceTheme = 'plotly' | 'mesh';
const THEME_KEY = 'ui.greeks.surfaceTheme';

function loadSurfaceTheme(): SurfaceTheme {
  try {
    return localStorage.getItem(THEME_KEY) === 'mesh' ? 'mesh' : 'plotly';
  } catch {
    return 'plotly';
  }
}

function saveSurfaceTheme(t: SurfaceTheme) {
  try {
    localStorage.setItem(THEME_KEY, t);
  } catch { /* ignore */ }
}

const MESH_GREEKS = new Set<string>(['delta', 'gamma', 'vega', 'theta', 'vanna', 'charm']);

const TICKERS = [
  { label: 'SPY', value: 'SPY' },
  { label: 'QQQ', value: 'QQQ' },
  { label: 'AAPL', value: 'AAPL' },
  { label: 'NVDA', value: 'NVDA' },
  { label: 'TSLA', value: 'TSLA' },
  { label: 'SPX', value: '^GSPC' },
];

const GREEKS = [
  { key: 'delta', label: 'DELTA', desc: 'Rate of price change per $1 move in spot', formula: '∂V/∂S = Φ(d₁)', color: CHART_GREEK_EXT.delta },
  { key: 'gamma', label: 'GAMMA', desc: 'Rate of delta change. Peaks ATM', formula: '∂²V/∂S² = φ(d₁)/(S·σ·√T)', color: CHART_GREEK_EXT.gamma },
  { key: 'vega', label: 'VEGA', desc: 'P&L per 1% IV move. Always positive', formula: '∂V/∂σ = S·φ(d₁)·√T', color: CHART_GREEK_EXT.vega },
  { key: 'theta', label: 'THETA', desc: 'θ ≠ free income — pays for Γ/volga/vanna risk', formula: '∂V/∂t · Taylor: dV≈θdt+…', color: CHART_GREEK_EXT.theta },
  { key: 'vanna', label: 'VANNA', desc: 'dVega/dSpot. How vega changes with spot', formula: '∂²V/∂S∂σ = −φ(d₁)·d₂/σ', color: CHART_GREEK_EXT.vanna },
  { key: 'charm', label: 'CHARM', desc: 'dDelta/dTime. Delta decay per day', formula: '∂²V/∂S∂t', color: CHART_GREEK_EXT.charm },
];

export function Greeks10View() {
  const storeSymbol = useTerminalStore((s) => s.symbol);
  const snapshot = useTerminalStore((s) => s.snapshot);
  const setDeskSection = useTerminalStore((s) => s.setDeskSection);
  const setDeskContext = useTerminalStore((s) => s.setDeskContext);
  const [ticker, setTicker] = useState(() => {
    const s = storeSymbol || 'SPY';
    return /^[A-Z.^]{1,12}$/i.test(s) ? s : 'SPY';
  });
  const [selectedGreek, setSelectedGreek] = useState('delta');
  const [data, setData] = useState<GreeksData | null>(null);
  const [ohlc, setOhlc] = useState<HistoryData['data']>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [surfaceTheme, setSurfaceTheme] = useState<SurfaceTheme>(loadSurfaceTheme);
  const [custom, setCustom] = useState('');
  /** When true, follow terminal symbol so mesh + MacroVol share the underlier. */
  const [followTerminal, setFollowTerminal] = useState(true);
  /** Expand ticker chips only when user wants a desk-local override. */
  const [symbolPickerOpen, setSymbolPickerOpen] = useState(false);

  // Context chrome only — never rewrite section to legacy `greeks-desk`
  // (not in VOL_SECTIONS / TRADE_SECTIONS → setDeskSection clears → Vol falls back to Surface).
  useEffect(() => {
    const tab = useTerminalStore.getState().activeTab;
    const hostId =
      tab === 'vol' || useTerminalStore.getState().deskSectionId === 'vol-sub-greeks'
        ? 'vol-sub-greeks'
        : 'desk-ws-analyze';

    if (tab === 'desk') {
      setDeskSection('desk-ws-analyze');
      setDeskContext({
        id: 'desk-ws-analyze',
        label: 'Analyze',
        apis: ['MacroVol', 'yfinance'],
      });
    } else if (tab === 'vol') {
      // Keep vol-sub-greeks (parent already set it).
      setDeskContext({
        id: 'vol-sub-greeks',
        label: 'Greeks',
        apis: ['MacroVol', 'yfinance'],
      });
    }

    return () => {
      const cur = useTerminalStore.getState().deskSectionId;
      // Do not stomp sibling Vol tabs (Smile/Term) on unmount.
      if (cur === hostId || cur === 'greeks-desk') {
        setDeskContext({ id: null, label: null, apis: [] });
      }
    };
  }, [setDeskSection, setDeskContext]);

  // Re-read theme when landing from 3D deep-link
  useEffect(() => {
    setSurfaceTheme(loadSurfaceTheme());
  }, []);

  async function load(t: string) {
    setLoading(true);
    setError('');
    setData(null);
    setOhlc([]);
    try {
      // r omitted → MacroVol uses live SOFR / treasury term (not hardcoded 5%)
      // q: prefer terminal snapshot dividend yield when comparing same symbol
      const q =
        snapshot && snapshot.symbol === t && Number.isFinite(snapshot.dividendYield)
          ? snapshot.dividendYield
          : 0.013;
      const [greeksRes, ohlcRes] = await Promise.all([
        macrovolApi.greeks(t, null, q),
        macrovolApi.greeksHistory(t, '1mo').catch(() => ({ ticker: t, data: [] } as HistoryData)),
      ]);
      setData(greeksRes);
      setOhlc(ohlcRes.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(ticker);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload on ticker; q refreshed via load body
  }, [ticker]);

  // Keep Greeks 1.0 underlier in lockstep with terminal when follow is on
  useEffect(() => {
    if (!followTerminal || !storeSymbol) return;
    if (!/^[A-Z.^]{1,12}$/i.test(storeSymbol)) return;
    if (storeSymbol !== ticker) setTicker(storeSymbol);
  }, [storeSymbol, followTerminal, ticker]);

  const greek = GREEKS.find((g) => g.key === selectedGreek)!;
  const surfaceData = data?.surfaces?.[selectedGreek];

  const gexData = data?.gex?.filter((g) => Math.abs(g.gex) > 0) || [];
  const gexTotal = data?.gex_flip?.net_gex ?? gexData.reduce((s, g) => s + g.gex, 0);
  const flipStrike = data?.gex_flip?.strike ?? null;
  const flipSide = data?.gex_flip?.spot_vs_flip ?? null;

  const gexChartData = gexData
    .filter((g) => data && g.strike >= data.spot * 0.93 && g.strike <= data.spot * 1.07)
    .map((g) => ({
      strike: g.strike,
      gex: parseFloat((g.gex / 1e6).toFixed(2)),
      isAtm: Math.abs(g.strike - (data?.spot || 0)) < 3,
    }))
    .sort((a, b) => a.strike - b.strike);

  const colorscale = PLOTLY_CS_GREEK[selectedGreek] ?? PLOTLY_CS_GREEK.delta;
  const meshGreek: GreekKey = MESH_GREEKS.has(selectedGreek)
    ? (selectedGreek as GreekKey)
    : 'gamma';

  const setTheme = (t: SurfaceTheme) => {
    setSurfaceTheme(t);
    saveSurfaceTheme(t);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-2 py-1">
        <span className="text-type-xs font-mono font-bold tracking-wider text-foreground">GREEKS 1.0</span>
        <span className="hidden text-type-2xs font-mono text-muted-foreground sm:inline">
          MacroVol · BS · OTM
          {data?.r != null && (
            <> · r={(data.r * 100).toFixed(2)}% · q={((data.q ?? 0.013) * 100).toFixed(2)}%</>
          )}
          {' · '}θ/charm /day · ν /1vol · IV → Vol Structure
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col gap-3 p-2 font-mono">
            {/* Benn / GVV framing — always one click via Explain */}
            <div className="rounded-lg border border-border/70 bg-card/40 px-2.5 py-1.5 text-type-2xs leading-snug text-muted-foreground">
              <Explain term="taylorGvv">
                <span className="font-semibold text-foreground">Taylor / GVV</span>
              </Explain>
              {' · '}
              dV ≈ θ dt + Δ dS + ν dσ + ½ Γ dS² + ½ Volga dσ² + Vanna dS dσ
              {' · '}
              <Explain term="theta">θ</Explain>
              {' compensates expected second-order risk — short options are not free carry. '}
              Surface shape (GVV) links to these risk factors — keep IV surface as gold standard.
            </div>

            {/* OI-weighted charm / vanna strike profiles from terminal chain */}
            {snapshot && (
              <CharmVannaStrikeProfiles snapshot={snapshot} />
            )}

            {/*
              Symbol chrome: when following terminal (default), underlier is already
              in the header — do not burn a full chip row. Expand only on Change.
            */}
            <div className="flex flex-wrap items-center gap-1.5 text-type-xs">
              <span className="font-semibold text-foreground">{ticker}</span>
              <span className="text-muted-foreground">
                {followTerminal ? '· terminal' : '· desk override'}
              </span>
              {loading && (
                <span className="text-muted-foreground" title="MacroVol option chain fetch">
                  · chain…
                </span>
              )}
              {!loading && data && (
                <span className="text-muted-foreground">
                  · spot {data.spot != null ? `$${data.spot.toFixed(2)}` : '—'}
                </span>
              )}
              <button
                type="button"
                onClick={() => setSymbolPickerOpen((o) => !o)}
                className="rounded border border-border px-1.5 py-0.5 text-muted-foreground hover:border-primary hover:text-foreground"
              >
                {symbolPickerOpen ? 'Hide' : 'Change'}
              </button>
              {!followTerminal && (
                <button
                  type="button"
                  onClick={() => {
                    setFollowTerminal(true);
                    setSymbolPickerOpen(false);
                    if (storeSymbol && /^[A-Z.^]{1,12}$/i.test(storeSymbol)) {
                      setTicker(storeSymbol);
                    }
                  }}
                  className="rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-foreground"
                  title="Track terminal symbol (header underlier)"
                >
                  Follow terminal
                </button>
              )}
            </div>
            {symbolPickerOpen && (
              <div className="flex flex-wrap gap-1.5">
                {TICKERS.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => {
                      setFollowTerminal(false);
                      setTicker(t.value);
                      setSymbolPickerOpen(false);
                    }}
                    className={`rounded border px-2 py-1 text-type-xs ${
                      ticker === t.value
                        ? 'border-primary bg-primary text-primary-foreground font-bold'
                        : 'border-border text-muted-foreground hover:border-primary hover:text-foreground'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
                <input
                  className="w-24 rounded border border-border bg-background px-2 py-1 text-type-xs outline-none"
                  placeholder="Custom…"
                  value={custom}
                  onChange={(e) => setCustom(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && custom.trim()) {
                      setFollowTerminal(false);
                      setTicker(custom.trim());
                      setSymbolPickerOpen(false);
                    }
                  }}
                />
              </div>
            )}
            {data?.surface_note && (
              <p className="text-type-2xs leading-snug text-muted-foreground">{data.surface_note}</p>
            )}
            {data?.charm_note && (
              <p className="text-type-2xs leading-snug text-muted-foreground">{data.charm_note}</p>
            )}

            {error && (
              <div className="rounded border border-down/40 bg-down/15 px-3 py-2 text-xs text-down">
                {error} — Try SPY if index options fail. Ensure MacroVol API is on :8765.
              </div>
            )}

            {data && !loading && (
              <>
                {/* ATM snapshot — chips only; formulas live in Explain on greek labels */}
                <div>
                  <div className="mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <h3 className="text-type-2xs font-semibold tracking-wide text-foreground">ATM</h3>
                    <span className="text-type-2xs text-muted-foreground">
                      {ticker} · ${data.spot?.toFixed(2)} · {data.total_points} pts
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 sm:grid-cols-6">
                    {GREEKS.map((g) => (
                      <button
                        key={g.key}
                        type="button"
                        onClick={() => setSelectedGreek(g.key)}
                        title={`${g.desc} · ${g.formula}`}
                        className={`rounded border px-1.5 py-1 text-left transition-all ${
                          selectedGreek === g.key
                            ? 'border-primary bg-primary/10'
                            : 'border-border bg-card hover:border-border/80'
                        }`}
                      >
                        <div className="text-[10px] font-mono" style={{ color: g.color }}>{g.label}</div>
                        <div className="font-mono text-sm font-bold tabular-nums text-foreground">
                          {data.atm?.[g.key as keyof typeof data.atm] != null
                            ? Number(data.atm[g.key as keyof typeof data.atm]).toFixed(4)
                            : '—'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Greek field — Plotly (G1.0) or R3F mesh theme (same greek / symbol) */}
                <div>
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h3 className="text-xs font-semibold" style={{ color: greek.color }}>{greek.label} SURFACE</h3>
                    <span className="text-type-xs text-muted-foreground">{greek.desc}</span>
                    <div className="ml-auto flex items-center gap-1" role="group" aria-label="Surface theme">
                      <span className="text-type-2xs text-muted-foreground">Viz</span>
                      {([
                        { id: 'plotly' as const, label: 'Plotly' },
                        { id: 'mesh' as const, label: '3D mesh' },
                      ]).map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          data-testid={`greeks-theme-${t.id}`}
                          onClick={() => setTheme(t.id)}
                          className={cn(
                            'rounded px-2 py-0.5 font-mono text-type-2xs',
                            surfaceTheme === t.id
                              ? 'bg-primary text-primary-foreground'
                              : 'border border-border text-muted-foreground hover:border-primary',
                          )}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="mb-1 text-type-2xs text-muted-foreground">
                    {surfaceTheme === 'plotly'
                      ? 'Plotly · MacroVol interpolated OTM field (same API as ATM cards)'
                      : surfaceData?.T_vals?.length
                        ? '3D mesh · MacroVol grid (same numbers as Plotly) · OTM · θ/charm /day · ν /1vol'
                        : '3D mesh · desk LIVE chain fallback until MacroVol grid loads · OTM · θ/charm /day'}
                    {data?.r != null && (
                      <span className="ml-2 tabular-nums">
                        r={(data.r * 100).toFixed(2)}%
                        {data.r_source ? ` (${data.r_source})` : ''}
                        {data.q != null ? ` · q=${(data.q * 100).toFixed(2)}%` : ''}
                      </span>
                    )}
                  </p>
                  <div className="overflow-hidden rounded-xl border border-border bg-card">
                    {surfaceTheme === 'plotly' ? (
                      surfaceData && surfaceData.T_vals?.length > 0 ? (
                        <Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Loading surface…</div>}>
                          <Plot
                            data={[{
                              type: 'surface',
                              x: surfaceData.T_vals,
                              y: surfaceData.K_vals,
                              z: surfaceData.grid,
                              colorscale,
                              colorbar: {
                                ...PLOTLY_COLORBAR,
                                title: { text: greek.label, font: PLOTLY_COLORBAR.title.font },
                              },
                              hovertemplate: `Strike: $%{y:.0f}<br>${greek.label}: %{z:.4f}<extra></extra>`,
                            } as never]}
                            layout={{
                              ...PLOTLY_LAYOUT_BASE,
                              margin: { l: 0, r: 50, t: 24, b: 0 },
                              scene: {
                                xaxis: {
                                  title: { text: 'DTE' },
                                  ticktext: surfaceData.T_vals.map((t) => `${Math.round(t * 365)}d`),
                                  tickvals: surfaceData.T_vals,
                                  ...PLOTLY_SCENE_AXIS,
                                },
                                yaxis: { title: { text: 'Strike ($)' }, ...PLOTLY_SCENE_AXIS },
                                zaxis: { title: { text: greek.label }, ...PLOTLY_SCENE_AXIS },
                                bgcolor: CHART_RESOLVED.card,
                                camera: { eye: { x: 1.6, y: -1.6, z: 0.9 } },
                                aspectmode: 'manual',
                                aspectratio: { x: 2, y: 1.2, z: 0.8 },
                              },
                              height: 320,
                            } as never}
                            config={{ responsive: true, displayModeBar: true, displaylogo: false }}
                            style={{ width: '100%' }}
                          />
                        </Suspense>
                      ) : (
                        <div className="p-4 text-center text-type-2xs text-muted-foreground">
                          No MacroVol surface grid for {greek.label} yet.
                        </div>
                      )
                    ) : (
                      <Suspense fallback={<div className="p-4 text-center text-type-2xs text-muted-foreground">Loading 3D mesh…</div>}>
                        <div className="h-[320px]">
                          <GreeksSurface3D
                            greek={meshGreek}
                            hideGreekPicker
                            className="h-full"
                            macrovolGrid={surfaceData ?? null}
                            macrovolSpot={data?.spot}
                            macrovolMeta={{
                              r: data?.r,
                              q: data?.q,
                              r_source: data?.r_source,
                              source: data?.source,
                            }}
                          />
                        </div>
                      </Suspense>
                    )}
                  </div>
                </div>

                {/* Price history + GEX/Charm heatmaps */}
                <HeatMaps
                  gexGrid={data.gex_grid}
                  charmGrid={data.charm_grid}
                  spot={data.spot}
                  ticker={ticker}
                  ohlc={ohlc}
                />

                {/* Live chain gamma + charm strike profiles (same book as Positioning) */}
                {snapshot && (
                  <div className="rounded border border-border bg-card/30 p-2">
                    <DealerGreekProfiles snapshot={snapshot} weight="oi" />
                  </div>
                )}

                {snapshot && (
                  <SessionGexHeatmap snapshot={snapshot} symbol={ticker} weight="oi" />
                )}

                {/* Dense GEX book: bars ‖ OI ladder ‖ strike×expiry (VS3D / MenthorQ density) */}
                {(gexChartData.length > 0 || data.points) && (
                  <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                      {gexChartData.length > 0 && (
                        <GexBarsPanel
                          gexChartData={gexChartData}
                          gexTotal={gexTotal}
                          flipStrike={flipStrike}
                          flipSide={flipSide}
                          spot={data.spot}
                          ticker={ticker}
                        />
                      )}
                      {data.points && <OiByStrike data={data} ticker={ticker} />}
                    </div>
                    {data.points && <GexCalendar data={data} ticker={ticker} />}
                  </div>
                )}

                <DataBadge
                  asOf={data.as_of}
                  source={[
                    data.source || 'yfinance',
                    'MacroVol',
                    data.r != null ? `r=${(data.r * 100).toFixed(2)}%` : null,
                    data.r_source ? `(${data.r_source})` : null,
                    data.q != null ? `q=${(data.q * 100).toFixed(2)}%` : null,
                    data.units?.theta ? `θ ${data.units.theta}` : 'θ/charm /day',
                    data.units?.vega ? `ν ${data.units.vega}` : 'ν /1vol',
                    data.units?.surface_side || 'OTM surface',
                  ].filter(Boolean).join(' · ')}
                  staleThresholdMin={60}
                />
              </>
            )}
          </div>
      </div>
    </div>
  );
}

/** Plotly that fills ChartZoom overlay when open; fixed desk height otherwise. */
function PlotlyFill({
  data,
  layoutBase,
  inlineHeight,
}: {
  data: never[];
  layoutBase: Record<string, unknown>;
  inlineHeight: number;
}) {
  const { zoomed } = useChartZoom();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [boxH, setBoxH] = useState(inlineHeight);

  useEffect(() => {
    if (!zoomed) {
      setBoxH(inlineHeight);
      return;
    }
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const h = Math.floor(el.getBoundingClientRect().height);
      if (h > 40) setBoxH(h);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [zoomed, inlineHeight]);

  return (
    <div
      ref={wrapRef}
      className={cn('w-full min-h-0', zoomed ? 'h-full min-h-0 flex-1' : '')}
      style={zoomed ? { height: '100%' } : { height: inlineHeight }}
    >
      <Suspense fallback={null}>
        <Plot
          data={data}
          layout={{
            ...layoutBase,
            height: boxH,
            autosize: true,
          } as never}
          config={{ responsive: true, displayModeBar: false, displaylogo: false }}
          style={{ width: '100%', height: boxH }}
          useResizeHandler
        />
      </Suspense>
    </div>
  );
}

function HeatmapPlot({
  grid,
  colorscale,
  label,
  spot,
}: {
  grid: NonNullable<GreeksData['gex_grid']>;
  colorscale: [number, string][];
  label: string;
  spot: number;
}) {
  const dteLabels = grid.T_vals.map((t) => Math.round(t * 365));
  return (
    <PlotlyFill
      inlineHeight={220}
      data={[{
        type: 'heatmap',
        x: dteLabels,
        y: grid.K_vals,
        z: grid.grid,
        colorscale,
        zsmooth: 'best',
        colorbar: {
          title: { text: label, font: { color: CHART_RESOLVED.mutedForeground, size: 10 } },
          thickness: 12,
          tickfont: { color: CHART_RESOLVED.mutedForeground, size: 9 },
        },
        hovertemplate: `DTE: %{x}d<br>Strike: $%{y:.0f}<br>${label}: %{z:.2f}<extra></extra>`,
      } as never]}
      layoutBase={{
        ...PLOTLY_LAYOUT_BASE,
        font: { ...PLOTLY_LAYOUT_BASE.font, size: 9 },
        margin: { l: 40, r: 28, t: 18, b: 28 },
        title: { text: label, font: { color: CHART_RESOLVED.foreground, size: 10 }, x: 0.02 },
        xaxis: { title: { text: 'DTE' }, ...PLOTLY_AXIS },
        yaxis: { title: { text: 'K' }, ...PLOTLY_AXIS },
        shapes: [{
          type: 'line',
          x0: Math.min(...dteLabels),
          y0: spot,
          x1: Math.max(...dteLabels),
          y1: spot,
          line: { color: CHART_HEX.brand, width: 1.5, dash: 'dash' },
        }],
      }}
    />
  );
}

function HeatMaps({
  gexGrid, charmGrid, spot, ticker, ohlc,
}: {
  gexGrid?: GreeksData['gex_grid'];
  charmGrid?: GreeksData['charm_grid'];
  spot: number;
  ticker: string;
  ohlc: HistoryData['data'];
}) {
  const hasGex = !!(gexGrid?.T_vals?.length && gexGrid?.K_vals?.length);
  const hasCharm = !!(charmGrid?.T_vals?.length && charmGrid?.K_vals?.length);

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
        {ohlc.length > 0 && (
          <div className="overflow-hidden rounded border border-border bg-card lg:col-span-1">
            <ChartZoom title={`${ticker} price`} bodyClassName="min-h-0" expandedHeightClass="h-[min(88vh,900px)]">
              <PlotlyFill
                inlineHeight={140}
                data={[{
                  type: 'candlestick',
                  x: ohlc.map((d) => d.date),
                  open: ohlc.map((d) => d.open),
                  high: ohlc.map((d) => d.high),
                  low: ohlc.map((d) => d.low),
                  close: ohlc.map((d) => d.close),
                  increasing: { line: { color: CHART_HEX.up } },
                  decreasing: { line: { color: CHART_HEX.down } },
                  name: ticker,
                } as never]}
                layoutBase={{
                  ...PLOTLY_LAYOUT_BASE,
                  font: { ...PLOTLY_LAYOUT_BASE.font, size: 9 },
                  margin: { l: 40, r: 12, t: 16, b: 28 },
                  title: { text: `${ticker}`, font: { color: CHART_RESOLVED.foreground, size: 10 }, x: 0.02 },
                  xaxis: { rangeslider: { visible: false }, gridcolor: PLOTLY_AXIS.gridcolor },
                  yaxis: { title: { text: 'Px' }, gridcolor: PLOTLY_AXIS.gridcolor },
                  showlegend: false,
                }}
              />
            </ChartZoom>
          </div>
        )}
        <div className={cn('grid grid-cols-1 gap-2 md:grid-cols-2', ohlc.length > 0 ? 'lg:col-span-2' : 'lg:col-span-3')}>
          {hasGex && gexGrid && (
            <div className="overflow-hidden rounded border border-border bg-card">
              <ChartZoom title={`${ticker} GEX heatmap`} bodyClassName="min-h-0" expandedHeightClass="h-[min(90vh,960px)]">
                <HeatmapPlot grid={gexGrid} colorscale={PLOTLY_CS_GEX} label="GEX" spot={spot} />
              </ChartZoom>
            </div>
          )}
          {hasCharm && charmGrid && (
            <div className="overflow-hidden rounded border border-border bg-card">
              <ChartZoom title={`${ticker} CHARM heatmap`} bodyClassName="min-h-0" expandedHeightClass="h-[min(90vh,960px)]">
                <HeatmapPlot grid={charmGrid} colorscale={PLOTLY_CS_CHARM} label="CHARM" spot={spot} />
              </ChartZoom>
            </div>
          )}
        </div>
      </div>
      {!hasGex && (
        <div className="rounded border border-border bg-card py-3 text-center text-type-2xs text-muted-foreground">
          No GEX heatmap — need ≥10 γ×OI points
        </div>
      )}
    </div>
  );
}

function GexBarsPanel({
  gexChartData,
  gexTotal,
  flipStrike,
  flipSide,
  spot,
  ticker,
}: {
  gexChartData: { strike: number; gex: number; isAtm: boolean }[];
  gexTotal: number;
  flipStrike: number | null;
  flipSide: string | null;
  spot: number;
  ticker: string;
}) {
  return (
    <div className="rounded border border-border bg-card/50">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 border-b border-border/60 px-2 py-1">
        <Explain term="gex">
          <span className="text-type-2xs font-semibold tracking-wide text-foreground">GEX</span>
        </Explain>
        <span className={cn('font-mono text-type-xs tabular-nums font-bold', gexTotal > 0 ? 'text-up' : 'text-down')}>
          ${(gexTotal / 1e6).toFixed(1)}M
        </span>
        <span className="text-type-2xs text-muted-foreground">net</span>
        <span className="text-type-2xs text-muted-foreground">· flip</span>
        <span className="font-mono text-type-xs tabular-nums text-foreground">
          {flipStrike != null ? flipStrike.toFixed(0) : '—'}
        </span>
        <span className={cn(
          'font-mono text-type-2xs uppercase',
          flipSide === 'above' ? 'text-up' : flipSide === 'below' ? 'text-down' : 'text-muted-foreground',
        )}>
          {flipSide ? `spot ${flipSide}` : ''}
        </span>
        <span className="ml-auto text-type-2xs text-muted-foreground/70">OI-inferred · ±7%</span>
      </div>
      <div className="px-1 pb-1 pt-0.5">
        <ChartZoom title={`${ticker} GEX by strike`} bodyClassName="min-h-0" expandedHeightClass="h-[min(88vh,900px)]">
          <GexBarsChart data={gexChartData} spot={spot} />
        </ChartZoom>
      </div>
    </div>
  );
}

function GexBarsChart({
  data,
  spot,
}: {
  data: { strike: number; gex: number; isAtm: boolean }[];
  spot: number;
}) {
  const { zoomed } = useChartZoom();
  const h = zoomed ? '100%' : 148;
  return (
    <div className={cn('w-full', zoomed ? 'h-full min-h-0' : '')} style={zoomed ? { height: '100%' } : { height: 148 }}>
      <ResponsiveContainer width="100%" height={h}>
        <BarChart data={data} margin={{ top: 2, right: 6, left: 0, bottom: 2 }}>
          <CartesianGrid {...chartGridProps} vertical={false} />
          <XAxis
            dataKey="strike"
            tick={{ ...chartAxisTick, fontSize: 8 }}
            interval="preserveStartEnd"
            tickFormatter={(v) => String(Math.round(Number(v)))}
            height={18}
          />
          <YAxis
            tick={{ ...chartAxisTick, fontSize: 8 }}
            width={36}
            tickFormatter={(v) => `${v}M`}
          />
          <Tooltip
            contentStyle={chartTooltipStyle}
            formatter={(v: number) => [`$${v}M`, 'GEX']}
            labelFormatter={(l) => `K ${l}`}
          />
          <ReferenceLine y={0} stroke={CHART.refLine} strokeWidth={1} />
          <ReferenceLine
            x={Math.round(spot)}
            stroke={CHART.series.brand}
            strokeDasharray="3 2"
            strokeWidth={1}
          />
          <Bar dataKey="gex" isAnimationActive={false} maxBarSize={10}>
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.isAtm ? CHART.series.brand : entry.gex >= 0 ? CHART.series.up : CHART.series.down}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** VS3D-style OI ladder: put OI left (amber), call OI right (info) — fixed height, nearest strikes. */
function OiByStrike({ data, ticker }: { data: GreeksData; ticker: string }) {
  const oiByStrike: Record<number, { calls: number; puts: number }> = {};
  data.points.forEach((p) => {
    if (!oiByStrike[p.K]) oiByStrike[p.K] = { calls: 0, puts: 0 };
    if (p.type === 'call') oiByStrike[p.K]!.calls += p.oi;
    else oiByStrike[p.K]!.puts += p.oi;
  });
  const strikeOIData = Object.entries(oiByStrike)
    .map(([k, v]) => ({
      strike: parseFloat(k),
      calls: v.calls,
      puts: -v.puts,
      net: v.calls - v.puts,
    }))
    .filter((d) => d.strike >= data.spot * 0.92 && d.strike <= data.spot * 1.08)
    .sort((a, b) => Math.abs(a.strike - data.spot) - Math.abs(b.strike - data.spot))
    .slice(0, 22)
    .sort((a, b) => b.strike - a.strike);

  if (strikeOIData.length === 0) return null;

  const maxAbs = Math.max(...strikeOIData.map((d) => Math.max(d.calls, -d.puts)), 1);

  return (
    <div className="rounded border border-border bg-card/50">
      <div className="flex flex-wrap items-baseline gap-x-2 border-b border-border/60 px-2 py-1">
        <span className="text-type-2xs font-semibold tracking-wide text-foreground">OI BY STRIKE</span>
        <span className="text-type-2xs text-muted-foreground">
          put ← · call → · spot {data.spot?.toFixed(0)}
        </span>
        <span className="ml-auto text-type-2xs text-muted-foreground/70">listed OI · not MM book</span>
      </div>
      <div className="px-1 pb-1 pt-0.5">
        <ChartZoom title={`${ticker} OI by strike`} bodyClassName="min-h-0" expandedHeightClass="h-[min(88vh,900px)]">
          <OiLadderChart data={strikeOIData} maxAbs={maxAbs} />
        </ChartZoom>
      </div>
    </div>
  );
}

function OiLadderChart({
  data,
  maxAbs,
}: {
  data: { strike: number; calls: number; puts: number }[];
  maxAbs: number;
}) {
  const { zoomed } = useChartZoom();
  const h = zoomed ? '100%' : 148;
  return (
    <div className={cn('w-full', zoomed ? 'h-full min-h-0' : '')} style={zoomed ? { height: '100%' } : { height: 148 }}>
      <ResponsiveContainer width="100%" height={h}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 4, left: 0, bottom: 0 }}
          barCategoryGap={1}
          barGap={0}
        >
          <CartesianGrid {...chartGridProps} horizontal={false} />
          <XAxis
            type="number"
            domain={[-maxAbs * 1.05, maxAbs * 1.05]}
            tick={{ ...chartAxisTick, fontSize: 8 }}
            tickFormatter={(v) => fmtCompact(Math.abs(v))}
            height={16}
          />
          <YAxis
            type="category"
            dataKey="strike"
            tick={{ ...chartAxisTick, fontSize: 8 }}
            width={40}
            tickFormatter={(v) => String(Math.round(Number(v)))}
          />
          <Tooltip
            contentStyle={chartTooltipStyle}
            formatter={(v: number, name: string) => [
              Math.abs(v).toLocaleString(),
              name === 'calls' ? 'Call OI' : 'Put OI',
            ]}
            labelFormatter={(l) => `K ${l}`}
          />
          <ReferenceLine x={0} stroke={CHART.refLine} strokeWidth={1} />
          <Bar dataKey="puts" fill={CHART.series.warn} name="puts" isAnimationActive={false} maxBarSize={8} stackId="a" />
          <Bar dataKey="calls" fill={CHART.series.info} name="calls" isAnimationActive={false} maxBarSize={8} stackId="a" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Strike × DTE GEX heat table — dense position-grid language (VS3D Pack B4). */
function GexCalendar({ data, ticker }: { data: GreeksData; ticker: string }) {
  const gexCalendar: Record<string, Record<number, number>> = {};
  const allExpiries = new Set<number>();
  const allStrikes = new Set<number>();

  data.points.forEach((p) => {
    const sign = p.type === 'call' ? 1 : -1;
    const gex = sign * p.gamma * p.oi * 100 * data.spot * data.spot * 0.01;
    const T = p.T.toFixed(3);
    if (!gexCalendar[T]) gexCalendar[T] = {};
    gexCalendar[T]![p.K] = (gexCalendar[T]![p.K] || 0) + gex;
    allExpiries.add(p.T);
    allStrikes.add(p.K);
  });

  const expiries = [...allExpiries].sort((a, b) => a - b).slice(0, 8);
  const strikes = [...allStrikes]
    .filter((k) => k >= data.spot * 0.94 && k <= data.spot * 1.06)
    .sort((a, b) => Math.abs(a - data.spot) - Math.abs(b - data.spot))
    .slice(0, 18)
    .sort((a, b) => b - a);

  if (expiries.length < 2 || strikes.length < 2) return null;

  const maxGex = Math.max(...expiries.flatMap((T) =>
    strikes.map((K) => Math.abs(gexCalendar[T.toFixed(3)]?.[K] || 0)),
  ), 1);

  function gexColor(value: number): string {
    if (value === 0) return 'transparent';
    const intensity = Math.min(Math.abs(value) / maxGex, 1);
    if (value > 0) {
      const a = 0.15 + intensity * 0.75;
      return `color-mix(in srgb, ${CHART_HEX.up} ${Math.round(a * 100)}%, transparent)`;
    }
    const a = 0.15 + intensity * 0.75;
    return `color-mix(in srgb, ${CHART_HEX.down} ${Math.round(a * 100)}%, transparent)`;
  }

  return (
    <div className="rounded border border-border bg-card/50">
      <div className="flex flex-wrap items-baseline gap-x-2 border-b border-border/60 px-2 py-1">
        <span className="text-type-2xs font-semibold tracking-wide text-foreground">GEX CALENDAR</span>
        <span className="text-type-2xs text-muted-foreground">K × DTE · +γ dampen · −γ free-to-move</span>
        <span className="ml-auto text-type-2xs text-muted-foreground/70">naive dealer · OI×γ</span>
      </div>
      <div className="px-1 pb-1 pt-0.5">
        <ChartZoom title={`${ticker} GEX calendar`} bodyClassName="min-h-0" expandedHeightClass="h-[min(90vh,960px)]">
          <GexCalendarTable
            expiries={expiries}
            strikes={strikes}
            gexCalendar={gexCalendar}
            maxGex={maxGex}
            spot={data.spot}
            gexColor={gexColor}
          />
        </ChartZoom>
      </div>
    </div>
  );
}

function GexCalendarTable({
  expiries,
  strikes,
  gexCalendar,
  maxGex,
  spot,
  gexColor,
}: {
  expiries: number[];
  strikes: number[];
  gexCalendar: Record<string, Record<number, number>>;
  maxGex: number;
  spot: number;
  gexColor: (v: number) => string;
}) {
  const { zoomed } = useChartZoom();
  return (
    <div
      className={cn('overflow-auto', zoomed ? 'h-full min-h-0' : 'max-h-[200px]')}
    >
      <table className={cn(
        'w-full border-collapse font-mono leading-none',
        zoomed ? 'text-type-xs' : 'text-[10px]',
      )}>
        <thead className="sticky top-0 z-[1] bg-card">
          <tr>
            <th className="w-10 px-1 py-0.5 text-right font-normal text-muted-foreground">K</th>
            {expiries.map((T) => (
              <th key={T} className="min-w-[2.25rem] px-0.5 py-0.5 text-center font-normal text-muted-foreground">
                {Math.round(T * 365)}d
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {strikes.map((K) => {
            const isSpot = Math.abs(K - spot) < spot * 0.004;
            return (
              <tr key={K} className={isSpot ? 'bg-primary/10' : undefined}>
                <td className={cn(
                  'px-1 py-0.5 text-right tabular-nums',
                  isSpot ? 'font-bold text-foreground' : 'text-muted-foreground',
                )}>
                  {Math.round(K)}
                </td>
                {expiries.map((T) => {
                  const val = gexCalendar[T.toFixed(3)]?.[K] || 0;
                  const show = Math.abs(val) > maxGex * 0.12;
                  return (
                    <td
                      key={T}
                      style={{ background: gexColor(val) }}
                      className="px-0.5 py-0.5 text-center tabular-nums text-foreground/90"
                      title={`K=${K} · ${Math.round(T * 365)}d · $${(val / 1e3).toFixed(1)}K`}
                    >
                      {show ? `${val > 0 ? '+' : ''}${(val / 1e6).toFixed(1)}` : ''}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Terminal-chain OI-weighted charm & vanna by strike (sister to MacroVol heatmaps). */
function CharmVannaStrikeProfiles({ snapshot }: { snapshot: VolSnapshot }) {
  const chartData = useMemo(() => {
    const d = dealerExposure(snapshot, { weight: 'oi' });
    const S = snapshot.spot;
    return d.points
      .filter((p) => Math.abs(p.strike - S) / S <= 0.12)
      .map((p) => ({
        strike: p.strike,
        label: fmtPrice(p.strike, p.strike > 1000 ? 0 : 2),
        charm: p.netCharm / 1e6,
        vanna: p.netVEX / 1e6,
      }));
  }, [snapshot]);

  if (chartData.length < 2) return null;

  return (
    <div className="rounded-lg border border-border/70 bg-card/40 p-2">
      <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-type-2xs text-muted-foreground">
        <Explain term="charmExposure">
          <span className="font-semibold text-foreground">CHARM · VANNA STRIKE</span>
        </Explain>
        <span>OI-weighted $ exposure · terminal chain · ±12% spot</span>
        <span className="text-muted-foreground/80">· not MacroVol grid (see heatmaps below)</span>
      </div>
      <ChartZoom title="Charm · Vanna by strike" bodyClassName="min-h-0" expandedHeightClass="h-[min(88vh,900px)]">
        <CharmVannaChart data={chartData} />
      </ChartZoom>
    </div>
  );
}

function CharmVannaChart({
  data,
}: {
  data: { strike: number; label: string; charm: number; vanna: number }[];
}) {
  const { zoomed } = useChartZoom();
  const h = zoomed ? '100%' : 144;
  return (
    <div className={cn('w-full', zoomed ? 'h-full min-h-0' : '')} style={zoomed ? { height: '100%' } : { height: 144 }}>
      <ResponsiveContainer width="100%" height={h}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 4 }}>
          <CartesianGrid {...chartGridProps} />
          <XAxis
            dataKey="label"
            tick={chartAxisTick}
            stroke={CHART.axisLine}
            interval={Math.max(0, Math.floor(data.length / 10))}
          />
          <YAxis
            yAxisId="charm"
            tick={chartAxisTick}
            stroke={CHART.axisLine}
            width={44}
            tickFormatter={(v) => fmtCompact(Number(v) * 1e6)}
          />
          <YAxis
            yAxisId="vanna"
            orientation="right"
            tick={chartAxisTick}
            stroke={CHART.axisLine}
            width={44}
            tickFormatter={(v) => fmtCompact(Number(v) * 1e6)}
          />
          <ReferenceLine yAxisId="charm" y={0} stroke={CHART.refLine} />
          <Tooltip
            contentStyle={chartTooltipStyle}
            formatter={(v: number, name: string) => [
              fmtCompact(v * 1e6),
              name === 'charm' ? 'Charm $ / day' : 'VEX (vanna·S)',
            ]}
          />
          <Bar
            yAxisId="charm"
            dataKey="charm"
            name="charm"
            fill={CHART_GREEK_EXT.charm}
            fillOpacity={0.55}
            isAnimationActive={false}
          />
          <Line
            yAxisId="vanna"
            type="monotone"
            dataKey="vanna"
            name="vanna"
            stroke={CHART_GREEK_EXT.vanna}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
