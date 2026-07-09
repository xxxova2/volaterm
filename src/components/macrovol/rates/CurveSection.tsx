import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { DataBadge } from '../DataBadge';
import { CollapsibleSection } from '../../terminal/CollapsibleSection';
import { chartTooltipStyle } from '../../../lib/chartTheme';

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
      className="order-8"
      title="US TREASURY YIELD CURVE"
      apis={['FRED', 'yfinance']}
      defaultOpen
      storageKey="rates.sec.curve"
      badge={
        <span className="text-type-xs text-muted-foreground">{curveLive}/{curve.length} tenors live</span>
      }
    >
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={curve}>
          <CartesianGrid stroke="#1f1f1f" strokeDasharray="2 2" />
          <ReferenceLine y={0} stroke="#1f1f1f" />
          <XAxis dataKey="label" tick={{ fill: '#71717a', fontSize: 10 }} />
          <YAxis tick={{ fill: '#71717a', fontSize: 10 }} tickFormatter={(v) => `${v}%`} domain={['auto', 'auto']} />
          <Tooltip
            contentStyle={chartTooltipStyle}
            formatter={(v: number) => [`${Number(v).toFixed(3)}%`, 'YIELD']}
          />
          <Line type="monotone" dataKey="yield" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: '#3b82f6' }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
      <DataBadge asOf={curveMeta.as_of} source={curveMeta.source || 'FRED'} note={curveMeta.note} />
    </CollapsibleSection>
  );
}
