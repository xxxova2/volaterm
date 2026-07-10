/**
 * Bloomberg-style 3M SOFR futures yield strip:
 * white = live implied yield, blue = prior settlement yield.
 * X = delivery quarter (Sep24→Dec30), Y = yield %.
 * Live = yfinance; expired = FRED SOFR compound final settlement.
 * Visual twin of the uploaded dual-path chart (black field, dual dots).
 */
import {
  CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { chartTooltipStyle } from '../../../lib/chartTheme';

export type SofrCurvePoint = {
  x: string;
  rate: number | null;
  prior?: number | null;
  vsSofr?: number | null;
  source?: string;
  contract?: string;
};

export function SofrFuturesCurve({
  data,
  height = 280,
  asOf,
}: {
  data: SofrCurvePoint[];
  height?: number;
  asOf?: string | null;
}) {
  const rows = data.filter((d) => d.rate != null || d.prior != null);
  const liveLabel = '3M SOFR Future · Yield · Live Data';
  const priorLabel = asOf
    ? `3M SOFR Future · Yield · ${asOf}`
    : '3M SOFR Future · Yield · prior settle';

  if (rows.length < 2) {
    return (
      <div
        className="flex items-center justify-center rounded border border-border bg-black/90 font-mono text-type-xs text-muted-foreground"
        style={{ height }}
      >
        Awaiting live 3M SOFR futures strip…
      </div>
    );
  }

  return (
    <div className="rounded border border-border bg-black p-1.5">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-1 px-1">
        <span className="font-mono text-type-xs font-semibold tracking-wide text-zinc-100">
          3 MONTH SOFR FUTURE · YIELD
        </span>
        <span className="font-mono text-type-2xs text-zinc-500">
          Sep24→Dec30 · white = live · blue = prior · settled = FRED SOFR · USD %
        </span>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={rows} margin={{ top: 10, right: 18, left: 4, bottom: 8 }}>
          <CartesianGrid stroke="#1f1f1f" strokeDasharray="0" vertical horizontal />
          <XAxis
            dataKey="x"
            tick={{ fill: '#a1a1aa', fontSize: 9, fontFamily: 'JetBrains Mono' }}
            interval={0}
            angle={-40}
            textAnchor="end"
            height={48}
            minTickGap={4}
            axisLine={{ stroke: '#333' }}
            tickLine={{ stroke: '#333' }}
          />
          <YAxis
            tick={{ fill: '#a1a1aa', fontSize: 10, fontFamily: 'JetBrains Mono' }}
            width={42}
            domain={['auto', 'auto']}
            tickFormatter={(v) => Number(v).toFixed(2)}
            axisLine={{ stroke: '#333' }}
            tickLine={{ stroke: '#333' }}
            label={{
              value: 'USD',
              angle: -90,
              position: 'insideLeft',
              fill: '#71717a',
              fontSize: 10,
              fontFamily: 'JetBrains Mono',
            }}
          />
          <Tooltip
            contentStyle={{
              ...chartTooltipStyle,
              background: '#0a0a0a',
              border: '1px solid #333',
              color: '#fafafa',
            }}
            formatter={(v: number, name: string) => [
              `${Number(v).toFixed(3)}%`,
              name === 'rate' ? liveLabel : priorLabel,
            ]}
            labelFormatter={(l) => String(l)}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: '#a1a1aa', paddingTop: 4 }}
            formatter={(value) => (value === 'rate' ? liveLabel : priorLabel)}
            iconType="circle"
          />
          {/* Blue = prior settlement (Bloomberg-style compare path) */}
          <Line
            type="monotone"
            dataKey="prior"
            name="prior"
            stroke="#3b82f6"
            strokeWidth={2.25}
            dot={{ r: 3.5, fill: '#3b82f6', stroke: '#3b82f6' }}
            activeDot={{ r: 5 }}
            connectNulls
            isAnimationActive={false}
          />
          {/* White = live strip */}
          <Line
            type="monotone"
            dataKey="rate"
            name="rate"
            stroke="#f4f4f5"
            strokeWidth={2.25}
            dot={{ r: 3.5, fill: '#f4f4f5', stroke: '#f4f4f5' }}
            activeDot={{ r: 5 }}
            connectNulls
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
