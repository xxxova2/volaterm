import { useMemo, useState, useEffect } from 'react';
import {
  Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, ComposedChart,
} from 'recharts';
import { Panel } from '../terminal/Panel';
import { cn } from '../../lib/utils';
import { fmtPct, fmtSigned } from '../../lib/format';
import { fetchSpyHistory, computeHistogram, computeStats, normalPDF } from '../../lib/options/spyHistory';
import type { SpyReturn } from '../../lib/options/spyHistory';

type DateRange = 'full' | '1990s' | '2000s' | '2010s' | '2020s' | 'crisis';

function filterByRange(data: SpyReturn[], range: DateRange): SpyReturn[] {
  switch (range) {
    case '1990s': return data.filter(d => d.date < '2000-01-01');
    case '2000s': return data.filter(d => d.date >= '2000-01-01' && d.date < '2010-01-01');
    case '2010s': return data.filter(d => d.date >= '2010-01-01' && d.date < '2020-01-01');
    case '2020s': return data.filter(d => d.date >= '2020-01-01');
    case 'crisis': return data.filter(d => {
      const t = d.date;
      return (t >= '2007-01-01' && t <= '2009-12-31') ||
             (t >= '2020-02-01' && t <= '2020-04-30') ||
             (t >= '2022-01-01' && t <= '2022-12-31');
    });
    default: return data;
  }
}

interface RegimeConfig {
  label: string;
  minVix: number;
  maxVix: number;
  color: string;
}

const REGIMES: RegimeConfig[] = [
  { label: 'Low Vol', minVix: 0, maxVix: 15, color: '#22c55e' },
  { label: 'Normal', minVix: 15, maxVix: 25, color: '#3b82f6' },
  { label: 'Elevated', minVix: 25, maxVix: 35, color: '#eab308' },
  { label: 'High', minVix: 35, maxVix: 50, color: '#f97316' },
  { label: 'Crisis', minVix: 50, maxVix: 100, color: '#ef4444' },
];

