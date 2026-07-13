import { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useTerminalStore } from '../../store/terminalStore';
import { Panel } from '../terminal/Panel';
import { greeksProfile, type ProfileGreekKey } from '../../lib/options/analytics';
import { fmtPrice } from '../../lib/format';
import { CHART, CHART_GREEK, CHART_GREEK_EXT, chartAxisTick, chartGridProps } from '../../lib/chartTheme';

type GreekKey = ProfileGreekKey;

const GREEKS: { key: GreekKey; label: string }[] = [
  { key: 'delta', label: 'Delta' },
  { key: 'gamma', label: 'Gamma' },
  { key: 'theta', label: 'Theta' },
  { key: 'vega', label: 'Vega' },
  { key: 'vanna', label: 'Vanna' },
  { key: 'charm', label: 'Charm' },
];

const COLORS: Record<GreekKey, string> = {
  delta: CHART_GREEK.delta,
  gamma: CHART_GREEK.gamma,
  theta: CHART_GREEK.theta,
  vega: CHART_GREEK.vega,
  vanna: CHART_GREEK_EXT.vanna,
  charm: CHART_GREEK_EXT.charm,
};

export function GreeksProfileView() {
  const snapshot = useTerminalStore(s => s.snapshot);
  const [greek, setGreek] = useState<GreekKey>('gamma');
  const [expiryIdx, setExpiryIdx] = useState<number>(0);

  const profile = useMemo(() => {
    if (!snapshot) return { strikes: [], values: [] };
    const idx = expiryIdx >= 0 && expiryIdx < snapshot.expiries.length ? expiryIdx : 0;
    return greeksProfile(snapshot, idx, greek);
  }, [snapshot, expiryIdx, greek]);

  const data = useMemo(() => {
    return profile.strikes.map((s, i) => ({
      strike: s,
      value: profile.values[i] ?? 0,
    }));
  }, [profile]);

  if (!snapshot) {
    return <Panel title="Greeks Profile" className="h-full"><div className="flex items-center justify-center h-full text-muted-foreground text-xs font-mono">No data</div></Panel>;
  }

  return (
    <Panel
      title="Greeks Profile"
      subtitle={snapshot.expiries[expiryIdx] ? `${snapshot.expiries[expiryIdx]!.dte}d` : undefined}
      className="h-full"
      actions={
        <div className="flex items-center gap-2">
          {GREEKS.map(g => (
            <button
              key={g.key}
              onClick={() => setGreek(g.key)}
              className={`px-2 py-0.5 text-type-xs font-mono rounded transition-colors ${
                greek === g.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {g.label}
            </button>
          ))}
          <select
            value={expiryIdx}
            onChange={e => setExpiryIdx(Number(e.target.value))}
            className="rounded border border-border bg-background px-2 py-0.5 text-type-xs font-mono text-foreground"
          >
            {snapshot.expiries.map((e, i) => (
              <option key={e.dte} value={i}>{e.dte}d</option>
            ))}
          </select>
        </div>
      }
    >
      <div className="h-full p-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 18, left: 10 }}>
            <CartesianGrid {...chartGridProps} />
            <XAxis
              dataKey="strike"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={v => fmtPrice(v, 0)}
              tick={chartAxisTick}
              stroke={CHART.axisLine}
            />
            <YAxis
              tick={chartAxisTick}
              stroke={CHART.axisLine}
              width={60}
            />
            <ReferenceLine x={snapshot.spot} stroke={CHART.series.amber} strokeDasharray="3 3" strokeOpacity={0.6} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]!.payload as { strike: number; value: number };
                return (
                  <div className="rounded border border-border bg-popover/95 p-2 font-mono text-type-xs shadow backdrop-blur">
                    <div className="mb-1 text-muted-foreground">K {fmtPrice(d.strike, 0)}</div>
                    <div className="text-foreground">{d.value.toFixed(4)}</div>
                  </div>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={COLORS[greek]}
              strokeWidth={2}
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}
