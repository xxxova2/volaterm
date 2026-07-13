import { useMemo } from 'react';
import {
  AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { chartTooltipStyle, chartGridProps, CHART } from '../../lib/chartTheme';
import { useTerminalStore } from '../../store/terminalStore';
import { Panel } from '../terminal/Panel';
import { fmtPct, fmtSignedPct } from '../../lib/format';
import { DiagnosticsStrip } from './DiagnosticsStrip';
import { Explain } from '../common/Explain';
import { realizedVolCloseToClose, volRiskPremium } from '../../lib/options/analytics';

function Stat({ label, value, color, sub, term }: { label: string; value: string; color?: string; sub?: string; term?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-type-xs text-muted-foreground font-mono">{term ? <Explain term={term}>{label}</Explain> : label}</span>
      <span className="text-sm font-semibold font-mono tabular-nums" style={{ color: color ?? 'var(--foreground)' }}>{value}</span>
      {sub && <span className="text-type-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

export function TermView() {
  const snapshot = useTerminalStore(s => s.snapshot);
  const sviReadout = useTerminalStore(s => s.sviReadout);
  const arbResult = useTerminalStore(s => s.arbResult);
  const fmpHistory = useTerminalStore(s => s.fmpHistory);

  const rv = useMemo(() => {
    if (!fmpHistory?.length) return null;
    return realizedVolCloseToClose(fmpHistory.map((b) => b.close));
  }, [fmpHistory]);

  const chartData = useMemo(() => {
    if (!snapshot) return [];
    const hvPct = rv != null ? rv * 100 : null;
    return snapshot.expiries.map(s => ({
      dte: s.dte,
      dteSqrt: Math.sqrt(s.dte),
      label: `${s.dte}d`,
      atmIV: s.atmIV * 100,
      /** Flat HV line from close-to-close realized (same sample for all DTEs) */
      hv: hvPct,
      expiry: s.expiry,
    }));
  }, [snapshot, rv]);

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

  const rr30 = (() => {
    const calls = mid.calls.filter(c => c.delta != null && c.iv != null);
    const puts = mid.puts.filter(p => p.delta != null && p.iv != null);
    if (!calls.length || !puts.length) return null;
    const c25 = calls.reduce((b, q) => Math.abs((q.delta ?? 0) - 0.25) < Math.abs((b.delta ?? 0) - 0.25) ? q : b, calls[0]!);
    const p25 = puts.reduce((b, q) => Math.abs((q.delta ?? 0) + 0.25) < Math.abs((b.delta ?? 0) + 0.25) ? q : b, puts[0]!);
    if (c25.iv == null || p25.iv == null) return null;
    return p25.iv - c25.iv;
  })();

  const midAtm = mid.atmIV;
  const vrp = volRiskPremium(midAtm, rv);

  return (
    <Panel title="Term Structure" className="h-full">
      <div className="flex flex-col h-full">
        <div className="flex flex-wrap gap-4 px-3 py-2 border-b border-border">
          <Stat label="Front ATM IV" term="atmIV" value={fmtPct(frontIV)} color="var(--cyan)" />
          <Stat label="Term Slope" term="termStructure" value={`${(termSlope * 100).toFixed(2)}%`} color={isContango ? 'var(--up)' : 'var(--down)'} sub={isContango ? 'Contango' : 'Backwardation'} />
          <Stat label="Back ATM IV" term="atmIV" value={fmtPct(backIV)} sub={`${back.dte}d`} />
          <Stat label="Fwd vol" term="termStructure" value={fwdVol != null ? fmtPct(fwdVol) : '—'} sub="front→back" />
          <Stat label="~30d 25Δ RR" term="skew" value={rr30 != null ? `${(rr30 * 100).toFixed(2)}%` : '—'} sub="put−call" />
          <Stat
            label="HV (c2c)"
            value={rv != null ? fmtPct(rv) : '—'}
            sub={fmpHistory?.length ? `${fmpHistory.length} bars` : 'need history'}
            color="var(--amber)"
          />
          <Stat
            label="VRP"
            value={vrp != null ? fmtSignedPct(vrp) : '—'}
            sub="~30d IV−HV"
            color={vrp != null && vrp > 0 ? 'var(--down)' : 'var(--up)'}
          />
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
                formatter={(value: number, name: string) => [
                  `${Number(value).toFixed(2)}%`,
                  name === 'hv' ? 'HV (realized)' : 'ATM IV',
                ]}
                labelFormatter={(_label: string, payload: readonly { payload?: { label?: string } }[] | undefined) => {
                  const row = payload?.[0]?.payload;
                  return row?.label ?? '';
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 10, fontFamily: 'JetBrains Mono' }}
                formatter={(v) => (v === 'hv' ? 'HV (c2c)' : 'ATM IV')}
              />
              <defs>
                <linearGradient id="ivGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="atmIV" name="atmIV" stroke="var(--primary)" strokeWidth={2} fill="url(#ivGrad)" />
              {rv != null && (
                <Line
                  type="monotone"
                  dataKey="hv"
                  name="hv"
                  stroke={CHART.series.amber}
                  strokeWidth={1.5}
                  strokeDasharray="5 3"
                  dot={false}
                  isAnimationActive={false}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Panel>
  );
}
