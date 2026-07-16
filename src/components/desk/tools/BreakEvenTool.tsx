import { useMemo, useState } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTerminalStore } from '../../../store/terminalStore';
import { breakEvenTable } from '../../../lib/options/breakEven';
import { fmtPct, fmtPrice } from '../../../lib/format';
import { cn } from '../../../lib/utils';
import { Explain } from '../../common/Explain';
import { DeskToolShell } from '../DeskToolShell';
import { DeskSelect } from '../DeskField';
import { PrintStrip } from '../PrintStrip';
import { DeskChartFrame, deskChartChrome, deskAxisLabel } from '../DeskChart';
import { DESK_SERIES } from '../seriesGrammar';
import { chartPriceTick, chartPctTick } from '../../../lib/chartTheme';

type OptType = 'call' | 'put' | 'both';

export function BreakEvenTool() {
  const snapshot = useTerminalStore((s) => s.snapshot)!;
  const [expiryIdx, setExpiryIdx] = useState(0);
  const [type, setType] = useState<OptType>('call');

  const rows = useMemo(
    () => breakEvenTable(snapshot, expiryIdx, type),
    [snapshot, expiryIdx, type],
  );
  const near = useMemo(
    () => rows.filter((r) => Math.abs(r.strike - snapshot.spot) / snapshot.spot < 0.12),
    [rows, snapshot.spot],
  );

  const atmKey = useMemo(() => {
    if (near.length === 0) return null;
    let best = near[0]!;
    let bestDist = Math.abs(best.strike - snapshot.spot);
    for (const r of near) {
      const d = Math.abs(r.strike - snapshot.spot);
      if (d < bestDist) {
        bestDist = d;
        best = r;
      }
    }
    return `${best.type}-${best.strike}`;
  }, [near, snapshot.spot]);

  const chartData = useMemo(
    () =>
      near.map((r) => ({
        strike: r.strike,
        beDistPct: r.beDistPct * 100,
        type: r.type,
      })),
    [near],
  );

  const chrome = deskChartChrome();

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
              { value: 'call', label: 'Calls' },
              { value: 'put', label: 'Puts' },
              { value: 'both', label: 'Both' },
            ]}
          />
        </>
      }
      print={
        <PrintStrip
          items={[
            {
              label: 'Spot',
              value: fmtPrice(snapshot.spot, snapshot.spot > 1000 ? 0 : 2),
            },
            { label: 'Rows', value: String(near.length) },
          ]}
        />
      }
      bodyClassName="grid min-h-0 grid-rows-[1fr_minmax(100px,28%)] gap-1"
    >
      {/* PRIMARY: dense BE matrix */}
      <div className="min-h-0 overflow-auto rounded border border-border bg-card">
        <table className="w-full font-mono text-type-xs">
          <thead className="sticky top-0 z-10 border-b border-border bg-card text-muted-foreground">
            <tr>
              <th className="px-2 py-1 text-left font-normal">K</th>
              <th className="px-2 py-1 text-left font-normal">Type</th>
              <th className="px-2 py-1 text-right font-normal">Mid</th>
              <th className="px-2 py-1 text-right font-normal">BE</th>
              <th className="px-2 py-1 text-right font-normal">BE dist</th>
              <th className="px-2 py-1 text-right font-normal">
                <Explain term="nd2">N(d2)</Explain>
              </th>
              <th className="px-2 py-1 text-right font-normal">Δ</th>
              <th className="px-2 py-1 text-right font-normal">IV</th>
            </tr>
          </thead>
          <tbody>
            {near.map((r) => {
              const key = `${r.type}-${r.strike}`;
              const isAtm = key === atmKey;
              return (
                <tr
                  key={key}
                  className={cn(
                    'border-b border-border/50 hover:bg-muted/30',
                    isAtm && 'border-l-2 border-l-amber-500 bg-amber-500/10',
                  )}
                >
                  <td className="px-2 py-0.5 tabular-nums">
                    {fmtPrice(r.strike, r.strike > 1000 ? 0 : 2)}
                  </td>
                  <td
                    className={cn(
                      'px-2 py-0.5',
                      r.type === 'call' ? 'text-up' : 'text-down',
                    )}
                  >
                    {r.type}
                  </td>
                  <td className="px-2 py-0.5 text-right tabular-nums">
                    {fmtPrice(r.mid)}
                  </td>
                  <td className="px-2 py-0.5 text-right tabular-nums">
                    {fmtPrice(r.beLong, r.beLong > 1000 ? 0 : 2)}
                  </td>
                  <td
                    className={cn(
                      'px-2 py-0.5 text-right tabular-nums',
                      r.beDistPct >= 0 ? 'text-up' : 'text-down',
                    )}
                  >
                    {fmtPct(r.beDistPct)}
                  </td>
                  <td className="px-2 py-0.5 text-right tabular-nums">
                    {(r.nd2 * 100).toFixed(1)}%
                  </td>
                  <td className="px-2 py-0.5 text-right tabular-nums">
                    {r.delta.toFixed(3)}
                  </td>
                  <td className="px-2 py-0.5 text-right tabular-nums">
                    {fmtPct(r.iv)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* SECONDARY: BE distance support chart */}
      <DeskChartFrame xTitle="Strike" yTitle="BE dist %" height={120}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={chrome.margin}>
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
              width={44}
              tickFormatter={(v: number) => chartPctTick(v, false)}
              label={deskAxisLabel('BE dist %', 'insideLeft')}
            />
            <Tooltip
              contentStyle={chrome.tooltipStyle}
              formatter={(v: number) => [`${v.toFixed(2)}%`, 'BE dist']}
              labelFormatter={(k: number) => `K ${chartPriceTick(k)}`}
            />
            <ReferenceLine y={0} stroke={DESK_SERIES.zero} />
            <ReferenceLine
              x={snapshot.spot}
              stroke={DESK_SERIES.spot}
              strokeDasharray="3 3"
            />
            <Bar dataKey="beDistPct" fill={DESK_SERIES.median} name="BE dist %" maxBarSize={14} />
          </ComposedChart>
        </ResponsiveContainer>
      </DeskChartFrame>
    </DeskToolShell>
  );
}
