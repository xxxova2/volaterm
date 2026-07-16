import { useMemo } from 'react';
import { useTerminalStore } from '../../../store/terminalStore';
import { rollPnlHeatmap } from '../../../lib/options/basis';
import { fmtPct, fmtPrice, fmtSigned } from '../../../lib/format';
import { cn } from '../../../lib/utils';
import { DeskToolShell } from '../DeskToolShell';
import { PrintStrip } from '../PrintStrip';

export function RollTool() {
  const snapshot = useTerminalStore((s) => s.snapshot)!;
  const fundingAnn = useTerminalStore((s) => s.fundingAnn);
  const liveFunding = fundingAnn ?? snapshot.fundingAnn ?? null;
  const equityCarry = snapshot.riskFreeRate - snapshot.dividendYield;
  const carryAnn = liveFunding ?? equityCarry;

  const roll = useMemo(
    () =>
      rollPnlHeatmap(snapshot, {
        fundingAnn: carryAnn,
      }),
    [snapshot, carryAnn],
  );

  const maxAbs = useMemo(() => {
    let m = 1e-9;
    for (const row of roll.pnl) {
      for (const v of row) m = Math.max(m, Math.abs(v));
    }
    return m;
  }, [roll.pnl]);

  return (
    <DeskToolShell
      print={
        <PrintStrip
          items={[
            {
              label: 'Carry ann',
              value: fmtPct(carryAnn),
              tone: carryAnn >= 0 ? 'up' : 'down',
              title: 'rollPnl',
            },
            {
              label: 'Notional',
              value: fmtPrice(snapshot.spot, snapshot.spot > 1000 ? 0 : 2),
            },
            {
              label: 'Source',
              value: liveFunding != null ? 'Deribit funding' : 'r−q equity',
              tone: 'muted',
            },
            {
              label: 'Formula',
              value: 'S·(1+shock)·carry·d/365',
              tone: 'muted',
            },
          ]}
        />
      }
      bodyClassName="min-h-0 overflow-auto rounded border border-border bg-card"
    >
      <div className="flex h-full min-h-0 flex-col bg-black/40">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-2 py-1 font-mono text-type-2xs text-muted-foreground">
          <span>
            Rows: <span className="text-foreground">spot shock %</span>
          </span>
          <span className="text-zinc-500">Roll / funding PnL</span>
          <span>
            Cols: <span className="text-foreground">hold horizon (days)</span>
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full border-collapse font-mono text-type-xs">
            <thead className="sticky top-0 z-10 bg-card">
              <tr>
                <th className="px-2 py-1 text-left font-normal text-muted-foreground">
                  Shock % \ Days
                </th>
                {roll.horizons.map((h) => (
                  <th
                    key={h}
                    className="px-2 py-1 text-right font-normal text-muted-foreground"
                  >
                    {h}d
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roll.shocks.map((sh, si) => (
                <tr key={sh}>
                  <td className="px-2 py-0.5 text-muted-foreground">
                    {(sh * 100).toFixed(0)}%
                  </td>
                  {roll.horizons.map((h, hi) => {
                    const v = roll.pnl[si]![hi]!;
                    const intensity = Math.min(1, Math.abs(v) / maxAbs);
                    const nearZero = intensity < 0.06;
                    const bg = nearZero
                      ? undefined
                      : v >= 0
                        ? `color-mix(in oklch, var(--up) ${Math.round(intensity * 55)}%, transparent)`
                        : `color-mix(in oklch, var(--down) ${Math.round(intensity * 55)}%, transparent)`;
                    return (
                      <td
                        key={h}
                        className={cn(
                          'px-2 py-0.5 text-right tabular-nums',
                          nearZero
                            ? 'text-muted-foreground'
                            : v >= 0
                              ? 'text-up'
                              : 'text-down',
                        )}
                        style={bg ? { background: bg } : undefined}
                      >
                        {fmtSigned(v, Math.abs(v) > 100 ? 0 : 2)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DeskToolShell>
  );
}
