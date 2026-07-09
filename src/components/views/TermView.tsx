import { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { chartTooltipStyle, chartGridProps } from '../../lib/chartTheme';
import { useTerminalStore } from '../../store/terminalStore';
import { Panel } from '../terminal/Panel';
import { fmtPct } from '../../lib/format';
import { DiagnosticsStrip } from './DiagnosticsStrip';
import { Explain } from '../common/Explain';

function Stat({ label, value, color, sub, term }: { label: string; value: string; color?: string; sub?: string; term?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] text-muted-foreground font-mono">{term ? <Explain term={term}>{label}</Explain> : label}</span>
      <span className="text-sm font-semibold font-mono tabular-nums" style={{ color: color ?? 'var(--foreground)' }}>{value}</span>
      {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
    </div>
  );
}

export function TermView() {
  const snapshot = useTerminalStore(s => s.snapshot);
  const sviReadout = useTerminalStore(s => s.sviReadout);
  const arbResult = useTerminalStore(s => s.arbResult);

  const chartData = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.expiries.map(s => ({
      dte: s.dte,
      dteSqrt: Math.sqrt(s.dte),
      label: `${s.dte}d`,
      atmIV: s.atmIV * 100,
      expiry: s.expiry,
    }));
  }, [snapshot]);

  if (!snapshot || snapshot.expiries.length === 0) {
    return (
      <Panel title="Term Structure" className="h-full">
        <div className="flex items-center justify-center h-full text-muted-foreground text-xs font-mono">No data</div>
      </Panel>
    );
  }

  const frontIV = snapshot.expiries[0]!.atmIV;
  const backIV = snapshot.expiries[snapshot.expiries.length - 1]!.atmIV;
  const termSlope = backIV - frontIV;
  const isContango = termSlope > 0;

  // Forward vol (simple): σ_fwd² = (w_back − w_front) / (T_back − T_front)
  const front = snapshot.expiries[0]!;
  const mid = snapshot.expiries.find(e => e.dte >= 30) ?? front;
  const back = snapshot.expiries[snapshot.expiries.length - 1]!;
  const Tf = front.dte / 365;
  const Tb = back.dte / 365;
  let fwdVol: number | null = null;
  if (Tb > Tf + 1e-9) {
    const wf = front.atmIV * front.atmIV * Tf;
    const wb = back.atmIV * back.atmIV * Tb;
    const fv2 = (wb - wf) / (Tb - Tf);
    fwdVol = fv2 > 0 ? Math.sqrt(fv2) : null;
  }

  // 25Δ RR on nearest ~30d slice
  const rr30 = (() => {
    const calls = mid.calls.filter(c => c.delta != null && c.iv != null);
    const puts = mid.puts.filter(p => p.delta != null && p.iv != null);
    if (!calls.length || !puts.length) return null;
    const c25 = calls.reduce((b, q) => Math.abs((q.delta ?? 0) - 0.25) < Math.abs((b.delta ?? 0) - 0.25) ? q : b, calls[0]!);
    const p25 = puts.reduce((b, q) => Math.abs((q.delta ?? 0) + 0.25) < Math.abs((b.delta ?? 0) + 0.25) ? q : b, puts[0]!);
    if (c25.iv == null || p25.iv == null) return null;
    return p25.iv - c25.iv;
  })();

  return (
    <Panel title="Term Structure" className="h-full">
      <div className="flex flex-col h-full">
        <div className="flex flex-wrap gap-4 px-3 py-2 border-b border-border">
          <Stat label="Front ATM IV" term="atmIV" value={fmtPct(frontIV)} color="var(--cyan)" />
          <Stat label="Term Slope" term="termStructure" value={`${(termSlope * 100).toFixed(2)}%`} color={isContango ? 'var(--up)' : 'var(--down)'} sub={isContango ? 'Contango' : 'Backwardation'} />
          <Stat label="Back ATM IV" term="atmIV" value={fmtPct(backIV)} sub={`${back.dte}d`} />
          <Stat label="Fwd vol" term="termStructure" value={fwdVol != null ? fmtPct(fwdVol) : '—'} sub="front→back" />
          <Stat label="~30d 25Δ RR" term="skew" value={rr30 != null ? `${(rr30 * 100).toFixed(2)}%` : '—'} sub="put−call" />
          <Stat label="Expiries" term="termStructure" value={String(snapshot.expiries.length)} sub={`${front.dte}–${back.dte}d`} />
        </div>
        <DiagnosticsStrip sviReadout={sviReadout} arbResult={arbResult} data-testid="term-diagnostics" />
        <div className="flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
              <CartesianGrid {...chartGridProps} />
              <XAxis
                dataKey="dteSqrt"
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)', fontFamily: 'JetBrains Mono' }}
                tickLine={false}
                tickFormatter={(v: number) => `${(v * v).toFixed(0)}d`}
                label={{ value: 'DTE (sqrt scale)', position: 'bottom', fontSize: 10, fill: 'var(--muted-foreground)' }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)', fontFamily: 'JetBrains Mono' }}
                tickLine={false}
                tickFormatter={(v: number) => `${v.toFixed(1)}%`}
                domain={['auto', 'auto']}
              />
              <Tooltip
                contentStyle={chartTooltipStyle}
                labelStyle={{ color: 'var(--foreground)' }}
                formatter={(value: number) => [`${value.toFixed(2)}%`, 'ATM IV']}
                labelFormatter={(label: string) => `${label}`}
              />
              <defs>
                <linearGradient id="ivGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="atmIV" stroke="var(--primary)" strokeWidth={2} fill="url(#ivGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Panel>
  );
}
