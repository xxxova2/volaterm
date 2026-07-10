import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { DataBadge } from '../DataBadge';
import { CollapsibleSection } from '../../terminal/CollapsibleSection';
import { CHART, chartAxisTick, chartGridProps, chartTooltipStyle } from '../../../lib/chartTheme';

export function CurveSection({
  curve,
  curveMeta,
}: {
  curve: { label: string; yield: number | null }[];
  curveMeta: { as_of?: string; source?: string; note?: string };
}) {
  if (curve.length === 0) return null;

  const curveLive = curve.filter((c) => c.yield != null).length;

  return (
    <CollapsibleSection
      id="sec-curve"
      belowFold
      className="order-9"
      title="UST CURVE (table view)"
      apis={['FRED', 'yfinance']}
      defaultOpen={false}
      storageKey="rates.sec.curve"
      subtitle="Same FRED CMTs as hero curve — compact chart for jump-nav"
      badge={
        <span className="text-type-xs text-muted-foreground">{curveLive}/{curve.length} tenors live</span>
      }
    >
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={curve}>
          <CartesianGrid {...chartGridProps} />
          <ReferenceLine y={0} stroke={CHART.grid} />
          <XAxis dataKey="label" tick={chartAxisTick} />
          <YAxis tick={chartAxisTick} tickFormatter={(v) => `${v}%`} domain={['auto', 'auto']} />
          <Tooltip
            contentStyle={chartTooltipStyle}
            formatter={(v: number) => [`${Number(v).toFixed(3)}%`, 'YIELD']}
          />
          <Line type="monotone" dataKey="yield" stroke={CHART.series.info} strokeWidth={2} dot={{ r: 3, fill: CHART.series.info }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
      <DataBadge asOf={curveMeta.as_of} source={curveMeta.source || 'FRED'} note={curveMeta.note} />
    </CollapsibleSection>
  );
}
