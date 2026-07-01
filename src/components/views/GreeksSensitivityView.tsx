import { useMemo } from 'react';
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useTerminalStore } from '../../store/terminalStore';
import { Panel } from '../terminal/Panel';
import { spotSensitivity, ivSensitivity } from '../../lib/options/analytics';
import { GREEK_KEYS } from './greeksTypes';

const SCENARIO_COLORS = ['#f0883e', '#6b6b76', '#3fb950'];

export function GreeksSensitivityView() {
  const snapshot = useTerminalStore(s => s.snapshot);

  const spotChartData = useMemo(() => {
    if (!snapshot) return [];
    const s = spotSensitivity(snapshot) as unknown as Record<string, number[]>;
    return GREEK_KEYS.map(key => ({
      greek: key.charAt(0).toUpperCase() + key.slice(1),
      down: s[key]?.[0] ?? 0,
      base: s[key]?.[1] ?? 0,
      up: s[key]?.[2] ?? 0,
    }));
  }, [snapshot]);

  const ivChartData = useMemo(() => {
    if (!snapshot) return [];
    const s = ivSensitivity(snapshot) as unknown as Record<string, number[]>;
    return GREEK_KEYS.map(key => ({
      greek: key.charAt(0).toUpperCase() + key.slice(1),
      down: s[key]?.[0] ?? 0,
      base: s[key]?.[1] ?? 0,
      up: s[key]?.[2] ?? 0,
    }));
  }, [snapshot]);

  if (!snapshot) {
    return <div className="flex items-center justify-center h-full text-muted-foreground text-xs font-mono">No data</div>;
  }

  return (
    <div className="flex h-full gap-2">
      <Panel title="Spot Sensitivity" subtitle="Greeks under ±5% spot shift" className="flex-1">
        <div className="h-full p-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={spotChartData} margin={{ top: 8, right: 12, bottom: 18, left: 10 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="var(--grid)" />
              <XAxis dataKey="greek" tick={{ fontSize: 10, fill: 'var(--muted-foreground)', fontFamily: 'JetBrains Mono' }} stroke="var(--border)" />
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
              {(['down', 'base', 'up'] as const).map((k, i) => (
                <Bar key={k} dataKey={k} fill={SCENARIO_COLORS[i]!} radius={[2, 2, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel title="IV Sensitivity" subtitle="Greeks under ±20% IV shift" className="flex-1">
        <div className="h-full p-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ivChartData} margin={{ top: 8, right: 12, bottom: 18, left: 10 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="var(--grid)" />
              <XAxis dataKey="greek" tick={{ fontSize: 10, fill: 'var(--muted-foreground)', fontFamily: 'JetBrains Mono' }} stroke="var(--border)" />
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
              {(['down', 'base', 'up'] as const).map((k, i) => (
                <Bar key={k} dataKey={k} fill={SCENARIO_COLORS[i]!} radius={[2, 2, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>
    </div>
  );
}
