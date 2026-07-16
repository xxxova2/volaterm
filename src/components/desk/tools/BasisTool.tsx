import { useMemo } from 'react';
import {
  Bar,
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
import { buildBasisCurve, isCryptoSymbol } from '../../../lib/options/basis';
import { fmtPct, fmtPrice, fmtSigned } from '../../../lib/format';
import { DeskToolShell } from '../DeskToolShell';
import { PrintStrip } from '../PrintStrip';
import { DeskChartFrame, deskChartChrome, deskAxisLabel } from '../DeskChart';
import { DESK_SERIES } from '../seriesGrammar';
import { chartDayTick, chartPctTick } from '../../../lib/chartTheme';

export function BasisTool() {
  const snapshot = useTerminalStore((s) => s.snapshot)!;
  const fundingAnn = useTerminalStore((s) => s.fundingAnn);
  const liveFunding = fundingAnn ?? snapshot.fundingAnn ?? null;
  const curve = useMemo(
    () => buildBasisCurve(snapshot, { fundingAnn: liveFunding }),
    [snapshot, liveFunding],
  );
  const chart = useMemo(
    () =>
      curve.points.map((p) => ({
        dte: p.dte,
        basisPct: (p.basis / curve.spot) * 100,
        carry: p.annCarry * 100,
        forward: p.forward,
        source: p.source,
      })),
    [curve],
  );
  const mktN = curve.points.filter((p) => p.source === 'market').length;
  const frontBasis = chart[0]?.basisPct;
  const chrome = deskChartChrome();

  return (
    <DeskToolShell
      print={
        <PrintStrip
          items={[
            {
              label: 'Spot',
              value: fmtPrice(snapshot.spot, snapshot.spot > 1000 ? 1 : 2),
            },
            { label: 'r', value: fmtPct(curve.r) },
            { label: 'q_eff', value: fmtPct(curve.q) },
            ...(liveFunding != null
              ? [
                  {
                    label: 'Funding ann',
                    value: fmtPct(liveFunding),
                    tone: liveFunding >= 0 ? ('up' as const) : ('down' as const),
                  },
                ]
              : []),
            ...(curve.perp
              ? [
                  {
                    label: 'Perp mark',
                    value: `${fmtPrice(curve.perp.mark, curve.perp.mark > 1000 ? 0 : 2)} (${fmtSigned(curve.perp.basis)})`,
                  },
                ]
              : []),
            {
              label: 'Front basis',
              value: frontBasis != null ? `${frontBasis.toFixed(3)}%` : '—',
              tone:
                frontBasis == null
                  ? ('muted' as const)
                  : frontBasis >= 0
                    ? ('up' as const)
                    : ('down' as const),
            },
            {
              label: 'Marks',
              value: curve.hasMarketMarks ? `mkt ${mktN}` : 'theo',
            },
            {
              label: 'Model',
              value: curve.hasMarketMarks
                ? 'Live F − S'
                : isCryptoSymbol(snapshot.symbol)
                  ? 'F=S·e^(r+f)T'
                  : 'F=S·e^(r−q)T',
              tone: 'muted' as const,
            },
          ]}
        />
      }
    >
      <DeskChartFrame
        xTitle="Time (DTE)"
        yTitle="Basis % · Ann. carry %"
        className="min-h-[220px]"
        header={
          <span className="text-zinc-600">
            {curve.hasMarketMarks ? 'Market F − S' : '(F−S)/S theo'} · (F/S−1)/T
          </span>
        }
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chart} margin={{ ...chrome.margin, right: 36 }}>
            <CartesianGrid {...chrome.grid} />
            <XAxis
              dataKey="dte"
              tick={chrome.tick}
              stroke={chrome.axisLine}
              tickFormatter={(v: number) => chartDayTick(v)}
              label={deskAxisLabel('Time (DTE)')}
            />
            <YAxis
              yAxisId="basis"
              tick={chrome.tick}
              stroke={chrome.axisLine}
              width={48}
              tickFormatter={(v: number) => chartPctTick(v, false)}
              label={deskAxisLabel('Basis %', 'insideLeft')}
            />
            <YAxis
              yAxisId="carry"
              orientation="right"
              tick={chrome.tick}
              stroke={chrome.axisLine}
              width={48}
              tickFormatter={(v: number) => chartPctTick(v, false)}
              label={deskAxisLabel('Ann. carry %', 'insideRight')}
            />
            <Tooltip
              contentStyle={chrome.tooltipStyle}
              formatter={(value: number, name: string) => [
                `${Number(value).toFixed(3)}%`,
                name,
              ]}
              labelFormatter={(dte: number) => `DTE ${dte}d`}
            />
            <ReferenceLine yAxisId="basis" y={0} stroke={DESK_SERIES.zero} />
            <Bar
              yAxisId="basis"
              dataKey="basisPct"
              fill={DESK_SERIES.historyLive}
              opacity={0.85}
              name="Basis %"
            />
            <Line
              yAxisId="carry"
              type="monotone"
              dataKey="carry"
              stroke={DESK_SERIES.median}
              strokeWidth={2}
              dot={{ r: 2 }}
              name="Ann. carry %"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </DeskChartFrame>
    </DeskToolShell>
  );
}
