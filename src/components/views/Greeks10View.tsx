/**
 * Greeks 1.0 — MacroVol-style rich Greeks desk.
 * Uses MacroVol FastAPI (yfinance) for interpolated greek surfaces, GEX/Charm heatmaps,
 * ATM snapshot, OI ladder, GEX calendar — plus the Bloomberg-green IV surface.
 */
import { lazy, Suspense, useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import { macrovolApi, type GreeksData, type HistoryData } from '../../lib/macrovol/api';
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
  { key: 'delta', label: 'DELTA', desc: 'Rate of price change per $1 move in spot', formula: '∂V/∂S = Φ(d₁)', color: '#3b82f6' },
  { key: 'gamma', label: 'GAMMA', desc: 'Rate of delta change. Peaks ATM', formula: '∂²V/∂S² = φ(d₁)/(S·σ·√T)', color: '#22c55e' },
  { key: 'vega', label: 'VEGA', desc: 'P&L per 1% IV move. Always positive', formula: '∂V/∂σ = S·φ(d₁)·√T', color: '#f59e0b' },
  { key: 'theta', label: 'THETA', desc: 'Daily time decay. Negative for long options', formula: '∂V/∂t = −(S·φ(d₁)·σ)/(2√T)', color: '#ef4444' },
  { key: 'vanna', label: 'VANNA', desc: 'dVega/dSpot. How vega changes with spot', formula: '∂²V/∂S∂σ = −φ(d₁)·d₂/σ', color: '#a78bfa' },
  { key: 'charm', label: 'CHARM', desc: 'dDelta/dTime. Delta decay per day', formula: '∂²V/∂S∂t', color: '#06b6d4' },
];

const GEX_COLORSCALE = [
  [-1, '#7f0000'], [-0.667, '#b30000'], [-0.334, '#e34a33'], [-0.001, '#fee8c8'],
  [0, '#ffffff'],
  [0.001, '#e5f5e0'], [0.334, '#31a354'], [0.667, '#006d2c'], [1, '#002d0b'],
];

