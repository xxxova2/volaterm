import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
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
import { evaluateCombo, templateLegs } from '../../../lib/options/portfolio';
import { analyzeComboBreakEven } from '../../../lib/options/breakEven';
import { comboGreeksPnl, straddleBreakEvens } from '../../../lib/options/greeksPnl';
import { fmtPrice, fmtSigned } from '../../../lib/format';
import { useSpotPath } from '../useSpotPath';
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

export function StraddleTool() {
  const snapshot = useTerminalStore((s) => s.snapshot)!;
  const { path, source: pathSrc } = useSpotPath(45);
  const [expiryIdx, setExpiryIdx] = useState(0);
  const [mode, setMode] = useState<'breakeven' | 'pnl'>('breakeven');
  const [side, setSide] = useState<'long' | 'short'>('long');

  const legs = useMemo(
    () => templateLegs(side === 'long' ? 'long_straddle' : 'short_straddle', snapshot, expiryIdx),
    [side, snapshot, expiryIdx],
  );
  const mark = useMemo(() => evaluateCombo(legs, snapshot), [legs, snapshot]);
  const be = useMemo(() => analyzeComboBreakEven(legs, snapshot.spot), [legs, snapshot]);

  const strike = legs[0]?.strike ?? snapshot.spot;
  const callMid = legs.find((l) => l.kind === 'call')?.entryPrice ?? 0;
  const putMid = legs.find((l) => l.kind === 'put')?.entryPrice ?? 0;
  const strBe = straddleBreakEvens(strike, callMid, putMid, side);

  const series = useMemo(() => comboGreeksPnl(legs, snapshot, path), [legs, snapshot, path]);
  const pnlChart = series.bars.map((b) => ({
    t: b.dateLabel,
    pnl: b.pnl,
    delta: b.cumDelta,
    theta: b.cumTheta,
  }));
  const payoffChart = be.payoffCurve.map((p) => ({ spot: p.spot, pnl: p.pnl }));

  const chrome = deskChartChrome();
  const beDomain = tightDomain(
    payoffChart.map((r) => r.pnl),
    0.08,
    { includeZero: true },
  );
  const pnlDomain = tightDomain(
    pnlChart.flatMap((r) => [r.pnl, r.delta, r.theta]),
    0.08,
    { includeZero: true },
  );

  return (
    <DeskToolShell
      controls={
        <>
          <DeskSelect
            label="Mode"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'breakeven', label: 'Break-even' },
              { value: 'pnl', label: 'Historical PnL' },
            ]}
          />
          <DeskSelect
            label="Side"
            value={side}
            onChange={setSide}
            options={[
              { value: 'long', label: 'Long straddle' },
              { value: 'short', label: 'Short straddle' },
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
            { label: 'K', value: fmtPrice(strike, strike > 1000 ? 0 : 2) },
            { label: 'Premium', value: fmtPrice(strBe.totalPremium) },
            {
              label: 'BE lo',
              value: fmtPrice(strBe.lower, strBe.lower > 1000 ? 0 : 2),
            },
            {
              label: 'BE hi',
              value: fmtPrice(strBe.upper, strBe.upper > 1000 ? 0 : 2),
            },
            {
              label: 'Mark Δ',
              value: fmtSigned(mark.greeks.delta, 3),
              title: 'delta',
            },
            {
              label: 'Mark ν',
              value: fmtSigned(mark.greeks.vega, 2),
              title: 'vega',
            },
            ...(mode === 'pnl'
              ? [{ label: 'Path', value: pathSrc, tone: 'muted' as const }]
              : []),
          ]}
        />
      }
    >
      {mode === 'breakeven' ? (
        <DeskChartFrame xTitle="Spot" yTitle="PnL ($)" className="min-h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={payoffChart} margin={chrome.margin}>
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
                domain={beDomain}
                tickFormatter={(v: number) => chartSignedTick(v, 0)}
                label={deskAxisLabel('PnL ($)', 'insideLeft')}
              />
              <Tooltip contentStyle={chrome.tooltipStyle} />
              <ReferenceLine y={0} stroke={DESK_SERIES.zero} />
              <ReferenceLine x={snapshot.spot} stroke={DESK_SERIES.spot} strokeDasharray="3 3" />
              <ReferenceLine x={strBe.lower} stroke={CHART_GREEK.delta} strokeDasharray="2 2" />
              <ReferenceLine x={strBe.upper} stroke={CHART_GREEK.delta} strokeDasharray="2 2" />
              <Area
                type="monotone"
                dataKey="pnl"
                stroke={DESK_SERIES.combo}
                fill={DESK_SERIES.combo}
                fillOpacity={0.2}
                name="Payoff"
              />
            </AreaChart>
          </ResponsiveContainer>
        </DeskChartFrame>
      ) : (
        <DeskChartFrame xTitle="Date" yTitle="PnL ($)" className="min-h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={pnlChart} margin={chrome.margin}>
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
                domain={pnlDomain}
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
                fillOpacity={0.15}
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
                dataKey="theta"
                stroke={CHART_GREEK.theta}
                strokeWidth={1}
                dot={false}
                name="ΣΘ"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </DeskChartFrame>
      )}
    </DeskToolShell>
  );
}
