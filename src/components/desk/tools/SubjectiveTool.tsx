import { useMemo, useState } from 'react';
import {
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
import { evaluateSubjective, subjectiveSummary } from '../../../lib/options/subjective';
import { fmtPrice, fmtSigned } from '../../../lib/format';
import { DeskToolShell } from '../DeskToolShell';
import { DeskField, DeskSelect } from '../DeskField';
import { PrintStrip } from '../PrintStrip';
import { DeskChartFrame, deskChartChrome, deskAxisLabel } from '../DeskChart';
import { DESK_LEGEND, DESK_SERIES } from '../seriesGrammar';
import { CHART, chartPriceTick, chartSignedTick, tightDomain } from '../../../lib/chartTheme';

export function SubjectiveTool() {
  const snapshot = useTerminalStore((s) => s.snapshot)!;
  const [expiryIdx, setExpiryIdx] = useState(0);
  const [drift, setDrift] = useState(0.05);
  const [vrp, setVrp] = useState(0.02);

  const rows = useMemo(
    () => evaluateSubjective(snapshot, expiryIdx, { drift, vrp }, 'both'),
    [snapshot, expiryIdx, drift, vrp],
  );
  const summary = useMemo(() => subjectiveSummary(rows), [rows]);
  const chart = useMemo(
    () =>
      rows
        .filter(
          (r) =>
            r.type === 'call' &&
            Math.abs(r.strike - snapshot.spot) / snapshot.spot < 0.15,
        )
        .map((r) => ({
          strike: r.strike,
          market: r.marketMid,
          fair: r.subjectivePrice,
          edge: r.edge,
        })),
    [rows, snapshot.spot],
  );

  const chrome = deskChartChrome();
  const yDomain = tightDomain(
    chart.flatMap((r) => [r.market, r.fair, r.edge]),
    0.08,
    { includeZero: true },
  );

  const bestLong = summary.bestLong
    ? `${summary.bestLong.type[0]!.toUpperCase()} ${fmtPrice(summary.bestLong.strike, 0)} (${fmtSigned(summary.bestLong.edge)})`
    : '—';

  return (
    <DeskToolShell
      controls={
        <>
          <DeskSelect
            label="Expiry"
            value={String(expiryIdx)}
            onChange={(v) => setExpiryIdx(+v)}
            options={snapshot.expiries.map((e, i) => ({
              value: String(i),
              label: `${e.expiry} (${e.dte}d)`,
            }))}
          />
          <DeskField label="μ" value={drift} onChange={setDrift} step={0.01} />
          <DeskField label="VRP" value={vrp} onChange={setVrp} step={0.005} />
        </>
      }
      print={
        <PrintStrip
          items={[
            {
              label: 'Avg edge',
              value: fmtSigned(summary.avgEdge),
              tone: summary.avgEdge >= 0 ? 'up' : 'down',
            },
            { label: 'Cheap', value: String(summary.cheapCount), tone: 'up' },
            { label: 'Rich', value: String(summary.richCount), tone: 'down' },
            { label: 'Best long', value: bestLong },
          ]}
        />
      }
    >
      <DeskChartFrame xTitle="Strike" yTitle="Price ($)" className="min-h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chart} margin={chrome.margin}>
            <CartesianGrid {...chrome.grid} />
            <XAxis
              dataKey="strike"
              tick={chrome.tick}
              stroke={chrome.axisLine}
              tickFormatter={(v: number) => chartPriceTick(v)}
              label={deskAxisLabel('Strike')}
            />
            <YAxis
              tick={chrome.tick}
              stroke={chrome.axisLine}
              width={52}
              domain={yDomain}
              tickFormatter={(v: number) => chartSignedTick(v, 2)}
              label={deskAxisLabel('Price ($)', 'insideLeft')}
            />
            <Tooltip contentStyle={chrome.tooltipStyle} />
            <ReferenceLine
              x={snapshot.spot}
              stroke={DESK_SERIES.spot}
              strokeDasharray="3 3"
            />
            <Line
              type="monotone"
              dataKey="market"
              stroke={CHART.series.muted}
              strokeWidth={1.5}
              dot={false}
              name={DESK_LEGEND.market}
            />
            <Line
              type="monotone"
              dataKey="fair"
              stroke={CHART.series.brand}
              strokeWidth={2}
              dot={false}
              name={DESK_LEGEND.fair}
            />
            <Line
              type="monotone"
              dataKey="edge"
              stroke={CHART.series.info}
              strokeWidth={1}
              strokeDasharray="2 2"
              dot={false}
              name={DESK_LEGEND.edge}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </DeskChartFrame>
    </DeskToolShell>
  );
}
