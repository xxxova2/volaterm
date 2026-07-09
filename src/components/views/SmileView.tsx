import { useMemo, useState } from 'react';
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart } from 'recharts';
import { useTerminalStore } from '../../store/terminalStore';
import { Panel } from '../terminal/Panel';
import { fmtPct } from '../../lib/format';
import { cn } from '../../lib/utils';
import { DiagnosticsStrip } from './DiagnosticsStrip';
import { fitSVI, svi } from '../../lib/options/svi';
import type { OptionQuote } from '../../lib/options/types';
import { Explain } from '../common/Explain';

type XMode = 'moneyness' | 'strike' | 'delta';

function interpolateIV(quotes: OptionQuote[], targetDelta: number): number | null {
  const sorted = [...quotes]
    .filter(q => q.delta != null && q.iv != null)
    .sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0));
  if (sorted.length < 2) return null;

  const deltas = sorted.map(q => q.delta!);
  const ivs = sorted.map(q => q.iv!);

  if (targetDelta <= deltas[0]!) return ivs[0]!;
  if (targetDelta >= deltas[deltas.length - 1]!) return ivs[ivs.length - 1]!;

  for (let i = 0; i < deltas.length - 1; i++) {
    if (targetDelta >= deltas[i]! && targetDelta <= deltas[i + 1]!) {
      const t = (targetDelta - deltas[i]!) / (deltas[i + 1]! - deltas[i]! || 1);
      return ivs[i]! + t * (ivs[i + 1]! - ivs[i]!);
    }
  }
  return null;
}

function computeSkewMetrics(snapshot: ReturnType<typeof useTerminalStore.getState>['snapshot'], expiryIdx: number) {
  if (!snapshot) return null;
  const slice = snapshot.expiries[expiryIdx];
  if (!slice) return null;

  const allQuotes = [...slice.calls, ...slice.puts].filter(q => q.iv != null && q.delta != null);
  if (allQuotes.length < 5) return null;

  const atmQuote = allQuotes.reduce((best, q) =>
    Math.abs(q.strike - snapshot.spot) < Math.abs(best.strike - snapshot.spot) ? q : best
  , allQuotes[0]!);

  const atmIV = atmQuote.iv!;
  const callQuotes = slice.calls.filter(q => q.delta != null && q.delta > 0 && q.iv != null);
  const putQuotes = slice.puts.filter(q => q.delta != null && q.delta < 0 && q.iv != null);

  const iv25c = interpolateIV(callQuotes, 0.25);
  const iv10c = interpolateIV(callQuotes, 0.10);
  const iv25p = interpolateIV(putQuotes, -0.25);
  const iv10p = interpolateIV(putQuotes, -0.10);

  // Equity desk convention: RR = put wing − call wing (rich puts → positive RR).
  // Fly = average wing − ATM (smile curvature).
  return {
    atmIV,
    rr25: iv25c != null && iv25p != null ? iv25p - iv25c : null,
    fly25: iv25c != null && iv25p != null ? (iv25c + iv25p) / 2 - atmIV : null,
    rr10: iv10c != null && iv10p != null ? iv10p - iv10c : null,
  };
}

interface DataPoint {
  x: number;
  iv: number;
  type: 'call' | 'put';
  strike: number;
  bid?: number;
  ask?: number;
}

interface SVICurvePoint {
  x: number;
  sviIv: number;
}

