/**
 * Bloomberg-style dual UST yield curve:
 * white = today, blue = ~1 year ago (or selected compare date).
 * Matches the uploaded dual-path chart aesthetic (black field, dual dots).
 */
import {
  CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  CHART, chartAxisTick, chartTooltipStyle,
} from '../../../lib/chartTheme';

export type CurveComparePoint = {
  label: string;
  today: number | null;
  historical: number | null;
  delta_bps?: number | null;
};

function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  // FRED dates are YYYY-MM-DD
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return `${Number(m[2])}/${Number(m[3])}/${m[1]}`;
}

export function YieldCurveCompare({
  points,
  todayAsOf,
  compareAsOf,
  height = 280,
  source,
}: {
  points: CurveComparePoint[];
  todayAsOf?: string | null;
  compareAsOf?: string | null;
  height?: number;
  source?: string | null;
}) {
  const rows = points.filter((p) => p.today != null || p.historical != null);
  const liveLabel = `UST CMT · Live · ${fmtDate(todayAsOf)}`;
  const histLabel = `UST CMT · Yield · ${fmtDate(compareAsOf)}`;

  if (rows.length < 2) {
    return (
      <div
        className="flex items-center justify-center rounded border border-border bg-black/90 font-mono text-type-xs text-muted-foreground"
        style={{ height }}
      >
        Awaiting FRED UST curve (today vs last year)…
      </div>
    );
  }

  return (
    <div className="rounded border border-border bg-black p-1.5">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-1 px-1">
        <span className="font-mono text-type-xs font-semibold tracking-wide text-zinc-100">
          UST YIELD CURVE · TODAY VS LAST YEAR
        </span>
        <span className="font-mono text-type-2xs text-zinc-500">
          {source || 'FRED'} · white = live · blue = ~1Y ago · USD %
        </span>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={rows} margin={{ top: 10, right: 18, left: 4, bottom: 8 }}>
          <CartesianGrid stroke={CHART.grid} strokeDasharray="0" vertical horizontal />
          <XAxis
            dataKey="label"
            tick={chartAxisTick}
            axisLine={{ stroke: CHART.axisLine }}
            tickLine={{ stroke: CHART.axisLine }}
            interval={0}
          />
          <YAxis
            tick={chartAxisTick}
            width={42}
            domain={['auto', 'auto']}
            tickFormatter={(v) => Number(v).toFixed(2)}
            axisLine={{ stroke: CHART.axisLine }}
            tickLine={{ stroke: CHART.axisLine }}
            label={{
              value: 'USD',
              angle: -90,
              position: 'insideLeft',
              fill: CHART.axisMuted,
              fontSize: 10,
              fontFamily: 'JetBrains Mono',
            }}
          />
          <Tooltip
            contentStyle={chartTooltipStyle}
            formatter={(v: number, name: string) => {
              const n = Number(v);
              if (!Number.isFinite(n)) return ['—', name];
              return [
                `${n.toFixed(3)}%`,
                name === 'today' ? liveLabel : histLabel,
              ];
            }}
            labelFormatter={(l) => `Tenor ${l}`}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: CHART.legend, paddingTop: 4 }}
            formatter={(value) => (value === 'today' ? liveLabel : histLabel)}
            iconType="circle"
          />
          {/* Blue = last year (Bloomberg compare series) */}
          <Line
            type="monotone"
            dataKey="historical"
            name="historical"
            stroke={CHART.series.compare}
            strokeWidth={2.25}
            dot={{ r: 3.5, fill: CHART.series.compare, stroke: CHART.series.compare }}
            activeDot={{ r: 5 }}
            connectNulls
            isAnimationActive={false}
          />
          {/* White = live today */}
          <Line
            type="monotone"
            dataKey="today"
            name="today"
            stroke={CHART.series.live}
            strokeWidth={2.25}
            dot={{ r: 3.5, fill: CHART.series.live, stroke: CHART.series.live }}
            activeDot={{ r: 5 }}
            connectNulls
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      {/* Compact delta strip under chart */}
      <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 border-t border-zinc-800 px-1 pt-1 font-mono text-type-2xs text-zinc-500">
        {rows.map((p) => {
          const d =
            p.delta_bps != null
              ? p.delta_bps
              : p.today != null && p.historical != null
                ? Math.round((p.today - p.historical) * 1000) / 10
                : null;
          if (d == null) return null;
          return (
            <span key={p.label}>
              <span className="text-zinc-400">{p.label}</span>{' '}
              <span className={d > 0 ? 'text-amber-400' : d < 0 ? 'text-emerald-400' : 'text-zinc-300'}>
                {d > 0 ? '+' : ''}
                {d.toFixed(0)}bp
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
