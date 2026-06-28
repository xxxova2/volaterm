import { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTerminalStore } from '../../store/terminalStore';
import { Panel } from '../terminal/Panel';
import { fmtPct } from '../../lib/format';
import { cn } from '../../lib/utils';
import type { OptionQuote } from '../../lib/options/types';

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

  return {
    atmIV,
    rr25: iv25c != null && iv25p != null ? iv25c - iv25p : null,
    fly25: iv25c != null && iv25p != null ? (iv25c + iv25p) / 2 - atmIV : null,
    rr10: iv10c != null && iv10p != null ? iv10c - iv10p : null,
  };
}

export function SmileView() {
  const snapshot = useTerminalStore(s => s.snapshot);
  const [xMode, setXMode] = useState<'moneyness' | 'strike'>('moneyness');
  const [selectedExpiryIdx, setSelectedExpiryIdx] = useState<number>(0);

  const chartData = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.expiries.slice(0, 6).map((slice, i) => {
      const all = [...slice.calls, ...slice.puts]
        .filter(q => q.iv != null && q.iv > 0)
        .sort((a, b) => a.strike - b.strike);
      return {
        expiry: slice.expiry,
        dte: slice.dte,
        label: `${slice.dte}d`,
        visible: i === selectedExpiryIdx,
        data: all.map(q => ({
          x: xMode === 'moneyness' ? Math.log(q.strike / snapshot.spot) * 100 : q.strike,
          iv: q.iv! * 100,
          type: q.type,
          strike: q.strike,
        })),
      };
    });
  }, [snapshot, xMode, selectedExpiryIdx]);

  const skewMetrics = useMemo(() => {
    return computeSkewMetrics(snapshot, selectedExpiryIdx);
  }, [snapshot, selectedExpiryIdx]);

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
            className={cn('px-2 py-0.5 text-[10px] font-mono rounded', xMode === 'moneyness' ? 'bg-primary/20 text-primary' : 'text-muted-foreground')}
          >
            Moneyness
          </button>
          <button
            onClick={() => setXMode('strike')}
            className={cn('px-2 py-0.5 text-[10px] font-mono rounded', xMode === 'strike' ? 'bg-primary/20 text-primary' : 'text-muted-foreground')}
          >
            Strike
          </button>
          <div className="flex-1" />
          <span className="text-[10px] text-muted-foreground font-mono">ATM IV: {fmtPct(snapshot.expiries[selectedExpiryIdx]?.atmIV ?? 0)}</span>
        </div>

        {skewMetrics && (
          <div className="flex gap-3 px-3 py-1 border-b border-border text-[10px] font-mono items-center">
            <span className="text-muted-foreground">ATM: <span className="text-foreground">{(skewMetrics.atmIV * 100).toFixed(1)}%</span></span>
            <span className="text-border">|</span>
            <span className="text-muted-foreground">25Δ RR:
              <span className={skewMetrics.rr25 != null ? (skewMetrics.rr25 > 0 ? ' text-up' : ' text-down') : ' text-muted'}>
                {skewMetrics.rr25 != null ? `${skewMetrics.rr25 > 0 ? '+' : ''}${(skewMetrics.rr25 * 100).toFixed(2)}%` : ' —'}
              </span>
            </span>
            <span className="text-border">|</span>
            <span className="text-muted-foreground">25Δ Fly: <span className="text-purple">{skewMetrics.fly25 != null ? `${(skewMetrics.fly25 * 100).toFixed(2)}%` : '—'}</span></span>
            <span className="text-border">|</span>
            <span className="text-muted-foreground">10Δ RR:
              <span className={skewMetrics.rr10 != null ? (skewMetrics.rr10 > 0 ? ' text-up' : ' text-down') : ' text-muted'}>
                {skewMetrics.rr10 != null ? `${skewMetrics.rr10 > 0 ? '+' : ''}${(skewMetrics.rr10 * 100).toFixed(2)}%` : ' —'}
              </span>
            </span>
          </div>
        )}

        <div className="flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
              <XAxis
                dataKey="x"
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)', fontFamily: 'JetBrains Mono' }}
                tickLine={false}
                label={{ value: xMode === 'moneyness' ? 'Log-Moneyness (%)' : 'Strike', position: 'bottom', fontSize: 10, fill: 'var(--muted-foreground)' }}
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
              {chartData.map((slice, i) => (
                <Line
                  key={slice.expiry}
                  data={slice.data}
                  type="monotone"
                  dataKey="iv"
                  stroke={i === selectedExpiryIdx ? '#f97316' : colors[i % colors.length]}
                  strokeWidth={i === selectedExpiryIdx ? 2.5 : 1}
                  strokeOpacity={i === selectedExpiryIdx ? 1 : 0.3}
                  dot={false}
                  name={slice.label}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-wrap gap-1 px-2 py-1 border-t border-border">
          {chartData.map((slice, i) => (
            <button
              key={slice.expiry}
              onClick={() => setSelectedExpiryIdx(i)}
              className={cn('px-1.5 py-0.5 text-[10px] font-mono rounded transition-colors',
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
