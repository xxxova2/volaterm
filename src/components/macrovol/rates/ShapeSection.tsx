import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { CurveShapeData, ImplyRead } from '../../../lib/macrovol/api';
import { DataBadge } from '../DataBadge';
import { CollapsibleSection } from '../../terminal/CollapsibleSection';
import { chartTooltipStyle } from '../../../lib/chartTheme';
import { ImplyChip } from '../../common/ImplyDrawer';
import { Spark } from './Spark';

export function ShapeSection({
  shape,
  shapeHistoryCharts,
  onOpenImply,
}: {
  shape: CurveShapeData;
  shapeHistoryCharts: {
    s2s10: { date: string; bps: number }[];
    s5s30: { date: string; bps: number }[];
    fly: { date: string; bps: number }[];
  };
  onOpenImply: (i: ImplyRead) => void;
}) {
  const shapeCards = [
    { key: '2s10s', label: '2s10s', spark: shape.history?.spark_2s10s, color: '#3b82f6' },
    { key: '5s30s', label: '5s30s', spark: shape.history?.spark_5s30s, color: '#22c55e' },
    { key: 'fly_2s5s10s', label: '2s5s10s fly', spark: shape.history?.spark_fly, color: '#a78bfa' },
    { key: '2s5s', label: '2s5s', spark: undefined, color: '#f59e0b' },
    { key: '10s30s', label: '10s30s', spark: undefined, color: '#06b6d4' },
    { key: '3m10y', label: '3m10y', spark: undefined, color: '#ef4444' },
  ];

  return (
    <CollapsibleSection
      id="sec-shape"
      className="order-6"
      title="CURVE SHAPE"
      apis={['FRED']}
      defaultOpen
      storageKey="rates.sec.shape"
      badge={
        <>
          <span
            className={`rounded px-1.5 py-0.5 text-type-2xs font-bold ${
              shape.regime === 'steep'
                ? 'bg-up/15 text-up'
                : shape.regime === 'inverted'
                  ? 'bg-down/15 text-down'
                  : 'bg-amber-500/15 text-amber-400'
            }`}
          >
            {shape.regime.toUpperCase()}
          </span>
          {shape.imply && <ImplyChip imply={shape.imply} onOpen={onOpenImply} />}
          <span className="hidden text-type-xs text-muted-foreground xl:inline">{shape.regime_note}</span>
        </>
      }
    >
      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
        {shapeCards.map((sc) => {
          const sp = shape.spreads[sc.key];
          const bps = sp?.bps;
          return (
            <div key={sc.key} className="rounded-lg border border-border bg-background/50 p-3">
              <div className="text-type-xs text-muted-foreground">{sc.label}</div>
              <div className={`text-lg font-bold ${bps != null && bps < 0 ? 'text-down' : 'text-foreground'}`}>
                {bps != null ? `${bps >= 0 ? '+' : ''}${bps.toFixed(0)}` : '—'}
                <span className="ml-0.5 text-type-xs font-normal text-muted-foreground">bps</span>
              </div>
              <div className="mt-1 text-type-2xs text-muted-foreground/80">{sp?.formula}</div>
              {sp?.imply && (
                <div className="mt-1">
                  <ImplyChip imply={sp.imply} compact onOpen={onOpenImply} />
                </div>
              )}
              {sc.spark && sc.spark.length > 0 && (
                <div className="mt-1">
                  <Spark values={sc.spark} color={sc.color} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
        {[
          { title: '2s10s history', data: shapeHistoryCharts.s2s10, color: '#3b82f6' },
          { title: '5s30s history', data: shapeHistoryCharts.s5s30, color: '#22c55e' },
          { title: '2s5s10s fly', data: shapeHistoryCharts.fly, color: '#a78bfa' },
        ].map((ch) => (
          <div key={ch.title}>
            <div className="mb-1 text-type-xs text-muted-foreground">{ch.title} (bps)</div>
            {ch.data.length > 0 ? (
              <ResponsiveContainer width="100%" height={110}>
                <AreaChart data={ch.data}>
                  <CartesianGrid stroke="#1f1f1f" strokeDasharray="2 2" />
                  <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 8 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: '#71717a', fontSize: 8 }} width={32} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <ReferenceLine y={0} stroke="#333" />
                  <Area type="monotone" dataKey="bps" stroke={ch.color} fill={ch.color} fillOpacity={0.15} strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="py-6 text-center text-type-xs text-muted-foreground">No aligned history</div>
            )}
          </div>
        ))}
      </div>
      <DataBadge asOf={shape.as_of} source={shape.source || 'FRED'} note={shape.unit_note} className="mt-2" />
    </CollapsibleSection>
  );
}
