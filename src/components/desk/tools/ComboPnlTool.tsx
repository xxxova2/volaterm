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
import { comboGreeksPnl } from '../../../lib/options/greeksPnl';
import { fmtSigned } from '../../../lib/format';
import { useSpotPath } from '../useSpotPath';
import { DeskToolShell } from '../DeskToolShell';
import { DeskSelect } from '../DeskField';
import { PrintStrip } from '../PrintStrip';
import { DeskChartFrame, deskChartChrome, deskAxisLabel } from '../DeskChart';
import { DESK_SERIES } from '../seriesGrammar';
import { CHART_GREEK, chartSignedTick, tightDomain } from '../../../lib/chartTheme';

type ComboTemplate =
  | 'short_straddle'
  | 'long_straddle'
  | 'risk_reversal'
  | 'call_spread'
  | 'long_call';

export function ComboPnlTool() {
  const snapshot = useTerminalStore((s) => s.snapshot)!;
  const { path, source: pathSrc } = useSpotPath(45);
  const [template, setTemplate] = useState<ComboTemplate>('short_straddle');
  const [expiryIdx, setExpiryIdx] = useState(0);

  const legs = useMemo(
    () => templateLegs(template, snapshot, expiryIdx),
    [template, snapshot, expiryIdx],
  );
  const series = useMemo(() => comboGreeksPnl(legs, snapshot, path), [legs, snapshot, path]);

  const chart = series.bars.map((b) => ({
    t: b.dateLabel,
    pnl: b.pnl,
    delta: b.cumDelta,
    gamma: b.cumGamma,
    theta: b.cumTheta,
    residual: b.cumResidual,
  }));

  const chrome = deskChartChrome();
  const yDomain = tightDomain(
    chart.flatMap((r) => [r.pnl, r.delta, r.gamma, r.theta, r.residual]),
    0.08,
    { includeZero: true },
  );

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
              { value: 'risk_reversal', label: 'Risk reversal' },
              { value: 'call_spread', label: 'Call spread' },
              { value: 'long_call', label: 'Long call' },
            ]}
          />
          <DeskSelect
            label="Expiry"
            value={String(expiryIdx)}
            onChange={(v) => setExpiryIdx(+v)}
            options={snapshot.expiries.map((e, i) => ({
              value: String(i),
              label: `${e.expiry} (${e.dte}d)`,
            }))}
          />
        </>
      }
      print={
        <PrintStrip
          items={[
            {
              label: 'Term PnL',
              value: fmtSigned(series.terminalPnl),
              tone: series.terminalPnl >= 0 ? 'up' : 'down',
            },
            { label: 'Σ Δ', value: fmtSigned(series.totalDelta) },
            { label: 'Σ Γ', value: fmtSigned(series.totalGamma) },
            { label: 'Σ Θ', value: fmtSigned(series.totalTheta) },
            { label: 'Residual', value: fmtSigned(series.totalResidual) },
            { label: 'Path', value: pathSrc, tone: 'muted' },
            { label: 'Marks', value: 'BS sticky-IV', tone: 'muted' },
          ]}
        />
      }
    >
      <DeskChartFrame xTitle="Date" yTitle="PnL ($)" className="min-h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chart} margin={chrome.margin}>
            <CartesianGrid {...chrome.grid} />
            <XAxis
              dataKey="t"
              tick={chrome.tick}
              stroke={chrome.axisLine}
              interval="preserveStartEnd"
              label={deskAxisLabel('Date')}
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
            <Area
              type="monotone"
              dataKey="pnl"
              stroke={DESK_SERIES.historyLive}
              fill={DESK_SERIES.historyLive}
              fillOpacity={0.12}
              name="Mark PnL"
            />
            <Line
              type="monotone"
              dataKey="delta"
              stroke={CHART_GREEK.delta}
              strokeWidth={1}
              dot={false}
              name="ΣΔ"
            />
            <Line
              type="monotone"
              dataKey="gamma"
              stroke={CHART_GREEK.gamma}
              strokeWidth={1}
              dot={false}
              name="ΣΓ"
            />
            <Line
              type="monotone"
              dataKey="theta"
              stroke={CHART_GREEK.theta}
              strokeWidth={1}
              dot={false}
              name="ΣΘ"
            />
            <Line
              type="monotone"
              dataKey="residual"
              stroke={DESK_SERIES.zero}
              strokeWidth={1}
              strokeDasharray="2 2"
              dot={false}
              name="Residual"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </DeskChartFrame>
    </DeskToolShell>
  );
}