export function SmileView() {
  const snapshot = useTerminalStore(s => s.snapshot);
  const surface = useTerminalStore(s => s.surface);
  const sviReadout = useTerminalStore(s => s.sviReadout);
  const arbResult = useTerminalStore(s => s.arbResult);
  const spot = snapshot?.spot ?? 100; void spot;
  const [xMode, setXMode] = useState<XMode>('moneyness');
  const [showBidAsk, setShowBidAsk] = useState(false);
  const [selectedExpiryIdx, setSelectedExpiryIdx] = useState<number>(0);

  const chartData = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.expiries.slice(0, 6).map((slice, i) => {
      const calls: DataPoint[] = slice.calls
        .filter(q => q.iv != null && q.iv > 0)
        .sort((a, b) => a.strike - b.strike)
        .map(q => ({
          x: xMode === 'moneyness' ? Math.log(q.strike / snapshot.spot) * 100
            : xMode === 'delta' ? (q.delta ?? 0)
            : q.strike,
          iv: q.iv! * 100,
          type: 'call' as const,
          strike: q.strike,
        }));
      const puts: DataPoint[] = slice.puts
        .filter(q => q.iv != null && q.iv > 0)
        .sort((a, b) => a.strike - b.strike)
        .map(q => ({
          x: xMode === 'moneyness' ? Math.log(q.strike / snapshot.spot) * 100
            : xMode === 'delta' ? (q.delta ?? 0)
            : q.strike,
          iv: q.iv! * 100,
          type: 'put' as const,
          strike: q.strike,
        }));
      return {
        expiry: slice.expiry,
        dte: slice.dte,
        label: `${slice.dte}d`,
        visible: i === selectedExpiryIdx,
        calls,
        puts,
        // Combined for backward compat + bid-ask computation.
        all: [...calls, ...puts].sort((a, b) => a.x - b.x),
      };
    });
  }, [snapshot, xMode, selectedExpiryIdx]);

  // SVI fitted curve for the selected expiry.
  const sviCurve = useMemo(() => {
    if (!surface || !snapshot) return null;
    const expiryIdx = selectedExpiryIdx;
    const row = surface.iv[expiryIdx];
    if (!row) return null;
    const dte = surface.dtes[expiryIdx] ?? 30;
    const T = Math.max(dte / 365, 1e-8);
    // Fit SVI on total variance w = IV²·T for this expiry.
    const fit = fitSVI(surface.strikes, row, snapshot.spot, T);
    if (!fit) return null;

    const kStrikes = surface.strikes.map(s => Math.log(s / snapshot.spot));
    const minK = Math.min(...kStrikes);
    const maxK = Math.max(...kStrikes);
    const points: SVICurvePoint[] = [];
    const n = 50;
    for (let i = 0; i <= n; i++) {
      const k = minK + (maxK - minK) * (i / n);
      const w = svi(fit.params, k);
      const iv = Math.sqrt(Math.max(0, w / T));
      const strike = snapshot.spot * Math.exp(k);
      let x: number;
      if (xMode === 'moneyness') {
        x = k * 100;
      } else if (xMode === 'delta') {
        // Estimate delta for a straddle-like reference.
        const d1 = (k + (0 + T * 0.5 * iv * iv)) / (iv * Math.sqrt(T));
        const nd = 0.5 * (1 + (d1 / Math.sqrt(2)) * (1 - d1 * d1 / 6)); // approx normCDF
        x = nd * 2 - 1;
      } else {
        x = strike;
      }
      points.push({ x, sviIv: iv * 100 });
    }
    return { points, params: fit.params, rmse: fit.rmse };
  }, [surface, snapshot, selectedExpiryIdx, xMode]);

  const skewMetrics = useMemo(() => {
    return computeSkewMetrics(snapshot, selectedExpiryIdx);
  }, [snapshot, selectedExpiryIdx]);

  const xLabel = xMode === 'moneyness' ? 'Log-Moneyness (%)'
    : xMode === 'delta' ? 'Delta'
    : 'Strike';

  if (!snapshot) {
    return (
      <Panel title="IV Smile / Skew" className="h-full">
        <div className="flex items-center justify-center h-full text-muted-foreground text-xs font-mono">No data</div>
      </Panel>
    );
  }

  const colors = ['#22c55e', '#3b82f6', '#eab308', '#a855f7', '#ec4899', '#f97316'];

  return (
    <Panel title="IV Smile / Skew" className="h-full">
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 px-2 py-1 border-b border-border">
          <button
            onClick={() => setXMode('moneyness')}
            className={cn('px-2 py-0.5 text-type-xs font-mono rounded', xMode === 'moneyness' ? 'bg-primary/20 text-primary' : 'text-muted-foreground')}
          >
            Moneyness
          </button>
          <button
            onClick={() => setXMode('strike')}
            className={cn('px-2 py-0.5 text-type-xs font-mono rounded', xMode === 'strike' ? 'bg-primary/20 text-primary' : 'text-muted-foreground')}
          >
            Strike
          </button>
          <button
            onClick={() => setXMode('delta')}
            className={cn('px-2 py-0.5 text-type-xs font-mono rounded', xMode === 'delta' ? 'bg-primary/20 text-primary' : 'text-muted-foreground')}
          >
            Delta
          </button>
          <button
            onClick={() => setShowBidAsk(s => !s)}
            className={cn('px-2 py-0.5 text-type-xs font-mono rounded', showBidAsk ? 'bg-primary/20 text-primary' : 'text-muted-foreground')}
          >
            Bid-Ask
          </button>
          <div className="flex-1" />
          <span className="text-type-xs text-muted-foreground font-mono"><Explain term="atmIV">ATM IV</Explain>: {fmtPct(snapshot.expiries[selectedExpiryIdx]?.atmIV ?? 0)}</span>
        </div>

        {skewMetrics && (
          <div className="flex gap-3 px-3 py-1 border-b border-border text-type-xs font-mono items-center">
            <span className="text-muted-foreground"><Explain term="atmIV">ATM</Explain>: <span className="text-foreground">{(skewMetrics.atmIV * 100).toFixed(1)}%</span></span>
            <span className="text-border">|</span>
            <span className="text-muted-foreground" title="RR = IV(25Δ put) − IV(25Δ call); + = put wing richer">
              <Explain term="riskReversal">25Δ RR</Explain>:
              <span className={skewMetrics.rr25 != null ? (skewMetrics.rr25 > 0 ? ' text-up' : ' text-down') : ' text-muted'}>
                {skewMetrics.rr25 != null ? `${skewMetrics.rr25 > 0 ? '+' : ''}${(skewMetrics.rr25 * 100).toFixed(2)}%` : ' —'}
              </span>
            </span>
            <span className="text-border">|</span>
            <span className="text-muted-foreground"><Explain term="butterfly">25Δ Fly</Explain>: <span className="text-purple">{skewMetrics.fly25 != null ? `${(skewMetrics.fly25 * 100).toFixed(2)}%` : '—'}</span></span>
            <span className="text-border">|</span>
            <span className="text-muted-foreground" title="RR = IV(10Δ put) − IV(10Δ call)">
              <Explain term="riskReversal">10Δ RR</Explain>:
              <span className={skewMetrics.rr10 != null ? (skewMetrics.rr10 > 0 ? ' text-up' : ' text-down') : ' text-muted'}>
                {skewMetrics.rr10 != null ? `${skewMetrics.rr10 > 0 ? '+' : ''}${(skewMetrics.rr10 * 100).toFixed(2)}%` : ' —'}
              </span>
            </span>
          </div>
        )}

        <DiagnosticsStrip sviReadout={sviReadout} arbResult={arbResult} data-testid="smile-diagnostics" />

        <div className="flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
              <XAxis
                dataKey="x"
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)', fontFamily: 'JetBrains Mono' }}
                tickLine={false}
                label={{ value: xLabel, position: 'bottom', fontSize: 10, fill: 'var(--muted-foreground)' }}
                domain={['auto', 'auto']}
                type="number"
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)', fontFamily: 'JetBrains Mono' }}
                tickLine={false}
                tickFormatter={(v: number) => `${v.toFixed(1)}%`}
                domain={['auto', 'auto']}
              />
              <Tooltip
                contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 11, fontFamily: 'JetBrains Mono' }}
                labelStyle={{ color: 'var(--foreground)' }}
              />

              {/* Calls — solid lines */}
              {chartData.map((slice, i) => (
                <Line
                  key={`call-${slice.expiry}`}
                  data={slice.calls}
                  type="monotone"
                  dataKey="iv"
                  stroke={i === selectedExpiryIdx ? '#f97316' : colors[i % colors.length]}
                  strokeWidth={i === selectedExpiryIdx ? 2.5 : 1}
                  strokeOpacity={i === selectedExpiryIdx ? 1 : 0.3}
                  dot={i === selectedExpiryIdx ? { r: 3, fill: 'var(--card)', stroke: '#f97316', strokeWidth: 1.5 } : false}
                  name={`${slice.label} Calls`}
                  connectNulls
                  points={undefined}
                />
              ))}

              {/* Puts — dashed lines */}
              {chartData.map((slice, i) => (
                <Line
                  key={`put-${slice.expiry}`}
                  data={slice.puts}
                  type="monotone"
                  dataKey="iv"
                  stroke={i === selectedExpiryIdx ? '#f97316' : colors[i % colors.length]}
                  strokeWidth={i === selectedExpiryIdx ? 2 : 0.8}
                  strokeOpacity={i === selectedExpiryIdx ? 0.8 : 0.2}
                  strokeDasharray={i === selectedExpiryIdx ? '6 3' : '3 3'}
                  dot={i === selectedExpiryIdx ? { r: 2.5, fill: 'var(--card)', stroke: '#f97316', strokeWidth: 1 } : false}
                  name={`${slice.label} Puts`}
                  connectNulls
                  points={undefined}
                />
              ))}

              {/* SVI fitted curve overlay */}
              {sviCurve && (
                <Line
                  data={sviCurve.points}
                  type="monotone"
                  dataKey="sviIv"
                  stroke="#a855f7"
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                  dot={false}
                  name={`SVI fit (RMSE ${(sviCurve.rmse * 100).toFixed(2)}%)`}
                  isAnimationActive={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {sviCurve && (
          <div className="flex gap-3 px-3 py-0.5 border-t border-border text-type-2xs font-mono text-muted-foreground">
            <span>SVI: a={sviCurve.params.a.toFixed(4)} b={sviCurve.params.b.toFixed(4)} ρ={sviCurve.params.rho.toFixed(3)} m={sviCurve.params.m.toFixed(4)} σ={sviCurve.params.sigma.toFixed(4)}</span>
            <span className="text-purple"><Explain term="sviRmse">RMSE</Explain> {(sviCurve.rmse * 100).toFixed(3)}%</span>
          </div>
        )}

        <div className="flex flex-wrap gap-1 px-2 py-1 border-t border-border">
          {chartData.map((slice, i) => (
            <button
              key={slice.expiry}
              onClick={() => setSelectedExpiryIdx(i)}
              className={cn('px-1.5 py-0.5 text-type-xs font-mono rounded transition-colors',
                i === selectedExpiryIdx ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground hover:text-foreground'
              )}
              style={{ borderLeft: `2px solid ${colors[i % colors.length]}` }}
            >
              {slice.label}
            </button>
          ))}
        </div>
      </div>
    </Panel>
  );
}