const CHARM_COLORSCALE = [
  [-1, '#2d004b'], [-0.667, '#8073ac'], [-0.334, '#c2a5cf'], [-0.001, '#f7f7f7'],
  [0, '#ffffff'],
  [0.001, '#f7f7f7'], [0.334, '#a6dba0'], [0.667, '#5aae61'], [1, '#1b7837'],
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

  const colorscale =
    selectedGreek === 'delta' ? 'Blues'
      : selectedGreek === 'gamma' ? 'Greens'
        : selectedGreek === 'vega' ? ([[0, '#1a0a00'], [0.5, '#f59e0b'], [1, '#ffffff']] as [number, string][])
          : selectedGreek === 'theta' ? ([[0, '#1a0000'], [0.5, '#ef4444'], [1, '#ffffff']] as [number, string][])
            : selectedGreek === 'vanna' ? 'RdBu'
              : 'Viridis';

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header / section toggle */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <span className="text-[10px] font-mono font-bold tracking-wider text-primary">GREEKS 1.0</span>
        <span className="text-[10px] font-mono text-muted-foreground">
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
              className={`rounded px-2.5 py-1 font-mono text-[10px] ${
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
                  className="rounded border border-amber-500/40 px-2 py-1 text-[10px] text-amber-400"
                >
                  Use terminal: {storeSymbol}
                </button>
              )}
            </div>

            {loading && (
              <div className="text-xs text-muted-foreground animate-pulse">
                Computing Greeks for {ticker}… fetching option chain via MacroVol API (15–30s)
              </div>
            )}
            {error && (
              <div className="rounded border border-red-500/40 bg-red-950/20 px-3 py-2 text-xs text-red-400">
                {error} — Try SPY if index options fail. Ensure MacroVol API is on :8765.
              </div>
            )}

            {data && !loading && (
              <>
                {/* ATM snapshot */}
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h3 className="text-xs font-semibold text-foreground">ATM GREEKS SNAPSHOT</h3>
                    <span className="text-[10px] text-muted-foreground">
                      {ticker} · Spot: ${data.spot?.toFixed(2)} · {data.total_points} option points · nearest expiry
                    </span>
                    <span className="text-[10px] text-emerald-400">API: {data.source || 'yfinance'} · MacroVol</span>
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
                        <div className="text-[10px] font-mono" style={{ color: g.color }}>{g.label}</div>
                        <div className="text-lg font-bold text-foreground">
                          {data.atm?.[g.key as keyof typeof data.atm] != null
                            ? Number(data.atm[g.key as keyof typeof data.atm]).toFixed(4)
                            : '—'}
                        </div>
                        <div className="mt-1 text-[9px] leading-snug text-muted-foreground">{g.desc}</div>
                        <div className="mt-1 text-[9px] text-muted-foreground/70">{g.formula}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3D Greek surface */}
                {surfaceData && surfaceData.T_vals?.length > 0 && (
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <h3 className="text-xs font-semibold" style={{ color: greek.color }}>{greek.label} SURFACE</h3>
                      <span className="text-[10px] text-muted-foreground">{greek.desc}</span>
                    </div>
                    <div className="overflow-hidden rounded-xl border border-border bg-[#0a0a0a]">
                      <Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Loading surface…</div>}>
                        <Plot
                          data={[{
                            type: 'surface',
                            x: surfaceData.T_vals,
                            y: surfaceData.K_vals,
                            z: surfaceData.grid,
                            colorscale,
                            colorbar: {
                              title: { text: greek.label, font: { color: '#a1a1aa', size: 11 } },
                              thickness: 14,
                              tickfont: { color: '#a1a1aa', size: 10 },
                            },
                            hovertemplate: `Strike: $%{y:.0f}<br>${greek.label}: %{z:.4f}<extra></extra>`,
                          } as never]}
                          layout={{
                            paper_bgcolor: 'rgba(0,0,0,0)',
                            plot_bgcolor: 'rgba(0,0,0,0)',
                            font: { color: '#a1a1aa', size: 10 },
                            margin: { l: 0, r: 50, t: 24, b: 0 },
                            scene: {
                              xaxis: {
                                title: { text: 'DTE' },
                                ticktext: surfaceData.T_vals.map((t) => `${Math.round(t * 365)}d`),
                                tickvals: surfaceData.T_vals,
                                color: '#71717a',
                                gridcolor: '#1f1f1f',
                              },
                              yaxis: { title: { text: 'Strike ($)' }, color: '#71717a', gridcolor: '#1f1f1f' },
                              zaxis: { title: { text: greek.label }, color: '#71717a', gridcolor: '#1f1f1f' },
                              bgcolor: 'rgba(0,0,0,0)',
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
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      Naive dealer GEX (call + / put −) · + = stabilizing · − = destabilizing · not inventory model
                    </p>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <div className="rounded-lg border border-border bg-card p-3">
                        <div className="text-[10px] text-muted-foreground">NET GEX</div>
                        <div className={`text-lg font-bold ${gexTotal > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          ${(gexTotal / 1e6).toFixed(1)}M
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-card p-3">
                        <div className="text-[10px] text-muted-foreground">GEX FLIP</div>
                        <div className="text-lg font-bold text-amber-400">
                          {flipStrike != null ? `$${flipStrike.toFixed(0)}` : '—'}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-card p-3">
                        <div className="text-[10px] text-muted-foreground">SPOT vs FLIP</div>
                        <div className={`text-lg font-bold ${
                          flipSide === 'above' ? 'text-emerald-400' : flipSide === 'below' ? 'text-red-400' : 'text-muted-foreground'
                        }`}>
                          {flipSide ? flipSide.toUpperCase() : '—'}
                        </div>
                      </div>
                    </div>
                    {data.gex_convention && (
                      <p className="mt-1 text-[9px] text-muted-foreground/80">{data.gex_convention}</p>
                    )}
                    <div className="mt-2 rounded-xl border border-border bg-card p-3">
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={gexChartData} margin={{ top: 5, right: 16, left: 8, bottom: 32 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                          <XAxis dataKey="strike" tick={{ fill: '#8892a4', fontSize: 9 }} angle={-45} textAnchor="end" />
                          <YAxis tick={{ fill: '#8892a4', fontSize: 9 }} tickFormatter={(v) => `$${v}M`} />
                          <Tooltip
                            contentStyle={{ background: '#0d1117', border: '1px solid #1e2d3d', fontSize: 11 }}
                            formatter={(v: number) => [`$${v}M`, 'GEX']}
                            labelFormatter={(l) => `Strike: $${l}`}
                          />
                          <ReferenceLine y={0} stroke="#8892a4" strokeWidth={1.5} />
                          <ReferenceLine
                            x={Math.round(data.spot)}
                            stroke="#f59e0b"
                            strokeDasharray="4 2"
                            label={{ value: `Spot $${data.spot?.toFixed(0)}`, fill: '#f59e0b', fontSize: 9 }}
                          />
                          <Bar dataKey="gex" radius={[2, 2, 0, 0]}>
                            {gexChartData.map((entry, index) => (
                              <Cell
                                key={index}
                                fill={entry.isAtm ? '#f59e0b' : entry.gex >= 0 ? '#166534' : '#7f1d1d'}
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
  const makeHeatmap = (grid: GreeksData['gex_grid'], colorscale: typeof GEX_COLORSCALE, label: string) => {
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
              title: { text: label, font: { color: '#a1a1aa', size: 10 } },
              thickness: 12,
              tickfont: { color: '#a1a1aa', size: 9 },
            },
            hovertemplate: `DTE: %{x}d<br>Strike: $%{y:.0f}<br>${label}: %{z:.2f}<extra></extra>`,
          } as never]}
          layout={{
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            font: { color: '#a1a1aa', size: 9 },
            margin: { l: 48, r: 36, t: 28, b: 40 },
            title: { text: `${label} HEAT MAP`, font: { color: '#e4e4e7', size: 11 }, x: 0.05 },
            xaxis: { title: { text: 'DTE' }, tickfont: { size: 9, color: '#71717a' }, gridcolor: '#1f1f1f' },
            yaxis: { title: { text: 'Strike ($)' }, tickfont: { size: 9, color: '#71717a' }, gridcolor: '#1f1f1f' },
            shapes: [{
              type: 'line',
              x0: Math.min(...dteLabels),
              y0: spot,
              x1: Math.max(...dteLabels),
              y1: spot,
              line: { color: '#f59e0b', width: 2, dash: 'dash' },
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
                increasing: { line: { color: '#22c55e' } },
                decreasing: { line: { color: '#ef4444' } },
                name: ticker,
              } as never]}
              layout={{
                paper_bgcolor: 'rgba(0,0,0,0)',
                plot_bgcolor: 'rgba(0,0,0,0)',
                font: { color: '#a1a1aa', size: 9 },
                margin: { l: 48, r: 16, t: 28, b: 40 },
                title: { text: `${ticker} PRICE HISTORY`, font: { color: '#e4e4e7', size: 11 }, x: 0.05 },
                xaxis: { rangeslider: { visible: false }, gridcolor: '#1f1f1f' },
                yaxis: { title: { text: 'Price ($)' }, gridcolor: '#1f1f1f' },
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
        <p className="text-[10px] text-muted-foreground">
          GEX = γ × OI × sign · Red = dealers short gamma · Green = long gamma · Dashed = spot
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {makeHeatmap(gexGrid, GEX_COLORSCALE, 'GEX') && (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {makeHeatmap(gexGrid, GEX_COLORSCALE, 'GEX')}
          </div>
        )}
        {makeHeatmap(charmGrid, CHARM_COLORSCALE, 'CHARM EXPOSURE') && (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {makeHeatmap(charmGrid, CHARM_COLORSCALE, 'CHARM EXPOSURE')}
          </div>
        )}
      </div>
      {!gexGrid?.T_vals?.length && (
        <div className="rounded-xl border border-border bg-card py-6 text-center text-[10px] text-muted-foreground">
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
      <p className="text-[10px] text-muted-foreground">
        Puts ← Left · Calls → Right · Open Interest · Spot ${data.spot?.toFixed(0)}
      </p>
      <div className="mt-2 rounded-xl border border-border bg-card p-3">
        <ResponsiveContainer width="100%" height={Math.max(320, strikeOIData.length * 18)}>
          <BarChart data={strikeOIData} layout="vertical" margin={{ top: 5, right: 16, left: 48, bottom: 5 }} barGap={0}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
            <XAxis type="number" tick={{ fill: '#8892a4', fontSize: 9 }} tickFormatter={(v) => Math.abs(v).toLocaleString()} />
            <YAxis type="category" dataKey="strike" tick={{ fill: '#8892a4', fontSize: 9 }} width={48} />
            <Tooltip
              contentStyle={{ background: '#0d1117', border: '1px solid #1e2d3d', fontSize: 11 }}
              formatter={(v: number, name: string) => [Math.abs(v).toLocaleString(), name === 'calls' ? 'Calls OI' : 'Puts OI']}
            />
            <ReferenceLine x={0} stroke="#52525b" strokeWidth={2} />
            <Bar dataKey="puts" fill="#d97706" name="puts" radius={[2, 0, 0, 2]} stackId="a" />
            <Bar dataKey="calls" fill="#3b82f6" name="calls" radius={[0, 2, 2, 0]} stackId="a" />
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
    if (value === 0) return '#0d1117';
    const intensity = Math.min(Math.abs(value) / maxGex, 1);
    if (value > 0) {
      return `rgb(${Math.round(20 + intensity * 30)},${Math.round(80 + intensity * 120)},${Math.round(180 + intensity * 75)})`;
    }
    return `rgb(${Math.round(180 + intensity * 75)},${Math.round(20 + intensity * 20)},${Math.round(20 + intensity * 20)})`;
  }

  return (
    <div>
      <h3 className="text-xs font-semibold text-foreground">GAMMA EXPOSURE CALENDAR</h3>
      <p className="text-[10px] text-muted-foreground">
        Strike vs Expiry · Blue = MM long gamma · Red = MM short gamma
      </p>
      <div className="mt-2 max-h-[400px] overflow-auto rounded-xl border border-border bg-card p-2">
        <table className="w-full border-collapse text-[10px]">
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
                  <td className={`p-1 text-right ${isSpot ? 'font-bold text-amber-400' : 'text-muted-foreground'}`}>
                    {isSpot ? '▶' : ''}{K}
                  </td>
                  {expiries.map((T) => {
                    const val = gexCalendar[T.toFixed(3)]?.[K] || 0;
                    return (
                      <td
                        key={T}
                        style={{ background: gexColor(val), padding: '3px 4px' }}
                        className="text-center text-[9px]"
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
