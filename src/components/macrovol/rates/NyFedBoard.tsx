import type { StirStripData } from '../../../lib/macrovol/api';
import { DataBadge } from '../DataBadge';
import { CollapsibleSection } from '../../terminal/CollapsibleSection';
import { StickyTable } from '../../common/StickyTable';

export function NyFedBoard({ nyfed }: { nyfed: NonNullable<StirStripData['nyfed']> }) {
  if (!nyfed.ref_print || nyfed.ref_print.length === 0) return null;

  return (
    <CollapsibleSection
      id="sec-nyfed"
      className="order-4"
      title="NY FED REFERENCE RATES"
      apis={['NYFed']}
      defaultOpen
      storageKey="rates.sec.nyfed"
      subtitle="Official overnight prints with percentiles + volume — same fields traders read on NYFed / CME STIR desks"
      badge={
        <>
          <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">
            FREE API · NO KEY
          </span>
          {nyfed.target && (
            <span className="text-[10px] text-muted-foreground">
              FOMC target {nyfed.target.from?.toFixed(2)}–{nyfed.target.to?.toFixed(2)}%
              {nyfed.target.mid != null ? ` · mid ${nyfed.target.mid.toFixed(2)}%` : ''}
            </span>
          )}
        </>
      }
    >
      <StickyTable className="mt-3" maxHeight="min(40vh, 280px)">
        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr className="bg-card text-muted-foreground">
              <th className="p-1.5 text-left font-normal">Rate</th>
              <th className="p-1.5 text-right font-normal">Last %</th>
              <th className="p-1.5 text-right font-normal">1st</th>
              <th className="p-1.5 text-right font-normal">25th</th>
              <th className="p-1.5 text-right font-normal">75th</th>
              <th className="p-1.5 text-right font-normal">99th</th>
              <th className="p-1.5 text-right font-normal">Vol $bn</th>
              <th className="p-1.5 text-right font-normal">Eff date</th>
            </tr>
          </thead>
          <tbody>
            {nyfed.ref_print.map((r) => (
              <tr key={r.code} className="border-t border-border/50 hover:bg-muted/20">
                <td className="p-1.5 font-bold text-foreground">{r.code}</td>
                <td className="p-1.5 text-right font-mono font-semibold tabular-nums">
                  {r.rate != null ? r.rate.toFixed(2) : '—'}
                </td>
                <td className="p-1.5 text-right font-mono tabular-nums text-muted-foreground">
                  {r.p1 != null ? r.p1.toFixed(2) : '—'}
                </td>
                <td className="p-1.5 text-right font-mono tabular-nums text-muted-foreground">
                  {r.p25 != null ? r.p25.toFixed(2) : '—'}
                </td>
                <td className="p-1.5 text-right font-mono tabular-nums text-muted-foreground">
                  {r.p75 != null ? r.p75.toFixed(2) : '—'}
                </td>
                <td className="p-1.5 text-right font-mono tabular-nums text-muted-foreground">
                  {r.p99 != null ? r.p99.toFixed(2) : '—'}
                </td>
                <td className="p-1.5 text-right font-mono tabular-nums">
                  {r.volume_bn != null ? r.volume_bn.toLocaleString() : '—'}
                </td>
                <td className="p-1.5 text-right text-muted-foreground">{r.effective_date || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </StickyTable>
      {nyfed.sofr_avg && (
        <div className="mt-2 flex flex-wrap gap-3 text-[10px]">
          <span className="text-muted-foreground">SOFR averages</span>
          <span>30d <b>{nyfed.sofr_avg.avg_30d?.toFixed(3) ?? '—'}%</b></span>
          <span>90d <b>{nyfed.sofr_avg.avg_90d?.toFixed(3) ?? '—'}%</b></span>
          <span>180d <b>{nyfed.sofr_avg.avg_180d?.toFixed(3) ?? '—'}%</b></span>
          {nyfed.sofr_avg.index != null && (
            <span>Index <b>{nyfed.sofr_avg.index.toFixed(6)}</b></span>
          )}
        </div>
      )}
      <DataBadge
        asOf={nyfed.as_of || undefined}
        source={nyfed.source || 'NYFed Markets API'}
        note={nyfed.note}
        className="mt-2"
      />
    </CollapsibleSection>
  );
}
