/**
 * Greeks 1.0 — MacroVol-style rich Greeks desk.
 * Uses MacroVol FastAPI (yfinance) for interpolated greek surfaces, GEX/Charm heatmaps,
 * ATM snapshot, OI ladder, GEX calendar — plus terminal-token IV surface.
 */
import { lazy, Suspense, useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
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
import { IVSurfaceMacro } from '../macrovol/IVSurfaceMacro';
import { useTerminalStore } from '../../store/terminalStore';

const Plot = lazy(() => import('react-plotly.js'));

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
  { key: 'theta', label: 'THETA', desc: 'Daily time decay. Negative for long options', formula: '∂V/∂t = −(S·φ(d₁)·σ)/(2√T)', color: CHART_GREEK_EXT.theta },
  { key: 'vanna', label: 'VANNA', desc: 'dVega/dSpot. How vega changes with spot', formula: '∂²V/∂S∂σ = −φ(d₁)·d₂/σ', color: CHART_GREEK_EXT.vanna },
  { key: 'charm', label: 'CHARM', desc: 'dDelta/dTime. Delta decay per day', formula: '∂²V/∂S∂t', color: CHART_GREEK_EXT.charm },
];

type Section = 'greeks' | 'iv';

export function Greeks10View() {
  const storeSymbol = useTerminalStore((s) => s.symbol);
  const [ticker, setTicker] = useState(storeSymbol || 'SPY');
  const [selectedGreek, setSelectedGreek] = useState('delta');
  const [data, setData] = useState<GreeksData | null>(null);
  const [ohlc, setOhlc] = useState<HistoryData['data']>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [section, setSection] = useState<Section>('greeks');
  const [custom, setCustom] = useState('');

  async function load(t: string) {
    setLoading(true);
    setError('');
    setData(null);
    setOhlc([]);
    try {
      // r omitted → MacroVol uses live SOFR (not hardcoded 5%)
      const [greeksRes, ohlcRes] = await Promise.all([
        macrovolApi.greeks(t, null, 0.013),
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
  }, [ticker]);

  // Sync from terminal symbol when it looks like an equity ticker
  useEffect(() => {
    if (storeSymbol && /^[A-Z.^]{1,8}$/.test(storeSymbol) && storeSymbol !== ticker) {
      // don't auto-override if user picked a custom greek ticker — only seed once
    }
  }, [storeSymbol, ticker]);

  const greek = GREEKS.find((g) => g.key === selectedGreek)!;
  const surfaceData = data?.surfaces?.[selectedGreek];

  const gexData = data?.gex?.filter((g) => Math.abs(g.gex) > 0) || [];
  const gexTotal = data?.gex_flip?.net_gex ?? gexData.reduce((s, g) => s + g.gex, 0);
  const flipStrike = data?.gex_flip?.strike ?? null;
  const flipSide = data?.gex_flip?.spot_vs_flip;

  const gexChartData = gexData
    .filter((g) => data && g.strike >= data.spot * 0.93 && g.strike <= data.spot * 1.07)
    .map((g) => ({
      strike: g.strike,
      gex: parseFloat((g.gex / 1e6).toFixed(2)),
      isAtm: Math.abs(g.strike - (data?.spot || 0)) < 3,
    }))
    .sort((a, b) => a.strike - b.strike);

  const colorscale = PLOTLY_CS_GREEK[selectedGreek] ?? PLOTLY_CS_GREEK.delta;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header / section toggle */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <span className="text-type-xs font-mono font-bold tracking-wider text-primary">GREEKS 1.0</span>
        <span className="text-type-xs font-mono text-muted-foreground">
          MacroVol · BS · yfinance
          {data?.r != null && (
            <> · r={(data.r * 100).toFixed(2)}% ({data.r_source || 'SOFR'}) · q={((data.q ?? 0.013) * 100).toFixed(2)}%</>
          )}
        </span>
        <div className="ml-auto flex gap-1">
          {([
            { id: 'greeks' as const, label: 'Greeks Desk' },
            { id: 'iv' as const, label: 'IV Surface' },
          ]).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSection(s.id)}
              className={`rounded px-2.5 py-1 font-mono text-type-xs ${
                section === s.id
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border text-muted-foreground hover:border-primary'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {section === 'iv' ? (
          <IVSurfaceMacro defaultTicker={ticker} />
        ) : (
          <div className="flex flex-col gap-5 p-3 font-mono">
            {/* Ticker picker */}
            <div className="flex flex-wrap gap-1.5">
              {TICKERS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTicker(t.value)}
                  className={`rounded-lg border px-3 py-1.5 text-xs ${
                    ticker === t.value
                      ? 'border-primary bg-primary text-primary-foreground font-bold'
                      : 'border-border text-muted-foreground hover:border-primary hover:text-foreground'
                  }`}
                >
                  {t.label}
                </button>
              ))}
              <input
                className="w-28 rounded-lg border border-border bg-background px-2 py-1.5 text-xs outline-none"
                placeholder="Custom…"
                value={custom}
                onChange={(e) => setCustom(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && custom.trim()) {
                    setTicker(custom.trim());
                  }
                }}
              />
              {storeSymbol && storeSymbol !== ticker && (
                <button
                  type="button"
                  onClick={() => setTicker(storeSymbol)}
                  className="rounded border border-brand/40 px-2 py-1 text-type-xs text-brand"
                >
                  Use terminal: {storeSymbol}
                </button>
              )}
            </div>

            {loading && (
              <div className="text-type-xs text-muted-foreground">
                Computing Greeks for {ticker}… fetching option chain via MacroVol API (15–30s)
              </div>
            )}
            {error && (
              <div className="rounded border border-down/40 bg-down/15 px-3 py-2 text-xs text-down">
                {error} — Try SPY if index options fail. Ensure MacroVol API is on :8765.
              </div>
            )}

            {data && !loading && (
              <>
                {/* ATM snapshot */}
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h3 className="text-xs font-semibold text-foreground">ATM GREEKS SNAPSHOT</h3>
                    <span className="text-type-xs text-muted-foreground">
                      {ticker} · Spot: ${data.spot?.toFixed(2)} · {data.total_points} option points · nearest expiry
                    </span>
                    <span className="text-type-xs text-up">API: {data.source || 'yfinance'} · MacroVol</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
                    {GREEKS.map((g) => (
                      <button
                        key={g.key}
                        type="button"
                        onClick={() => setSelectedGreek(g.key)}
                        className={`rounded-xl border p-3 text-left transition-all ${
                          selectedGreek === g.key
                            ? 'border-primary bg-primary/10'
                            : 'border-border bg-card hover:border-border/80'
                        }`}
                      >
                        <div className="text-type-xs font-mono" style={{ color: g.color }}>{g.label}</div>
                        <div className="text-lg font-bold text-foreground">
                          {data.atm?.[g.key as keyof typeof data.atm] != null
                            ? Number(data.atm[g.key as keyof typeof data.atm]).toFixed(4)
                            : '—'}
                        </div>
                        <div className="mt-1 text-type-2xs leading-snug text-muted-foreground">{g.desc}</div>
                        <div className="mt-1 text-type-2xs text-muted-foreground/70">{g.formula}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3D Greek surface */}
                {surfaceData && surfaceData.T_vals?.length > 0 && (
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <h3 className="text-xs font-semibold" style={{ color: greek.color }}>{greek.label} SURFACE</h3>
                      <span className="text-type-xs text-muted-foreground">{greek.desc}</span>
                    </div>
                    <div className="overflow-hidden rounded-xl border border-border bg-card">
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
                            height: 460,
                          } as never}
                          config={{ responsive: true, displayModeBar: true, displaylogo: false }}
                          style={{ width: '100%' }}
                        />
                      </Suspense>
                    </div>
                  </div>
                )}

                {/* Price history + GEX/Charm heatmaps */}
                <HeatMaps
                  gexGrid={data.gex_grid}
                  charmGrid={data.charm_grid}
                  spot={data.spot}
                  ticker={ticker}
                  ohlc={ohlc}
                />

                {/* GEX bar chart */}
                {gexChartData.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-foreground">GAMMA EXPOSURE (GEX)</h3>
                    <p className="mt-0.5 text-type-xs text-muted-foreground">
                      Naive dealer GEX (call + / put −) · + = stabilizing · − = destabilizing · not inventory model
                    </p>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <div className="rounded-lg border border-border bg-card p-3">
                        <div className="text-type-xs text-muted-foreground">NET GEX</div>
                        <div className={`text-lg font-bold ${gexTotal > 0 ? 'text-up' : 'text-down'}`}>
                          ${(gexTotal / 1e6).toFixed(1)}M
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-card p-3">
                        <div className="text-type-xs text-muted-foreground">GEX FLIP</div>
                        <div className="text-lg font-bold text-brand">
                          {flipStrike != null ? `$${flipStrike.toFixed(0)}` : '—'}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-card p-3">
                        <div className="text-type-xs text-muted-foreground">SPOT vs FLIP</div>
                        <div className={`text-lg font-bold ${
                          flipSide === 'above' ? 'text-up' : flipSide === 'below' ? 'text-down' : 'text-muted-foreground'
                        }`}>
                          {flipSide ? flipSide.toUpperCase() : '—'}
                        </div>
                      </div>
                    </div>
                    {data.gex_convention && (
                      <p className="mt-1 text-type-2xs text-muted-foreground/80">{data.gex_convention}</p>
                    )}
                    <div className="mt-2 rounded-xl border border-border bg-card p-3">
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={gexChartData} margin={{ top: 5, right: 16, left: 8, bottom: 32 }}>
                          <CartesianGrid {...chartGridProps} />
                          <XAxis dataKey="strike" tick={{ ...chartAxisTick, fontSize: 9 }} angle={-45} textAnchor="end" />
                          <YAxis tick={{ ...chartAxisTick, fontSize: 9 }} tickFormatter={(v) => `$${v}M`} />
                          <Tooltip
                            contentStyle={chartTooltipStyle}
                            formatter={(v: number) => [`$${v}M`, 'GEX']}
                            labelFormatter={(l) => `Strike: $${l}`}
                          />
                          <ReferenceLine y={0} stroke={CHART.refLine} strokeWidth={1.5} />
                          <ReferenceLine
                            x={Math.round(data.spot)}
                            stroke={CHART.series.brand}
                            strokeDasharray="4 2"
                            label={{ value: `Spot $${data.spot?.toFixed(0)}`, fill: CHART.series.brand, fontSize: 9 }}
                          />
                          <Bar dataKey="gex" radius={[2, 2, 0, 0]}>
                            {gexChartData.map((entry, index) => (
                              <Cell
                                key={index}
                                fill={entry.isAtm ? CHART.series.brand : entry.gex >= 0 ? CHART.series.up : CHART.series.down}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* OI by strike */}
                {data.points && <OiByStrike data={data} />}

                {/* GEX calendar */}
                {data.points && <GexCalendar data={data} />}

                <DataBadge asOf={data.as_of} source={`${data.source || 'yfinance'} · MacroVol`} staleThresholdMin={60} />
              </>
            )}
          </div>
        )}
      </div>
    </div>
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
  const makeHeatmap = (grid: GreeksData['gex_grid'], colorscale: [number, string][], label: string) => {
    if (!grid?.T_vals?.length || !grid?.K_vals?.length) return null;
    const dteLabels = grid.T_vals.map((t) => Math.round(t * 365));
    return (
      <Suspense fallback={null}>
        <Plot
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
          layout={{
            ...PLOTLY_LAYOUT_BASE,
            font: { ...PLOTLY_LAYOUT_BASE.font, size: 9 },
            margin: { l: 48, r: 36, t: 28, b: 40 },
            title: { text: `${label} HEAT MAP`, font: { color: CHART_RESOLVED.foreground, size: 11 }, x: 0.05 },
            xaxis: { title: { text: 'DTE' }, ...PLOTLY_AXIS },
            yaxis: { title: { text: 'Strike ($)' }, ...PLOTLY_AXIS },
            shapes: [{
              type: 'line',
              x0: Math.min(...dteLabels),
              y0: spot,
              x1: Math.max(...dteLabels),
              y1: spot,
              line: { color: CHART_HEX.brand, width: 2, dash: 'dash' },
            }],
            height: 340,
          } as never}
          config={{ responsive: true, displayModeBar: false, displaylogo: false }}
          style={{ width: '100%' }}
        />
      </Suspense>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      {ohlc.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Suspense fallback={null}>
            <Plot
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
              layout={{
                ...PLOTLY_LAYOUT_BASE,
                font: { ...PLOTLY_LAYOUT_BASE.font, size: 9 },
                margin: { l: 48, r: 16, t: 28, b: 40 },
                title: { text: `${ticker} PRICE HISTORY`, font: { color: CHART_RESOLVED.foreground, size: 11 }, x: 0.05 },
                xaxis: { rangeslider: { visible: false }, gridcolor: PLOTLY_AXIS.gridcolor },
                yaxis: { title: { text: 'Price ($)' }, gridcolor: PLOTLY_AXIS.gridcolor },
                height: 220,
                showlegend: false,
              } as never}
              config={{ responsive: true, displayModeBar: false }}
              style={{ width: '100%' }}
            />
          </Suspense>
        </div>
      )}
      <div>
        <h3 className="text-xs font-semibold text-foreground">GEX &amp; CHARM EXPOSURE HEAT MAPS</h3>
        <p className="text-type-xs text-muted-foreground">
          GEX = γ × OI × sign · Down = dealers short gamma · Up = long gamma · Dashed = spot
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {makeHeatmap(gexGrid, PLOTLY_CS_GEX, 'GEX') && (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {makeHeatmap(gexGrid, PLOTLY_CS_GEX, 'GEX')}
          </div>
        )}
        {makeHeatmap(charmGrid, PLOTLY_CS_CHARM, 'CHARM EXPOSURE') && (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {makeHeatmap(charmGrid, PLOTLY_CS_CHARM, 'CHARM EXPOSURE')}
          </div>
        )}
      </div>
      {!gexGrid?.T_vals?.length && (
        <div className="rounded-xl border border-border bg-card py-6 text-center text-type-xs text-muted-foreground">
          Insufficient option data for GEX heatmap (need ≥10 points with gamma × OI)
        </div>
      )}
    </div>
  );
}

function OiByStrike({ data }: { data: GreeksData }) {
  const oiByStrike: Record<number, { calls: number; puts: number }> = {};
  data.points.forEach((p) => {
    if (!oiByStrike[p.K]) oiByStrike[p.K] = { calls: 0, puts: 0 };
    if (p.type === 'call') oiByStrike[p.K]!.calls += p.oi;
    else oiByStrike[p.K]!.puts += p.oi;
  });
  const strikeOIData = Object.entries(oiByStrike)
    .map(([k, v]) => ({ strike: parseFloat(k), calls: v.calls, puts: -v.puts }))
    .filter((d) => d.strike >= data.spot * 0.90 && d.strike <= data.spot * 1.10)
    .sort((a, b) => b.strike - a.strike);

  if (strikeOIData.length === 0) return null;

  return (
    <div>
      <h3 className="text-xs font-semibold text-foreground">POSITIONS BY STRIKE</h3>
      <p className="text-type-xs text-muted-foreground">
        Puts ← Left · Calls → Right · Open Interest · Spot ${data.spot?.toFixed(0)}
      </p>
      <div className="mt-2 rounded-xl border border-border bg-card p-3">
        <ResponsiveContainer width="100%" height={Math.max(320, strikeOIData.length * 18)}>
          <BarChart data={strikeOIData} layout="vertical" margin={{ top: 5, right: 16, left: 48, bottom: 5 }} barGap={0}>
            <CartesianGrid {...chartGridProps} />
            <XAxis type="number" tick={{ ...chartAxisTick, fontSize: 9 }} tickFormatter={(v) => Math.abs(v).toLocaleString()} />
            <YAxis type="category" dataKey="strike" tick={{ ...chartAxisTick, fontSize: 9 }} width={48} />
            <Tooltip
              contentStyle={chartTooltipStyle}
              formatter={(v: number, name: string) => [Math.abs(v).toLocaleString(), name === 'calls' ? 'Calls OI' : 'Puts OI']}
            />
            <ReferenceLine x={0} stroke={CHART.refLine} strokeWidth={2} />
            <Bar dataKey="puts" fill={CHART.series.warn} name="puts" radius={[2, 0, 0, 2]} stackId="a" />
            <Bar dataKey="calls" fill={CHART.series.info} name="calls" radius={[0, 2, 2, 0]} stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function GexCalendar({ data }: { data: GreeksData }) {
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

  const expiries = [...allExpiries].sort((a, b) => a - b).slice(0, 10);
  const strikes = [...allStrikes].sort((a, b) => b - a)
    .filter((k) => k >= data.spot * 0.93 && k <= data.spot * 1.07);

  if (expiries.length < 2 || strikes.length < 2) return null;

  const maxGex = Math.max(...expiries.flatMap((T) =>
    strikes.map((K) => Math.abs(gexCalendar[T.toFixed(3)]?.[K] || 0)),
  ), 1);

  function gexColor(value: number): string {
    if (value === 0) return CHART_HEX.ink;
    const intensity = Math.min(Math.abs(value) / maxGex, 1);
    // Anchor to up/down hex (terminal language, not Matrix/blue)
    if (value > 0) {
      const r = Math.round(0x1a + intensity * (0x51 - 0x1a));
      const g = Math.round(0x3a + intensity * (0xd7 - 0x3a));
      const b = Math.round(0x20 + intensity * (0x5e - 0x20));
      return `rgb(${r},${g},${b})`;
    }
    const r = Math.round(0x5a + intensity * (0xff - 0x5a));
    const g = Math.round(0x14 + intensity * (0x2f - 0x14));
    const b = Math.round(0x18 + intensity * (0x3a - 0x18));
    return `rgb(${r},${g},${b})`;
  }

  return (
    <div>
      <h3 className="text-xs font-semibold text-foreground">GAMMA EXPOSURE CALENDAR</h3>
      <p className="text-type-xs text-muted-foreground">
        Strike vs Expiry · Up = MM long gamma · Down = MM short gamma
      </p>
      <div className="mt-2 max-h-[400px] overflow-auto rounded-xl border border-border bg-card p-2">
        <table className="w-full border-collapse text-type-xs">
          <thead>
            <tr>
              <th className="w-14 p-1 text-right font-normal text-muted-foreground">Strike</th>
              {expiries.map((T) => (
                <th key={T} className="min-w-12 p-1 text-center font-normal text-muted-foreground">
                  {Math.round(T * 365)}d
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {strikes.map((K) => {
              const isSpot = Math.abs(K - data.spot) < data.spot * 0.003;
              return (
                <tr key={K}>
                  <td className={`p-1 text-right ${isSpot ? 'font-bold text-brand' : 'text-muted-foreground'}`}>
                    {isSpot ? '▶' : ''}{K}
                  </td>
                  {expiries.map((T) => {
                    const val = gexCalendar[T.toFixed(3)]?.[K] || 0;
                    return (
                      <td
                        key={T}
                        style={{ background: gexColor(val), padding: '3px 4px' }}
                        className="text-center text-type-2xs"
                        title={`K=${K} DTE=${Math.round(T * 365)} GEX=$${(val / 1000).toFixed(1)}K`}
                      >
                        {Math.abs(val) > maxGex * 0.1
                          ? `${val > 0 ? '+' : ''}${(val / 1000).toFixed(0)}K`
                          : ''}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
