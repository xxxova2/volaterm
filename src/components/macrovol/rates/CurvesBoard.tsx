/**
 * Hero curves board — UST yield curve, SOFR futures path, and every spread history.
 * Dense grid to fill rates desk content area (not chrome).
 */
import {
  Area, AreaChart, CartesianGrid, Line, LineChart, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { CollapsibleSection } from '../../terminal/CollapsibleSection';
import { DataBadge } from '../DataBadge';
import { chartTooltipStyle } from '../../../lib/chartTheme';
import type { CurveShapeData, ImplyRead } from '../../../lib/macrovol/api';
import { ImplyChip } from '../../common/ImplyDrawer';
import { Spark } from './Spark';
import { SofrFuturesCurve } from './SofrFuturesCurve';

export type CurvePoint = { label: string; yield: number | null };
export type StirPathPoint = {
  x: string;
  rate: number | null;
  prior?: number | null;
  vsSofr: number | null;
  source?: string;
  contract?: string;
};
export type SpreadHist = { date: string; bps: number }[];

const SPREAD_META: {
  key: string;
  label: string;
  color: string;
  histKey: keyof SpreadHistoryPack;
  sparkKey?: string;
}[] = [
  { key: '2s10s', label: '2s10s', color: '#3b82f6', histKey: 's2s10', sparkKey: 'spark_2s10s' },
  { key: '5s30s', label: '5s30s', color: '#22c55e', histKey: 's5s30', sparkKey: 'spark_5s30s' },
  { key: '2s5s', label: '2s5s', color: '#f59e0b', histKey: 's2s5', sparkKey: 'spark_2s5s' },
  { key: '5s10s', label: '5s10s', color: '#06b6d4', histKey: 's5s10', sparkKey: 'spark_5s10s' },
  { key: '10s30s', label: '10s30s', color: '#a78bfa', histKey: 's10s30', sparkKey: 'spark_10s30s' },
  { key: '3m10y', label: '3m10y', color: '#ef4444', histKey: 's3m10y', sparkKey: 'spark_3m10y' },
  { key: 'fly_2s5s10s', label: '2s5s10s fly', color: '#ec4899', histKey: 'fly', sparkKey: 'spark_fly' },
];

export type SpreadHistoryPack = {
  s2s10: SpreadHist;
  s5s30: SpreadHist;
  s2s5: SpreadHist;
  s5s10: SpreadHist;
  s10s30: SpreadHist;
  s3m10y: SpreadHist;
  fly: SpreadHist;
};

function MiniCurve({
  title,
  subtitle,
  liveBps,
  formula,
  data,
  color,
  imply,
  spark,
  onOpenImply,
}: {
  title: string;
  subtitle?: string;
  liveBps?: number | null;
  formula?: string;
  data: SpreadHist;
  color: string;
  imply?: ImplyRead | null;
  spark?: number[];
  onOpenImply?: (i: ImplyRead) => void;
}) {
  const neg = liveBps != null && liveBps < 0;
  return (
    <div className="flex min-h-0 flex-col rounded border border-border bg-background/40 p-1.5">
      <div className="mb-0.5 flex items-baseline justify-between gap-1">
        <div className="min-w-0">
          <div className="truncate font-mono text-type-2xs font-semibold text-foreground">{title}</div>
          {formula && (
            <div className="truncate font-mono text-type-2xs text-muted-foreground/80">{formula}</div>
          )}
        </div>
        <div className={`shrink-0 font-mono text-sm font-bold tabular-nums ${neg ? 'text-down' : 'text-foreground'}`}>
          {liveBps != null ? `${liveBps >= 0 ? '+' : ''}${liveBps.toFixed(0)}` : '—'}
          <span className="ml-0.5 text-type-2xs font-normal text-muted-foreground">bp</span>
        </div>
      </div>
      {imply && onOpenImply && (
        <div className="mb-0.5">
          <ImplyChip imply={imply} compact onOpen={onOpenImply} />
        </div>
      )}
      {data.length > 0 ? (
        <div className="min-h-0 flex-1" style={{ height: 88 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--grid)" strokeDasharray="2 2" />
              <XAxis dataKey="date" hide />
              <YAxis hide domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={chartTooltipStyle}
                formatter={(v: number) => [`${Number(v).toFixed(1)} bp`, title]}
                labelFormatter={(l) => String(l)}
              />
              <ReferenceLine y={0} stroke="#333" strokeWidth={1} />
              <Area
                type="monotone"
                dataKey="bps"
                stroke={color}
                fill={color}
                fillOpacity={0.18}
                strokeWidth={1.4}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : spark && spark.length > 0 ? (
        <div className="flex h-[88px] items-center px-1">
          <Spark values={spark} color={color} />
        </div>
      ) : (
        <div className="flex h-[88px] items-center justify-center font-mono text-type-2xs text-muted-foreground">
          {subtitle || 'No history'}
        </div>
      )}
    </div>
  );
}

export function CurvesBoard({
  curve,
  curveMeta,
  stirChart,
  sofr,
  shape,
  spreadHistory,
  onOpenImply,
}: {
  curve: CurvePoint[];
  curveMeta: { as_of?: string; source?: string; note?: string };
  stirChart: StirPathPoint[];
  sofr: number | null | undefined;
  shape: CurveShapeData | null;
  spreadHistory: SpreadHistoryPack;
  onOpenImply?: (i: ImplyRead) => void;
}) {
  const ustLive = curve.filter((c) => c.yield != null);
  const sofrPath = stirChart.filter((p) => p.rate != null || p.prior != null);

  return (
    <CollapsibleSection
      id="sec-curves"
      className="order-2"
      title="CURVES & SPREADS"
      apis={['FRED', 'yfinance', 'MacroVol']}
      defaultOpen
      storageKey="rates.sec.curves"
      subtitle="3M SOFR strip (live vs prior settle) · UST CMTs · every spread history"
      badge={
        <span className="font-mono text-type-2xs text-muted-foreground">
          {sofrPath.length} SOFR futs · {ustLive.length} UST · {SPREAD_META.length} spreads
        </span>
      }
    >
      {/* Bloomberg-style dual SOFR futures yield path — full width hero */}
      <SofrFuturesCurve
        data={sofrPath.map((p) => ({
          x: p.x,
          rate: p.rate,
          prior: p.prior ?? null,
          vsSofr: p.vsSofr,
          source: p.source,
          contract: p.contract,
        }))}
        height={260}
      />

      {/* UST CMT curve under SOFR strip */}
      <div className="mt-2 rounded border border-border bg-background/30 p-1.5">
        <div className="mb-1 flex items-center justify-between">
          <span className="font-mono text-type-xs font-semibold text-primary">UST YIELD CURVE</span>
          <span className="font-mono text-type-2xs text-muted-foreground">
            {curveMeta.source || 'FRED'} · spot SOFR {sofr != null ? `${sofr.toFixed(2)}%` : '—'}
          </span>
        </div>
        {ustLive.length > 0 ? (
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={curve} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--grid)" strokeDasharray="2 2" />
              <XAxis dataKey="label" tick={{ fill: 'var(--muted-foreground)', fontSize: 9 }} />
              <YAxis
                tick={{ fill: 'var(--muted-foreground)', fontSize: 9 }}
                width={36}
                tickFormatter={(v) => `${v}`}
                domain={['auto', 'auto']}
              />
              <Tooltip
                contentStyle={chartTooltipStyle}
                formatter={(v: number) => [`${Number(v).toFixed(3)}%`, 'Yield']}
              />
              <Line
                type="monotone"
                dataKey="yield"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 2.5, fill: '#3b82f6' }}
                connectNulls
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[160px] items-center justify-center text-type-xs text-muted-foreground">
            Awaiting FRED curve…
          </div>
        )}
      </div>

      {/* Every spread — live print + history curve */}
      <div className="mt-2 grid grid-cols-2 gap-1.5 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
        {SPREAD_META.map((m) => {
          const sp = shape?.spreads?.[m.key];
          const hist = spreadHistory[m.histKey] || [];
          const spark = m.sparkKey
            ? (shape?.history as Record<string, number[]> | undefined)?.[m.sparkKey]
            : undefined;
          return (
            <MiniCurve
              key={m.key}
              title={m.label}
              formula={sp?.formula}
              liveBps={sp?.bps}
              data={hist}
              color={m.color}
              imply={sp?.imply}
              spark={spark}
              onOpenImply={onOpenImply}
            />
          );
        })}
      </div>

      <DataBadge
        asOf={shape?.as_of || curveMeta.as_of}
        source={shape?.source || curveMeta.source || 'FRED'}
        note="Spreads in bps · UST / SOFR path in % · aligned FRED history only"
        className="mt-1.5"
      />
    </CollapsibleSection>
  );
}
