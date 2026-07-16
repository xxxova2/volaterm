import { useEffect, useMemo, useState } from 'react';
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
import { optionGreeksPnl } from '../../../lib/options/greeksPnl';
import { fmtPrice, fmtSigned } from '../../../lib/format';
import { useSpotPath } from '../useSpotPath';
import { DeskToolShell } from '../DeskToolShell';
import { DeskSelect } from '../DeskField';
import { PrintStrip } from '../PrintStrip';
import { DeskChartFrame, deskChartChrome, deskAxisLabel } from '../DeskChart';
import { DESK_SERIES } from '../seriesGrammar';
import { CHART_GREEK, chartSignedTick, tightDomain } from '../../../lib/chartTheme';

export function OptionPnlTool() {
  const snapshot = useTerminalStore((s) => s.snapshot)!;
  const { path, source: pathSrc } = useSpotPath(45);
  const [expiryIdx, setExpiryIdx] = useState(0);
  const [type, setType] = useState<'call' | 'put'>('call');
  const [side, setSide] = useState<'long' | 'short'>('long');

  const slice = snapshot.expiries[expiryIdx] ?? snapshot.expiries[0];
  const strikes = useMemo(() => {
    if (!slice) return [] as number[];
    const list = type === 'call' ? slice.calls : slice.puts;
    return list
      .filter((q) => q.iv != null)
      .map((q) => q.strike)
      .sort((a, b) => a - b);
  }, [slice, type]);

  const defaultStrike = useMemo(() => {
    if (!strikes.length) return snapshot.spot;
    return strikes.reduce(
      (b, k) => (Math.abs(k - snapshot.spot) < Math.abs(b - snapshot.spot) ? k : b),
      strikes[0]!,
    );
  }, [strikes, snapshot.spot]);

  const [strike, setStrike] = useState(defaultStrike);
  useEffect(() => {
    setStrike(defaultStrike);
  }, [defaultStrike]);

  const series = useMemo(() => {
    if (!slice) return null;
    return optionGreeksPnl(snapshot, {
      type,
      strike,
      expiry: slice.expiry,
      side,
      path,
    });
  }, [snapshot, type, strike, slice, side, path]);

  const chart =
    series?.bars.map((b) => ({
      t: b.dateLabel,
      pnl: b.pnl,
      mark: b.mark,
      delta: b.cumDelta,
      gamma: b.cumGamma,
      theta: b.cumTheta,
    })) ?? [];

  const chrome = deskChartChrome();
  const yDomain = tightDomain(
    chart.flatMap((r) => [r.pnl, r.delta, r.theta]),
    0.08,
    { includeZero: true },
  );

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
          <DeskSelect
            label="Type"
            value={type}
            onChange={setType}
            options={[
              { value: 'call', label: 'Call' },
              { value: 'put', label: 'Put' },
            ]}
          />
          <DeskSelect
            label="Strike"
            value={String(strike)}
            onChange={(v) => setStrike(+v)}
            options={strikes.map((k) => ({
              value: String(k),
              label: fmtPrice(k, k > 1000 ? 0 : 2),
            }))}
          />
          <DeskSelect
            label="Side"
            value={side}
            onChange={setSide}
            options={[
              { value: 'long', label: 'Long' },
              { value: 'short', label: 'Short' },
            ]}
          />
        </>
      }
      print={
        <PrintStrip
          items={
            series
              ? [
                  {
                    label: 'Term PnL',
                    value: fmtSigned(series.terminalPnl),
                    tone: series.terminalPnl >= 0 ? 'up' : 'down',
                  },
                  { label: 'Σ Δ', value: fmtSigned(series.totalDelta) },
                  { label: 'Σ Γ', value: fmtSigned(series.totalGamma) },
                  { label: 'Σ Θ', value: fmtSigned(series.totalTheta) },
                  { label: 'Path', value: pathSrc, tone: 'muted' },
                  { label: 'Marks', value: 'BS sticky-IV', tone: 'muted' },
                ]
              : [
                  { label: 'Path', value: pathSrc, tone: 'muted' },
                  { label: 'Marks', value: 'BS sticky-IV', tone: 'muted' },
                ]
          }
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
    </DeskToolShell>
  );
}
