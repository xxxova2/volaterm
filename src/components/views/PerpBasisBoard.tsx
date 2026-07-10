/**
 * Crypto linear perp basis board (Bybit mark vs index).
 */
import { useEffect, useState } from 'react';
import { Panel } from '../terminal/Panel';
import { macrovolApi, type PerpBasisData } from '../../lib/macrovol/api';
import { fmtCompact, fmtPrice } from '../../lib/format';
import { cn } from '../../lib/utils';

export function PerpBasisBoard({ className }: { className?: string }) {
  const [data, setData] = useState<PerpBasisData | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      macrovolApi.cryptoPerpBasis()
        .then((d) => {
          if (cancelled) return;
          setData(d);
          setErr(d.error || null);
        })
        .catch((e) => {
          if (cancelled) return;
          setErr(e instanceof Error ? e.message : String(e));
        });
    };
    load();
    const t = setInterval(load, 45_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  const rows = data?.rows ?? [];

  return (
    <Panel
      title="Perp basis"
      className={className}
      badge={
        <span className="font-mono text-type-2xs text-muted-foreground">
          Bybit linear · {data?.as_of ? new Date(data.as_of).toLocaleTimeString() : '—'}
        </span>
      }
    >
      {err && !rows.some((r) => r.mark != null) ? (
        <p className="p-2 font-mono text-type-2xs text-muted-foreground">
          Perp basis unavailable — {err}. No synthetic levels.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full font-mono text-type-xs">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-2 py-1">Ccy</th>
                <th className="px-2 py-1">Mark</th>
                <th className="px-2 py-1">Index</th>
                <th className="px-2 py-1">Basis</th>
                <th className="px-2 py-1">Fund 8h</th>
                <th className="px-2 py-1">Fund ann≈</th>
                <th className="px-2 py-1">OI</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.symbol} className="border-b border-border/40">
                  <td className="px-2 py-1 font-semibold">{r.ccy}</td>
                  <td className="px-2 py-1 tabular-nums">
                    {r.mark != null ? fmtPrice(r.mark, r.mark > 1000 ? 1 : 2) : '—'}
                  </td>
                  <td className="px-2 py-1 tabular-nums">
                    {r.index != null ? fmtPrice(r.index, r.index > 1000 ? 1 : 2) : '—'}
                  </td>
                  <td className={cn(
                    'px-2 py-1 tabular-nums font-semibold',
                    r.basis_bps == null ? 'text-muted-foreground'
                      : r.basis_bps >= 0 ? 'text-up' : 'text-down',
                  )}>
                    {r.basis_bps != null
                      ? `${r.basis_bps >= 0 ? '+' : ''}${r.basis_bps.toFixed(1)}bp`
                      : '—'}
                  </td>
                  <td className="px-2 py-1 tabular-nums">
                    {r.funding_rate != null
                      ? `${(r.funding_rate * 100).toFixed(4)}%`
                      : '—'}
                  </td>
                  <td className="px-2 py-1 tabular-nums">
                    {r.funding_ann_approx != null
                      ? `${(r.funding_ann_approx * 100).toFixed(1)}%`
                      : '—'}
                  </td>
                  <td className="px-2 py-1 tabular-nums">
                    {r.open_interest != null ? fmtCompact(r.open_interest) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data?.note && (
            <p className="px-2 py-1 text-type-2xs text-muted-foreground">{data.note}</p>
          )}
        </div>
      )}
    </Panel>
  );
}
