import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { useTerminalStore } from '../../store/terminalStore';
import { Panel } from '../terminal/Panel';
import { fmtCompact, fmtPrice } from '../../lib/format';
import { gammaExposure } from '../../lib/options/analytics';
import { Explain } from '../common/Explain';

function Stat({ label, value, color, term }: { label: string; value: string; color?: string; term?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] text-muted-foreground font-mono">{term ? <Explain term={term}>{label}</Explain> : label}</span>
      <span className="text-sm font-semibold font-mono tabular-nums" style={{ color: color ?? 'var(--foreground)' }}>{value}</span>
    </div>
  );
}

export function GexView() {
  const snapshot = useTerminalStore(s => s.snapshot);

  const gex = useMemo(() => {
    if (!snapshot) return null;
    return gammaExposure(snapshot);
  }, [snapshot]);

  if (!gex || gex.points.length === 0) {
    return (
      <Panel title="Gamma Exposure" className="h-full">
        <div className="flex items-center justify-center h-full text-muted-foreground text-xs font-mono">No data</div>
      </Panel>
    );
  }

  const chartData = gex.points.map(p => ({
    strike: p.strike,
    callGEX: p.callGEX / 1e6,
    putGEX: -p.putGEX / 1e6,
    netGEX: p.netGEX / 1e6,
    label: fmtPrice(p.strike, 0),
  }));

  const spot = snapshot?.spot ?? 0;

  return (
    <Panel title="Gamma Exposure" subtitle="Dealer positioning per $1B move" className="h-full">
      <div className="flex flex-col h-full">
        <div className="flex gap-3 px-3 py-2 border-b border-border">
          <Stat label="Total GEX" term="gex" value={fmtCompact(gex.totalGEX)} color={gex.totalGEX > 0 ? 'var(--up)' : 'var(--down)'} />
          <Stat label="Gamma Flip" term="gammaFlip" value={gex.gammaFlip ? fmtPrice(gex.gammaFlip, 0) : 'N/A'} color="var(--amber)" />
          <Stat label="Spot" term="spot" value={fmtPrice(spot)} />
        </div>
        <div className="flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9, fill: 'var(--muted-foreground)', fontFamily: 'JetBrains Mono' }}
                tickLine={false}
                interval={Math.max(1, Math.floor(chartData.length / 15))}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)', fontFamily: 'JetBrains Mono' }}
                tickLine={false}
                tickFormatter={(v: number) => `${v.toFixed(0)}M`}
              />
              <Tooltip
                contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 11, fontFamily: 'JetBrains Mono' }}
                labelStyle={{ color: 'var(--foreground)' }}
              />
              <ReferenceLine x={fmtPrice(spot, 0)} stroke="var(--amber)" strokeDasharray="4 4" label={{ value: 'Spot', position: 'top', fill: 'var(--amber)', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
              {gex.gammaFlip && (
                <ReferenceLine x={fmtPrice(gex.gammaFlip, 0)} stroke="var(--down)" strokeDasharray="3 3" label={{ value: 'Flip', position: 'top', fill: 'var(--down)', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
              )}
              <Bar dataKey="callGEX" fill="var(--up)" stackId="gex" opacity={0.8} />
              <Bar dataKey="putGEX" fill="var(--down)" stackId="gex" opacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="px-3 py-1 text-[10px] text-muted-foreground font-mono border-t border-border">
          Positive GEX = dealer short gamma (amplifies moves). Negative GEX = dealer long gamma (dampens moves).
        </div>
      </div>
    </Panel>
  );
}
