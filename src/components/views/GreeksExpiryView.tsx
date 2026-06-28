import { useMemo } from 'react';
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useTerminalStore } from '../../store/terminalStore';
import { Panel } from '../terminal/Panel';
import { netByExpiry, impliedMove } from '../../lib/options/analytics';
import { fmtPrice, fmtPct } from '../../lib/format';

export function GreeksExpiryView() {
  const snapshot = useTerminalStore(s => s.snapshot);

  const chartData = useMemo(() => {
    if (!snapshot) return [];
    return netByExpiry(snapshot).map(n => ({
      label: `${n.dte}d`,
      delta: n.delta,
      gamma: n.gamma,
      vega: n.vega,
    }));
  }, [snapshot]);

  const move = useMemo(() => {
    if (!snapshot) return null;
    return impliedMove(snapshot);
  }, [snapshot]);

  if (!snapshot) {
    return <div className="flex items-center justify-center h-full text-muted-foreground text-xs font-mono">No data</div>;
  }

  return (
    <div className="flex flex-col h-full gap-2">
      <Panel title="Net Greeks by Expiry" subtitle="aggregate across all strikes" className="flex-1">
        <div className="h-full p-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 12, bottom: 18, left: 10 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="var(--grid)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--muted-foreground)', fontFamily: 'JetBrains Mono' }} stroke="var(--border)" />
              <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)', fontFamily: 'JetBrains Mono' }} stroke="var(--border)" width={60} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded border border-border bg-popover/95 p-2 font-mono text-[10px] shadow backdrop-blur">
                      <div className="mb-1 font-semibold text-foreground">{label}</div>
                      {payload.map(p => (
                        <div key={p.name} className="flex items-center justify-between gap-3">
                          <span style={{ color: p.color }}>{p.name}</span>
                          <span className="tabular-nums text-foreground">{typeof p.value === 'number' ? p.value.toFixed(4) : p.value}</span>
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
              <Bar dataKey="delta" fill="#4d8ff0" radius={[2, 2, 0, 0]} />
              <Bar dataKey="gamma" fill="#3fb950" radius={[2, 2, 0, 0]} />
              <Bar dataKey="vega" fill="#a06ee0" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <div className="grid grid-cols-4 gap-2">
        <Stat label="Expected Move" value={move ? fmtPrice(move.move) : '—'} color="var(--amber)" />
        <Stat label="Move %" value={move ? fmtPct(move.movePct) : '—'} color="var(--amber)" />
        <Stat label="Prob of Touch" value={move ? fmtPct(move.probTouch) : '—'} color="#4d8ff0" />
        <Stat label="ATM Straddle" value={move ? fmtPrice(move.straddle) : '—'} color="#3fb950" />
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded border border-border bg-card px-3 py-2">
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-lg font-semibold font-mono tabular-nums" style={{ color: color ?? 'var(--foreground)' }}>{value}</div>
    </div>
  );
}
