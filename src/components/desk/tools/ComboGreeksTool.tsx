import { useMemo, useState } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTerminalStore } from '../../../store/terminalStore';
import {
  comboGreeksProfile,
  evaluateCombo,
  spotGrid,
  templateLegs,
  type PortfolioLeg,
} from '../../../lib/options/portfolio';
import { analyzeComboBreakEven } from '../../../lib/options/breakEven';
import { fmtCompact, fmtPrice, fmtSigned } from '../../../lib/format';
import { DeskToolShell } from '../DeskToolShell';
import { DeskSelect } from '../DeskField';
import { PrintStrip } from '../PrintStrip';
import { DeskChartFrame, deskChartChrome, deskAxisLabel } from '../DeskChart';
import { DESK_SERIES } from '../seriesGrammar';
import {
  CHART_GREEK,
  chartPriceTick,
  chartSignedTick,
  tightDomain,
} from '../../../lib/chartTheme';

type ComboTemplate = 'long_straddle' | 'short_straddle' | 'risk_reversal' | 'call_spread' | 'long_call';

export function ComboGreeksTool() {
  const snapshot = useTerminalStore((s) => s.snapshot)!;
  const [template, setTemplate] = useState<ComboTemplate>('short_straddle');
  const [expiryIdx, setExpiryIdx] = useState(0);

  const legs: PortfolioLeg[] = useMemo(
    () => templateLegs(template, snapshot, expiryIdx),
    [template, snapshot, expiryIdx],
  );
  const mark = useMemo(() => evaluateCombo(legs, snapshot), [legs, snapshot]);
  const profile = useMemo(() => {
    const spots = spotGrid(snapshot.spot, 0.15, 61);
    return comboGreeksProfile(legs, snapshot, spots);
  }, [legs, snapshot]);
  const be = useMemo(() => analyzeComboBreakEven(legs, snapshot.spot), [legs, snapshot]);

  const chrome = deskChartChrome();
  const pnlDomain = tightDomain(
    profile.map((r) => r.pnl),
    0.08,
    { includeZero: true },
  );
  const greekDomain = tightDomain(
    profile.flatMap((r) => [r.delta, r.vega, r.gamma]),
    0.08,
    { includeZero: true },
  );

  return (
    <DeskToolShell
      controls={
        <>
          <DeskSelect
            label="Template"
            value={template}
            onChange={setTemplate}
            options={[
              { value: 'short_straddle', label: 'Short straddle (MM)' },
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
            { label: 'Mark', value: fmtSigned(mark.mark) },
            {
              label: 'PnL',
              value: fmtSigned(mark.pnl),
              tone: mark.pnl >= 0 ? 'up' : 'down',
            },
            { label: 'Δ', value: fmtSigned(mark.greeks.delta, 3), title: 'delta' },
            { label: 'Γ', value: fmtCompact(mark.greeks.gamma), title: 'gamma' },
            { label: 'ν', value: fmtSigned(mark.greeks.vega, 2), title: 'vega' },
            { label: 'Θ', value: fmtSigned(mark.greeks.theta, 2), title: 'theta' },
            {
              label: 'BEs',
              value: be.breakEvens.map((x) => fmtPrice(x, 0)).join(' · ') || '—',
            },
          ]}
        />
      }
      bodyClassName="grid grid-cols-1 md:grid-cols-2 gap-1 min-h-0"
    >
      <DeskChartFrame xTitle="Spot" yTitle="PnL ($)" className="min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={profile} margin={chrome.margin}>
            <CartesianGrid {...chrome.grid} />
            <XAxis
              dataKey="spot"
              tick={chrome.tick}
              stroke={chrome.axisLine}
              tickFormatter={(v: number) => chartPriceTick(v)}
              label={deskAxisLabel('Spot')}
            />
            <YAxis
              tick={chrome.tick}
              stroke={chrome.axisLine}
              width={52}
              domain={pnlDomain}
              tickFormatter={(v: number) => chartSignedTick(v, 0)}
              label={deskAxisLabel('PnL ($)', 'insideLeft')}
            />
            <Tooltip contentStyle={chrome.tooltipStyle} />
            <ReferenceLine y={0} stroke={DESK_SERIES.zero} />
            <ReferenceLine x={snapshot.spot} stroke={DESK_SERIES.spot} strokeDasharray="3 3" />
            <Area
              type="monotone"
              dataKey="pnl"
              stroke={DESK_SERIES.combo}
              fill={DESK_SERIES.combo}
              fillOpacity={0.2}
              name="PnL"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </DeskChartFrame>

      <DeskChartFrame xTitle="Spot" yTitle="Greeks" className="min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={profile} margin={chrome.margin}>
            <CartesianGrid {...chrome.grid} />
            <XAxis
              dataKey="spot"
              tick={chrome.tick}
              stroke={chrome.axisLine}
              tickFormatter={(v: number) => chartPriceTick(v)}
              label={deskAxisLabel('Spot')}
            />
            <YAxis
              tick={chrome.tick}
              stroke={chrome.axisLine}
              width={52}
              domain={greekDomain}
              tickFormatter={(v: number) => chartSignedTick(v, 2)}
              label={deskAxisLabel('Greeks', 'insideLeft')}
            />
            <Tooltip contentStyle={chrome.tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'var(--font-mono), monospace' }} />
            <ReferenceLine x={snapshot.spot} stroke={DESK_SERIES.spot} strokeDasharray="3 3" />
            <Line
              type="monotone"
              dataKey="delta"
              stroke={CHART_GREEK.delta}
              strokeWidth={1.5}
              dot={false}
              name="Delta"
            />
            <Line
              type="monotone"
              dataKey="vega"
              stroke={CHART_GREEK.vega}
              strokeWidth={1.5}
              dot={false}
              name="Vega"
            />
            <Line
              type="monotone"
              dataKey="gamma"
              stroke={CHART_GREEK.gamma}
              strokeWidth={1}
              dot={false}
              name="Gamma"
            />
          </LineChart>
        </ResponsiveContainer>
      </DeskChartFrame>
    </DeskToolShell>
  );
}
