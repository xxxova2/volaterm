import { lazy, Suspense, useEffect, useState } from 'react';
import { macrovolApi, type IVSurfaceData } from '../../lib/macrovol/api';
import { DataBadge } from './DataBadge';
import { useTerminalStore } from '../../store/terminalStore';

const Plot = lazy(() => import('react-plotly.js'));

const POPULAR = ['SPY', 'QQQ', 'AAPL', 'TSLA', 'NVDA', 'AMZN', 'MSFT', 'META', 'GLD'];

const TIME_FILTERS = [
  { label: '1M', max_T: 0.08 },
  { label: '3M', max_T: 0.25 },
  { label: '6M', max_T: 0.5 },
  { label: '1Y', max_T: 1.0 },
  { label: 'ALL', max_T: 999 },
];

export function IVSurfaceMacro({ defaultTicker }: { defaultTicker?: string }) {
  const storeSymbol = useTerminalStore((s) => s.symbol);
  const [ticker, setTicker] = useState(defaultTicker || storeSymbol || 'SPY');
  const [input, setInput] = useState(defaultTicker || storeSymbol || 'SPY');
  const [r, setR] = useState<number | null>(null); // null = live SOFR from API
  const [q, setQ] = useState(0.013);
  const [data, setData] = useState<IVSurfaceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [yAxis, setYAxis] = useState<'strike' | 'moneyness'>('moneyness');
  const [maxT, setMaxT] = useState(999);
  const [rLabel, setRLabel] = useState('SOFR live');

  useEffect(() => {
    macrovolApi.ratesSummary().then((s) => {
      if (s.risk_free_rate != null) {
        setRLabel(`SOFR ${(s.risk_free_rate * 100).toFixed(2)}%`);
      }
    }).catch(() => {});
  }, []);

  async function load(t: string) {
    setLoading(true);
    setError('');
    setData(null);
    try {
      // null r → backend uses live SOFR (avoids stale 5% risk-free)
      const res = await macrovolApi.surface(t, r, q);
      setData(res);
      if ((res as IVSurfaceData & { r?: number }).r != null) {
        const used = (res as IVSurfaceData & { r: number }).r;
        setRLabel(`r ${(used * 100).toFixed(2)}%`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch surface');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(ticker);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker]);

  const yValues = data
    ? yAxis === 'strike'
      ? data.strikes
      : data.strikes.map((k) => parseFloat((Math.log(k / data.spot) * 100).toFixed(3)))
    : [];

  const filteredExpiries = data?.expiries?.filter((t) => t <= maxT) ?? [];
  const filteredGrid = data?.iv_grid?.slice(0, filteredExpiries.length) ?? [];

  return (
    <div className="flex flex-col gap-4 p-3 font-mono">
      <div className="flex flex-wrap items-center gap-2 text-[10px]">
        <span className="text-muted-foreground">EXPIRY:</span>
        {TIME_FILTERS.map((f) => (
          <button
            key={f.label}
            type="button"
            onClick={() => setMaxT(f.max_T)}
            className={`rounded border px-2 py-0.5 ${
              maxT === f.max_T
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border text-muted-foreground hover:border-primary'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {POPULAR.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => { setTicker(t); setInput(t); }}
            className={`rounded-lg border px-2.5 py-1 text-xs ${
              ticker === t
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-muted-foreground hover:border-primary hover:text-foreground'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-muted-foreground">Ticker</label>
          <div className="flex gap-1">
            <input
              className="w-24 rounded border border-border bg-background px-2 py-1.5 text-xs outline-none"
              value={input}
              onChange={(e) => setInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { setTicker(input); load(input); }
              }}
            />
            <button
              type="button"
              onClick={() => { setTicker(input); load(input); }}
              className="rounded bg-primary px-3 py-1.5 text-xs text-primary-foreground"
            >
              Load
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-muted-foreground">r ({rLabel})</label>
          <input
            type="number"
            step="0.001"
            placeholder="SOFR"
            className="w-24 rounded border border-border bg-background px-2 py-1.5 text-xs"
            value={r ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              setR(v === '' ? null : parseFloat(v));
            }}
            title="Leave empty to use live SOFR from FRED"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-muted-foreground">q (div yield)</label>
          <input
            type="number"
            step="0.001"
            className="w-20 rounded border border-border bg-background px-2 py-1.5 text-xs"
            value={q}
            onChange={(e) => setQ(parseFloat(e.target.value))}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-muted-foreground">Y-Axis</label>
          <select
            className="rounded border border-border bg-background px-2 py-1.5 text-xs"
            value={yAxis}
            onChange={(e) => setYAxis(e.target.value as 'strike' | 'moneyness')}
          >
            <option value="moneyness">Log-Moneyness (%)</option>
            <option value="strike">Strike ($)</option>
          </select>
        </div>
        <button
          type="button"
          onClick={() => load(ticker)}
          className="rounded border border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-primary"
        >
          Rebuild
        </button>
      </div>

      {loading && (
        <div className="text-xs text-muted-foreground animate-pulse">
          Fetching option chain for {ticker} via MacroVol API (yfinance)… 15–30s
        </div>
      )}
      {error && (
        <div className="rounded border border-red-500/40 bg-red-950/20 px-3 py-2 text-xs text-red-400">{error}</div>
      )}

      {data && !loading && (
        <>
          <div className="flex flex-wrap gap-4 text-[10px] text-muted-foreground">
            <span>{ticker}</span>
            <span>Spot: <strong className="text-foreground">${data.spot?.toFixed(2)}</strong></span>
            <span>Expiries: <strong className="text-foreground">{filteredExpiries.length}</strong></span>
            <span>Strikes: <strong className="text-foreground">{data.strikes?.length}</strong></span>
            <span>Points: <strong className="text-foreground">{data.raw_points ?? '—'}</strong></span>
            <span>r: <strong className="text-foreground">{rLabel}</strong></span>
            <span>API: <strong className="text-emerald-400">yfinance · MacroVol</strong></span>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-[#0a0a0a]">
            <Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Loading Plotly…</div>}>
              <Plot
                data={[{
                  type: 'surface',
                  x: filteredExpiries,
                  y: yAxis === 'strike' ? data.strikes : yValues,
                  z: filteredGrid,
                  colorscale: [
                    [0, '#2d1b69'],
                    [0.2, '#11998e'],
                    [0.4, '#38ef7d'],
                    [0.6, '#38ef7d'],
                    [0.8, '#f7971e'],
                    [1, '#FFD200'],
                  ],
                  showscale: true,
                  colorbar: {
                    title: { text: 'IV %' },
                    thickness: 16,
                    len: 0.8,
                    tickfont: { color: '#00ff41', size: 9 },
                  },
                  hovertemplate: 'T: %{x:.2f}yr · Y: %{y:.2f} · IV: %{z:.1f}%<extra></extra>',
                  contours: {
                    z: { show: true, usecolormap: true, highlightcolor: '#ffffff', project: { z: true } },
                  },
                } as never]}
                layout={{
                  paper_bgcolor: '#0a0a0a',
                  plot_bgcolor: '#0a0a0a',
                  font: { color: '#00ff41', size: 11, family: 'JetBrains Mono, monospace' },
                  margin: { l: 0, r: 70, t: 36, b: 0 },
                  title: {
                    text: `${ticker} IMPLIED VOLATILITY SURFACE`,
                    font: { color: '#00ff41', size: 12 },
                    x: 0.05,
                  },
                  scene: {
                    xaxis: { title: 'T (years)', color: '#00ff41', gridcolor: '#1a2a1a', backgroundcolor: '#050f05', showbackground: true },
                    yaxis: {
                      title: yAxis === 'strike' ? 'STRIKE ($)' : 'LOG-MONEYNESS (%)',
                      color: '#00ff41',
                      gridcolor: '#1a2a1a',
                      backgroundcolor: '#050f05',
                      showbackground: true,
                    },
                    zaxis: { title: 'IV %', color: '#00ff41', gridcolor: '#1a2a1a', backgroundcolor: '#050f05', showbackground: true },
                    bgcolor: '#0a0a0a',
                    camera: { eye: { x: 1.6, y: -1.6, z: 0.9 } },
                    aspectmode: 'manual',
                    aspectratio: { x: 2, y: 1.2, z: 0.8 },
                  },
                  height: 520,
                } as never}
                config={{ responsive: true, displayModeBar: true, displaylogo: false }}
                style={{ width: '100%' }}
              />
            </Suspense>
          </div>
          <DataBadge asOf={data.as_of || data.timestamp} source={data.source || 'yfinance · MacroVol'} staleThresholdMin={60} />
        </>
      )}
    </div>
  );
}