export function SpyDistribution() {
  const [rawData, setRawData] = useState<SpyReturn[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>('full');
  const [useLog, setUseLog] = useState(false);
  const [showRegime, setShowRegime] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const data = fetchSpyHistory();
    setRawData(data);
    setLoading(false);
  }, []);

  const filteredData = useMemo(() => filterByRange(rawData, dateRange), [rawData, dateRange]);
  const returns = useMemo(() => filteredData.map(d => useLog ? d.logReturn : d.simpleReturn), [filteredData, useLog]);

  const stats = useMemo(() => computeStats(returns), [returns]);
  const hist = useMemo(() => computeHistogram(returns, 60), [returns]);

  const chartData = useMemo(() => {
    if (hist.binCenters.length === 0) return [];

    const total = hist.counts.reduce((a, b) => a + b, 0);
    const binWidth = hist.binCenters.length > 1 ? hist.binCenters[1]! - hist.binCenters[0]! : 0.01;
    const density = hist.counts.map(c => c / (total * binWidth));

    return hist.binCenters.map((center, i) => {
      const scaledCenter = center * 100;
      const normalVal = normalPDF(center, stats.mean, stats.std);
      return {
        x: scaledCenter,
        pct: ` ${scaledCenter.toFixed(2)}%`,
        density: density[i] ?? 0,
        normal: normalVal,
      };
    });
  }, [hist, stats]);

  const percentileMarkers = useMemo(() => {
    const pcts = [5, 10, 25, 50, 75, 90, 95];
    const sorted = [...returns].sort((a, b) => a - b);
    return pcts.map(p => {
      const idx = Math.floor(sorted.length * p / 100);
      return { pct: p, value: (sorted[idx] ?? 0) * 100 };
    });
  }, [returns]);

  const regimeSeries = useMemo(() => {
    if (!showRegime) return null;
    return REGIMES.map(reg => {
      const inRegime = filteredData.filter(d => d.vix >= reg.minVix && d.vix < reg.maxVix);
      const rets = inRegime.map(d => useLog ? d.logReturn : d.simpleReturn);
      const h = computeHistogram(rets, 30);
      const total = h.counts.reduce((a, b) => a + b, 0);
      if (total === 0) return null;
      return {
        label: reg.label,
        color: reg.color,
        data: h.binCenters.map((c, i) => ({
          x: c * 100,
          density: h.counts[i]! / (total * (h.binCenters[1]! - h.binCenters[0]!)),
        })),
      };
    }).filter(Boolean) as { label: string; color: string; data: { x: number; density: number }[] }[];
  }, [filteredData, useLog, showRegime]);

  if (loading) {
    return <div className="flex items-center justify-center h-full text-muted-foreground text-xs font-mono animate-pulse">Loading SPY history...</div>;
  }

  return (
    <Panel title="SPY Historical Distribution" subtitle="30 Years of Daily Returns">
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 px-2 py-1 border-b border-border flex-wrap">
          {(['full', '1990s', '2000s', '2010s', '2020s', 'crisis'] as DateRange[]).map(r => (
            <button
              key={r}
              onClick={() => setDateRange(r)}
              className={cn('px-2 py-0.5 text-[10px] font-mono rounded', dateRange === r ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground')}
            >
              {r === 'crisis' ? 'Crisis' : r}
            </button>
          ))}
          <div className="flex-1" />
          <button
            onClick={() => setUseLog(l => !l)}
            className={cn('px-2 py-0.5 text-[10px] font-mono rounded', useLog ? 'bg-cyan/20 text-cyan' : 'text-muted-foreground')}
          >
            Log Returns
          </button>
          <button
            onClick={() => setShowRegime(r => !r)}
            className={cn('px-2 py-0.5 text-[10px] font-mono rounded', showRegime ? 'bg-amber/20 text-amber' : 'text-muted-foreground')}
          >
            Regimes
          </button>
        </div>

        {showRegime && (
          <div className="flex gap-2 px-2 py-1 border-b border-border flex-wrap">
            {REGIMES.map(r => (
              <span key={r.label} className="flex items-center gap-1 text-[10px] font-mono">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: r.color }} />
                <span className="text-muted-foreground">{r.label}</span>
              </span>
            ))}
          </div>
        )}

        <div className="flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
              <XAxis
                dataKey="x"
                tick={{ fontSize: 9, fill: 'var(--muted-foreground)', fontFamily: 'JetBrains Mono' }}
                tickLine={false}
                tickFormatter={(v: number) => `${v.toFixed(1)}%`}
                label={{ value: 'Daily Return (%)', position: 'bottom', fontSize: 10, fill: 'var(--muted-foreground)' }}
              />
              <YAxis
                tick={{ fontSize: 9, fill: 'var(--muted-foreground)', fontFamily: 'JetBrains Mono' }}
                tickLine={false}
                tickFormatter={(v: number) => v.toFixed(1)}
                label={{ value: 'Density', angle: -90, position: 'insideLeft', fontSize: 10, fill: 'var(--muted-foreground)' }}
              />
              <Tooltip
                contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 11, fontFamily: 'JetBrains Mono' }}
                labelStyle={{ color: 'var(--foreground)' }}
                formatter={(value: number) => value.toFixed(3)}
              />
              <Bar dataKey="density" fill="var(--primary)" opacity={0.5} />
              <Area type="monotone" dataKey="normal" stroke="var(--cyan)" strokeWidth={2} fill="none" dot={false} />
              {percentileMarkers.map(m => (
                <ReferenceLine
                  key={m.pct}
                  x={m.value}
                  stroke="var(--muted-foreground)"
                  strokeDasharray="3 3"
                  label={{
                    value: `P${m.pct}`,
                    position: 'top',
                    fill: 'var(--muted-foreground)',
                    fontSize: 9,
                    fontFamily: 'JetBrains Mono',
                  }}
                />
              ))}
              <ReferenceLine x={stats.var95 * 100} stroke="var(--down)" strokeWidth={2} label={{ value: 'VaR 95%', position: 'top', fill: 'var(--down)', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
              <ReferenceLine x={stats.var99 * 100} stroke="var(--destructive)" strokeWidth={2} label={{ value: 'VaR 99%', position: 'top', fill: 'var(--destructive)', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
              {regimeSeries?.map(rs => (
                <Area key={rs.label} type="monotone" data={rs.data} dataKey="density" stroke={rs.color} fill={rs.color} fillOpacity={0.15} strokeWidth={1} />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-4 gap-2 px-3 py-2 border-t border-border text-[10px] font-mono">
          <div>
            <span className="text-muted-foreground">Obs </span>
            <span className="tabular-nums">{returns.length.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-muted-foreground">μ </span>
            <span className="tabular-nums">{fmtSigned(stats.mean * 100, 3)}%</span>
          </div>
          <div>
            <span className="text-muted-foreground">σ </span>
            <span className="tabular-nums">{fmtPct(stats.std, 3)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Skew </span>
            <span className="tabular-nums text-amber">{stats.skewness.toFixed(3)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Kurtosis </span>
            <span className="tabular-nums text-amber">{stats.kurtosis.toFixed(3)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">VaR 95 </span>
            <span className="tabular-nums text-down">{fmtPct(stats.var95, 2)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">VaR 99 </span>
            <span className="tabular-nums text-destructive">{fmtPct(stats.var99, 2)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">CVaR 95 </span>
            <span className="tabular-nums text-down">{fmtPct(stats.cvar95, 2)}</span>
          </div>
        </div>
      </div>
    </Panel>
  );
}
