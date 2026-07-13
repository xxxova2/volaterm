/**
 * VS3D Pack B3 — 3-pane dashboard chrome:
 *   Positions by Strike ‖ Gamma gradient ‖ Charm gradient
 *
 * Heatmaps = strike × expiry OI-inferred cross-section (live chain).
 * Not multi-day TRACE tape · not proprietary MM inventory.
 */
import { useCallback, useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { VolSnapshot } from '../../lib/options/types';
import {
  dealerCalendarGrid,
  type DealerCalendarMetric,
  type ExposureWeight,
  resolveExposureWeight,
} from '../../lib/options/analytics';
import { CanvasHeatmap } from './CanvasHeatmap';
import type { HeatmapCell } from './greeksTypes';
import { fmtCompact, fmtPrice } from '../../lib/format';
import { Explain } from '../common/Explain';
import { ChartZoom } from '../common/ChartZoom';
import { cn } from '../../lib/utils';
import {
  CHART,
  chartAxisTick,
  chartGridProps,
  chartTooltipStyle,
} from '../../lib/chartTheme';

type Props = {
  snapshot: VolSnapshot;
  weight: ExposureWeight;
  className?: string;
  /** Click expiry row → isolate that book on the parent dealer chart. */
  onExpiryPick?: (expiry: string) => void;
};

function gridToMatrix(
  grid: ReturnType<typeof dealerCalendarGrid>,
): { rows: { expiry: string; dte: number }[]; cols: number[]; cellMatrix: HeatmapCell[][]; min: number; max: number } {
  const cellMatrix: HeatmapCell[][] = grid.rows.map((row, ri) =>
    grid.strikes.map((strike, ci) => ({
      strike,
      dte: row.dte,
      expiry: row.expiry,
      value: grid.values[ri]?.[ci] ?? null,
    })),
  );
  return {
    rows: grid.rows,
    cols: grid.strikes,
    cellMatrix,
    min: grid.min,
    max: grid.max,
  };
}

/** Signed listed OI ladder (VS3D: put left / call right) — not “actual MM book”. */
function buildOiLadder(snapshot: VolSnapshot, weight: ExposureWeight, spotBand = 0.10) {
  const resolved = resolveExposureWeight(snapshot, weight);
  const mode = resolved.weight;
  const S = snapshot.spot;
  const byK = new Map<number, { calls: number; puts: number }>();

  for (const slice of snapshot.expiries) {
    for (const q of slice.calls) {
      if (Math.abs(q.strike - S) / S > spotBand) continue;
      const w = mode === 'volume'
        ? Math.max(0, q.volume ?? 0)
        : mode === 'unit'
          ? ((q.openInterest ?? 0) > 0 || (q.volume ?? 0) > 0 ? 1 : 0)
          : Math.max(0, q.openInterest ?? 0);
      if (w <= 0) continue;
      const cur = byK.get(q.strike) ?? { calls: 0, puts: 0 };
      cur.calls += w;
      byK.set(q.strike, cur);
    }
    for (const q of slice.puts) {
      if (Math.abs(q.strike - S) / S > spotBand) continue;
      const w = mode === 'volume'
        ? Math.max(0, q.volume ?? 0)
        : mode === 'unit'
          ? ((q.openInterest ?? 0) > 0 || (q.volume ?? 0) > 0 ? 1 : 0)
          : Math.max(0, q.openInterest ?? 0);
      if (w <= 0) continue;
      const cur = byK.get(q.strike) ?? { calls: 0, puts: 0 };
      cur.puts += w;
      byK.set(q.strike, cur);
    }
  }

  return [...byK.entries()]
    .map(([strike, v]) => ({
      strike,
      label: fmtPrice(strike, strike > 1000 ? 0 : 2),
      calls: v.calls,
      puts: -v.puts,
      net: v.calls - v.puts,
    }))
    .sort((a, b) => Math.abs(a.strike - S) - Math.abs(b.strike - S))
    .slice(0, 28)
    .sort((a, b) => b.strike - a.strike);
}

function PositionsByStrikePane({
  snapshot,
  weight,
}: {
  snapshot: VolSnapshot;
  weight: ExposureWeight;
}) {
  const rows = useMemo(() => buildOiLadder(snapshot, weight), [snapshot, weight]);
  const maxAbs = useMemo(
    () => Math.max(...rows.map((d) => Math.max(d.calls, -d.puts)), 1),
    [rows],
  );

  if (rows.length < 2) {
    return (
      <div className="flex h-full min-h-[12rem] items-center justify-center font-mono text-type-2xs text-muted-foreground">
        No OI ladder
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-x-2 border-b border-border/50 px-2 py-0.5">
        <span className="font-mono text-type-2xs font-semibold text-foreground">POS BY STRIKE</span>
        <span className="font-mono text-type-2xs text-muted-foreground">
          put ← · call → · {weight}
        </span>
      </div>
      <div className="relative min-h-0 flex-1 px-0.5 py-0.5">
        <div className="absolute inset-0.5">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 2, right: 4, left: 0, bottom: 2 }}
            barCategoryGap={1}
            barGap={0}
          >
            <CartesianGrid {...chartGridProps} horizontal={false} />
            <XAxis
              type="number"
              domain={[-maxAbs * 1.05, maxAbs * 1.05]}
              tick={{ ...chartAxisTick, fontSize: 8 }}
              tickFormatter={(v) => fmtCompact(Math.abs(Number(v)))}
              height={16}
            />
            <YAxis
              type="category"
              dataKey="label"
              tick={{ ...chartAxisTick, fontSize: 8 }}
              width={36}
              interval={0}
            />
            <Tooltip
              contentStyle={chartTooltipStyle}
              formatter={(v: number, name: string) => [
                Math.abs(v).toLocaleString(),
                name === 'calls' ? 'Call' : 'Put',
              ]}
              labelFormatter={(l) => `K ${l}`}
            />
            <ReferenceLine x={0} stroke={CHART.refLine} strokeWidth={1} />
            <Bar
              dataKey="puts"
              fill={CHART.series.warn}
              name="puts"
              isAnimationActive={false}
              maxBarSize={7}
              stackId="a"
            />
            <Bar
              dataKey="calls"
              fill={CHART.series.info}
              name="calls"
              isAnimationActive={false}
              maxBarSize={7}
              stackId="a"
            />
          </BarChart>
        </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function GradientPane({
  title,
  term,
  blurb,
  snapshot,
  weight,
  metric,
  onExpiryPick,
}: {
  title: string;
  term: string;
  blurb: string;
  snapshot: VolSnapshot;
  weight: ExposureWeight;
  metric: DealerCalendarMetric;
  onExpiryPick?: (expiry: string) => void;
}) {
  const [hover, setHover] = useState<HeatmapCell | null>(null);
  const [selected, setSelected] = useState<HeatmapCell | null>(null);

  const packed = useMemo(() => {
    const grid = dealerCalendarGrid(snapshot, metric, {
      weight,
      spotBand: 0.12,
      maxStrikes: 48,
      maxExpiries: 14,
    });
    return { grid, ...gridToMatrix(grid) };
  }, [snapshot, metric, weight]);

  const onHover = useCallback((c: HeatmapCell | null) => setHover(c), []);
  const onClick = useCallback(
    (c: HeatmapCell | null) => {
      setSelected(c);
      if (c?.expiry) onExpiryPick?.(c.expiry);
    },
    [onExpiryPick],
  );

  const empty = packed.rows.length === 0 || packed.cols.length === 0;
  const tip = hover ?? selected;

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 border-b border-border/50 px-2 py-0.5">
        <Explain term={term}>
          <span className="font-mono text-type-2xs font-semibold text-foreground">{title}</span>
        </Explain>
        <span className="font-mono text-type-2xs text-muted-foreground">{blurb}</span>
        {tip?.value != null && (
          <span className="ml-auto font-mono text-type-2xs tabular-nums text-foreground">
            {tip.dte}d · K{fmtPrice(tip.strike, tip.strike > 1000 ? 0 : 2)} · {fmtCompact(tip.value)}
          </span>
        )}
      </div>
      <div className="relative min-h-0 flex-1 px-0.5 py-0.5">
        {empty ? (
          <div className="flex h-full min-h-[12rem] items-center justify-center font-mono text-type-2xs text-muted-foreground">
            No {metric.toUpperCase()} grid
          </div>
        ) : (
          <div className="absolute inset-0.5">
            <CanvasHeatmap
              rows={packed.rows}
              cols={packed.cols}
              cellMatrix={packed.cellMatrix}
              min={packed.min}
              max={packed.max}
              diverging
              onCellHover={onHover}
              onCellClick={onClick}
              selectedCell={selected}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function DealerGradientPanel({ snapshot, weight, className, onExpiryPick }: Props) {
  const panes = (
    <div
      className={cn(
        'grid h-full grid-cols-1 gap-1.5',
        'md:grid-cols-2',
        'xl:grid-cols-[minmax(11rem,0.85fr)_minmax(0,1.35fr)_minmax(0,1.35fr)]',
      )}
      style={{ minHeight: '15.5rem' }}
    >
      <div className="min-h-[14rem] rounded border border-border/60 bg-card/20 md:min-h-[15.5rem] md:row-span-2 xl:row-span-1">
        <PositionsByStrikePane snapshot={snapshot} weight={weight} />
      </div>
      <div className="min-h-[14rem] rounded border border-border/60 bg-card/20 md:min-h-[15.5rem]">
        <GradientPane
          title="GAMMA"
          term="gex"
          blurb="net GEX · K × DTE"
          snapshot={snapshot}
          weight={weight}
          metric="gex"
          onExpiryPick={onExpiryPick}
        />
      </div>
      <div className="min-h-[14rem] rounded border border-border/60 bg-card/20 md:min-h-[15.5rem]">
        <GradientPane
          title="CHARM"
          term="charmExposure"
          blurb="$ Δ/day · K × DTE"
          snapshot={snapshot}
          weight={weight}
          metric="charm"
          onExpiryPick={onExpiryPick}
        />
      </div>
    </div>
  );

  return (
    <div className={cn('shrink-0 border-t border-border', className)}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 px-2 py-0.5 font-mono text-type-2xs text-muted-foreground">
        <span className="font-semibold text-foreground">3-PANE</span>
        <Explain term="dealerGradient">
          <span className="cursor-help underline decoration-dotted">γ · charm</span>
        </Explain>
        <span className="text-muted-foreground/80">VS3D B3 layout · K×DTE · OI-inferred · not TRACE tape</span>
      </div>
      <div className="px-1.5 pb-1.5">
        <ChartZoom
          title="Dealer 3-pane · OI · γ · charm"
          subtitle="K×DTE calendar · OI-inferred · not TRACE multi-day tape"
          bodyClassName="min-h-[15.5rem]"
          expandedHeightClass="h-[min(90vh,960px)]"
        >
          {panes}
        </ChartZoom>
      </div>
    </div>
  );
}
