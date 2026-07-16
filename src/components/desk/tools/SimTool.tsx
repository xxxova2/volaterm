import { useMemo, useState } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTerminalStore } from '../../../store/terminalStore';
import { templateLegs } from '../../../lib/options/portfolio';
import { simulatePaths } from '../../../lib/options/pathSim';
import { fmtPct, fmtSigned } from '../../../lib/format';
import { DeskToolShell } from '../DeskToolShell';
import { DeskField, DeskSelect } from '../DeskField';
import { PrintStrip } from '../PrintStrip';
import { DeskChartFrame, deskChartChrome, deskAxisLabel } from '../DeskChart';
import { DESK_SERIES } from '../seriesGrammar';
import { chartDayTick, chartSignedTick, tightDomain } from '../../../lib/chartTheme';

export function SimTool() {
  const snapshot = useTerminalStore((s) => s.snapshot)!;
  const [drift, setDrift] = useState(0);
  const [vol, setVol] = useState(snapshot.expiries[0]?.atmIV ?? 0.25);
  const [days, setDays] = useState(21);
  const [template, setTemplate] = useState<'short_straddle' | 'long_straddle' | 'long_call'>('short_straddle');

  const legs = useMemo(() => templateLegs(template, snapshot, 0), [template, snapshot]);
  const sim = useMemo(
    () => simulatePaths(legs, snapshot, { drift, vol, days, steps: 40, paths: 200, seed: 99 }),
    [legs, snapshot, drift, vol, days],
  );

  const chart = sim.t.map((t, i) => ({
    t,
    p5: sim.pnlBands.p5[i],
    p25: sim.pnlBands.p25[i],
    p50: sim.pnlBands.p50[i],
    p75: sim.pnlBands.p75[i],
    p95: sim.pnlBands.p95[i],
  }));

  const chrome = deskChartChrome();
  const yDomain = tightDomain(
    chart.flatMap((r) => [r.p5, r.p95]),
    0.08,
    { includeZero: true },
  );
  const last = chart.length - 1;

  return (
    <DeskToolShell
      controls={
        <>
          <DeskSelect
            label="Structure"
            value={template}
            onChange={setTemplate}
            options={[
              { value: 'short_straddle', label: 'Short straddle' },
              { value: 'long_straddle', label: 'Long straddle' },
              { value: 'long_call', label: 'Long call' },
            ]}
          />
          <DeskField label="Drift μ" value={drift} onChange={setDrift} step={0.01} />
          <DeskField label="Realized σ" value={vol} onChange={setVol} step={0.01} />
          <DeskField label="Horizon d" value={days} onChange={setDays} step={1} min={1} />
        </>
      }
      print={
        <PrintStrip
          items={[
            {
              label: 'E[PnL]',
              value: fmtSigned(sim.meanTerminalPnl),
              tone: sim.meanTerminalPnl >= 0 ? 'up' : 'down',
            },
            { label: 'Win', value: fmtPct(sim.winRate) },
            {
              label: 'p5 term',
              value: fmtSigned(sim.pnlBands.p5[last] ?? 0),
              tone: 'down',
            },
            {
              label: 'p95 term',
              value: fmtSigned(sim.pnlBands.p95[last] ?? 0),
              tone: 'up',
            },
          ]}
        />
      }
    >
      <DeskChartFrame xTitle="Horizon (days)" yTitle="PnL ($)" className="min-h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chart} margin={chrome.margin}>
            <CartesianGrid {...chrome.grid} />
            <XAxis
              dataKey="t"
              tick={chrome.tick}
              stroke={chrome.axisLine}
              tickFormatter={(v: number) => chartDayTick(v)}
              label={deskAxisLabel('Days')}
            />
            <YAxis
              tick={chrome.tick}
              stroke={chrome.axisLine}
              width={52}
              domain={yDomain}
              tickFormatter={(v: number) => chartSignedTick(v, 0)}
              label={deskAxisLabel('PnL ($)', 'insideLeft')}
            />
            <Tooltip contentStyle={chrome.tooltipStyle} />
            <ReferenceLine y={0} stroke={DESK_SERIES.zero} />
            <Area type="monotone" dataKey="p95" stroke="none" fill={DESK_SERIES.bandOuter} fillOpacity={0.12} />
            <Area type="monotone" dataKey="p5" stroke="none" fill="#000" fillOpacity={1} />
            <Area type="monotone" dataKey="p75" stroke="none" fill={DESK_SERIES.bandInner} fillOpacity={0.18} />
            <Area type="monotone" dataKey="p25" stroke="none" fill="#000" fillOpacity={1} />
            <Line type="monotone" dataKey="p50" stroke={DESK_SERIES.median} strokeWidth={2} dot={false} name="p50" />
          </ComposedChart>
        </ResponsiveContainer>
      </DeskChartFrame>
    </DeskToolShell>
  );
}
