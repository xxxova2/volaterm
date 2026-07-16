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
import { defaultHedgeFromSnapshot, simulateDeltaHedge } from '../../../lib/options/hedging';
import { fmtSigned } from '../../../lib/format';
import { DeskToolShell } from '../DeskToolShell';
import { DeskField } from '../DeskField';
import { PrintStrip } from '../PrintStrip';
import { DeskChartFrame, deskChartChrome, deskAxisLabel } from '../DeskChart';
import { DESK_LEGEND, DESK_SERIES } from '../seriesGrammar';
import {
  CHART_GREEK,
  chartDayTick,
  chartSignedTick,
  tightDomain,
} from '../../../lib/chartTheme';

export function DFollowTool() {
  const snapshot = useTerminalStore((s) => s.snapshot)!;
  const defaults = useMemo(() => defaultHedgeFromSnapshot(snapshot), [snapshot]);
  const [band, setBand] = useState(0.05);
  const [qty, setQty] = useState(1);
  const [rv, setRv] = useState(defaults.realizedVol ?? 0.25);

  const result = useMemo(() => {
    if (!defaults.strike || !defaults.T || !defaults.vol) return null;
    return simulateDeltaHedge(
      {
        mode: 'tolerance',
        threshold: band,
        tolerance: band,
        periodSteps: 1,
        type: 'call',
        strike: defaults.strike,
        T: defaults.T,
        vol: defaults.vol,
        realizedVol: rv,
        drift: 0,
        days: defaults.days ?? 21,
        steps: 80,
        optionQty: qty,
        hedgeInstrument: 'future',
        r: snapshot.riskFreeRate,
        q: snapshot.dividendYield,
        seed: 33,
      },
      snapshot.spot,
    );
  }, [snapshot, defaults, band, qty, rv]);

  const chart =
    result?.steps.map((s) => ({
      t: s.tDay,
      pnl: s.totalPnl,
      netDelta: s.netDelta,
    })) ?? [];

  const chrome = deskChartChrome();
  const pnlDomain = tightDomain(
    chart.map((r) => r.pnl),
    0.08,
    { includeZero: true },
  );
  const deltaDomain = tightDomain(
    chart.map((r) => r.netDelta),
    0.08,
    { includeZero: true },
  );

  return (
    <DeskToolShell
      controls={
        <>
          <DeskField label="Band" value={band} onChange={setBand} step={0.01} />
          <DeskField label="Option qty" value={qty} onChange={setQty} step={1} />
          <DeskField label="Realized σ" value={rv} onChange={setRv} step={0.01} />
        </>
      }
      print={
        <PrintStrip
          items={
            result
              ? [
                  {
                    label: 'Terminal PnL',
                    value: fmtSigned(result.terminalPnl),
                    tone: result.terminalPnl >= 0 ? 'up' : 'down',
                  },
                  { label: 'Trades', value: String(result.tradeCount) },
                  {
                    label: 'Max DD',
                    value: fmtSigned(result.maxDrawdown),
                    tone: 'down',
                  },
                  { label: 'Avg |Δ|', value: result.avgAbsNetDelta.toFixed(3) },
                ]
              : [{ label: 'Terminal PnL', value: '—', tone: 'muted' }]
          }
        />
      }
    >
      <DeskChartFrame xTitle="Day" yTitle="PnL ($) · Net Δ" className="min-h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chart} margin={{ ...chrome.margin, right: 28 }}>
            <CartesianGrid {...chrome.grid} />
            <XAxis
              dataKey="t"
              tick={chrome.tick}
              stroke={chrome.axisLine}
              tickFormatter={(v: number) => chartDayTick(v)}
              label={deskAxisLabel('Day')}
            />
            <YAxis
              yAxisId="pnl"
              tick={chrome.tick}
              stroke={chrome.axisLine}
              width={52}
              domain={pnlDomain}
              tickFormatter={(v: number) => chartSignedTick(v, 0)}
              label={deskAxisLabel('PnL ($)', 'insideLeft')}
            />
            <YAxis
              yAxisId="d"
              orientation="right"
              tick={chrome.tick}
              stroke={chrome.axisLine}
              width={44}
              domain={deltaDomain}
              tickFormatter={(v: number) => chartSignedTick(v, 2)}
              label={deskAxisLabel('Net Δ', 'insideRight')}
            />
            <Tooltip contentStyle={chrome.tooltipStyle} />
            <ReferenceLine yAxisId="pnl" y={0} stroke={DESK_SERIES.zero} />
            <Area
              yAxisId="pnl"
              type="monotone"
              dataKey="pnl"
              stroke={DESK_SERIES.median}
              fill={DESK_SERIES.median}
              fillOpacity={0.15}
              name={DESK_LEGEND.pnl}
            />
            <Line
              yAxisId="d"
              type="monotone"
              dataKey="netDelta"
              stroke={CHART_GREEK.delta}
              strokeWidth={1.5}
              dot={false}
              name={DESK_LEGEND.netDelta}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </DeskChartFrame>
    </DeskToolShell>
  );
}
