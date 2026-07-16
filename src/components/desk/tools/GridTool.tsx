import { useMemo, useState } from 'react';
import { useTerminalStore } from '../../../store/terminalStore';
import { buildOptionGrid } from '../../../lib/options/optionGrid';
import { fmtPrice } from '../../../lib/format';
import { cn } from '../../../lib/utils';
import { DeskToolShell } from '../DeskToolShell';
import { DeskSelect } from '../DeskField';
import { PrintStrip } from '../PrintStrip';

type GridMetric = 'omega' | 'invNd2' | 'nd2';

export function GridTool() {
  const snapshot = useTerminalStore((s) => s.snapshot)!;
  const [type, setType] = useState<'call' | 'put'>('call');
  const [metric, setMetric] = useState<GridMetric>('omega');
  const grid = useMemo(() => buildOptionGrid(snapshot, type, 6), [snapshot, type]);

  const values = grid.cells.flatMap((row) =>
    row.map((c) => c[metric]).filter((v): v is number => v != null && isFinite(v)),
  );
  const maxAbs = Math.max(...values.map(Math.abs), 1e-9);

  const nearestKi = useMemo(() => {
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < grid.strikes.length; i++) {
      const d = Math.abs(grid.strikes[i]! - snapshot.spot);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    return best;
  }, [grid.strikes, snapshot.spot]);

  return (
    <DeskToolShell
      controls={
        <>
          <DeskSelect
            label="Type"
            value={type}
            onChange={setType}
            options={[
              { value: 'call', label: 'Calls' },
              { value: 'put', label: 'Puts' },
            ]}
          />
          <DeskSelect
            label="Metric"
            value={metric}
            onChange={setMetric}
            options={[
              { value: 'omega', label: 'Ω leverage' },
              { value: 'nd2', label: 'N(d2)' },
              { value: 'invNd2', label: '1/N(d2)' },
            ]}
          />
        </>
      }
      print={
        <PrintStrip
          items={[
            { label: 'Strikes', value: String(grid.strikes.length) },
            { label: 'Expiries', value: String(grid.expiries.length) },
            {
              label: 'Spot',
              value: fmtPrice(snapshot.spot, snapshot.spot > 1000 ? 0 : 2),
            },
          ]}
        />
      }
      bodyClassName="min-h-0 overflow-auto rounded border border-border bg-card"
    >
      <div className="h-full overflow-auto bg-black/40">
        <table className="border-collapse font-mono text-type-xs">
          <thead className="sticky top-0 z-10 bg-card">
            <tr>
              <th className="sticky left-0 z-20 bg-card px-1 py-1 text-left text-muted-foreground">
                K \ T
              </th>
              {grid.dtes.map((d, i) => (
                <th
                  key={grid.expiries[i]}
                  className="px-1 py-1 font-normal text-muted-foreground"
                >
                  {d}d
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.strikes.map((K, ki) => {
              const nearSpot = ki === nearestKi;
              return (
                <tr
                  key={K}
                  className={cn(
                    nearSpot && 'border-l-2 border-l-amber-500 bg-amber-500/10',
                  )}
                >
                  <td
                    className={cn(
                      'sticky left-0 z-[1] px-1 py-0.5 text-muted-foreground',
                      nearSpot ? 'bg-amber-500/10' : 'bg-card',
                    )}
                  >
                    {fmtPrice(K, K > 1000 ? 0 : 1)}
                  </td>
                  {grid.cells.map((row, ei) => {
                    const cell = row[ki];
                    const v = cell?.[metric] ?? null;
                    const intensity =
                      v != null ? Math.min(1, Math.abs(v) / maxAbs) : 0;
                    const nearZero = v == null || intensity < 0.08;
                    const tone =
                      nearZero
                        ? 'text-muted-foreground'
                        : v! > 0
                          ? 'text-up'
                          : 'text-down';
                    return (
                      <td
                        key={ei}
                        className={cn(
                          'px-1 py-0.5 text-right tabular-nums',
                          tone,
                        )}
                        style={
                          nearZero
                            ? undefined
                            : { opacity: 0.45 + intensity * 0.55 }
                        }
                      >
                        {v == null
                          ? '·'
                          : metric === 'nd2'
                            ? (v * 100).toFixed(0)
                            : v.toFixed(1)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </DeskToolShell>
  );
}
