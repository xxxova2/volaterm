/**
 * Cash–futures monitor: live Tsy futures vs cash curve + SOFR financing context.
 * Educational Conks/OnlySOFRs slice — not CTD-adjusted basis size.
 */
import { useMemo } from 'react';
import type { StirContract } from '../../../lib/macrovol/api';
import { buildCashFuturesSnapshot } from '../../../lib/rates/cashFuturesBasis';
import { CollapsibleSection } from '../../terminal/CollapsibleSection';
import { Explain } from '../../common/Explain';
import { cn } from '../../../lib/utils';

export function CashFuturesMonitor({
  treasuryFutures,
  curve,
  sofr,
  effr,
}: {
  treasuryFutures: StirContract[] | null | undefined;
  curve: { label: string; yield: number | null }[];
  sofr: number | null | undefined;
  effr: number | null | undefined;
}) {
  const snap = useMemo(
    () =>
      buildCashFuturesSnapshot(treasuryFutures, curve, {
        sofr: sofr ?? null,
        effr: effr ?? null,
      }),
    [treasuryFutures, curve, sofr, effr],
  );

  return (
    <CollapsibleSection
      id="sec-cash-futures"
      className="order-6"
      title="CASH–FUTURES · TSY"
      apis={['yfinance', 'FRED', 'MacroVol']}
      defaultOpen
      storageKey="rates.sec.cash-futures"
      subtitle="Futures marks × cash yields × SOFR financing context · not CTD basis"
      badge={
        <span className="rounded bg-muted/40 px-1.5 py-0.5 text-type-2xs font-bold text-muted-foreground">
          {snap.liveCount} LIVE
        </span>
      }
    >
      <p className="mb-2 text-type-2xs leading-snug text-muted-foreground">
        <Explain term="cashFuturesBasis">Cash–futures basis trade</Explain>
        {' '}
        (long cash CTD / short futures / finance in repo) is a leverage channel — margin and
        rollover risk, not a free arb. We show continuous futures last vs cash curve only.
        No conversion factors or delivery option value.
      </p>

      <div className="mb-2 flex flex-wrap gap-3 font-mono text-type-2xs">
        <span>
          <span className="text-muted-foreground">SOFR </span>
          <span className="font-semibold text-foreground">
            {snap.sofr != null ? `${snap.sofr.toFixed(2)}%` : '—'}
          </span>
        </span>
        <span>
          <span className="text-muted-foreground">SOFR−EFFR </span>
          <span
            className={cn(
              'font-semibold',
              snap.sofrEffrBps != null && Math.abs(snap.sofrEffrBps) > 5
                ? 'text-warn'
                : 'text-foreground',
            )}
          >
            {snap.sofrEffrBps != null ? `${snap.sofrEffrBps.toFixed(1)} bps` : '—'}
          </span>
        </span>
      </div>

      {snap.rows.length === 0 ? (
        <div className="rounded border border-border/60 px-2 py-3 font-mono text-type-2xs text-muted-foreground">
          No Treasury futures quotes yet — wait for STIR strip (ZT/ZF/ZN/…).
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse font-mono text-type-2xs">
            <thead>
              <tr className="text-muted-foreground">
                <th className="px-1.5 py-0.5 text-left font-normal">CC</th>
                <th className="px-1.5 py-0.5 text-left font-normal">Product</th>
                <th className="px-1.5 py-0.5 text-right font-normal">Fut last</th>
                <th className="px-1.5 py-0.5 text-right font-normal">Chg</th>
                <th className="px-1.5 py-0.5 text-right font-normal">Cash yld</th>
                <th className="px-1.5 py-0.5 text-left font-normal">Tenor</th>
              </tr>
            </thead>
            <tbody>
              {snap.rows.map((r) => (
                <tr key={r.ticker} className="border-t border-border/40">
                  <td className="px-1.5 py-0.5 font-semibold text-foreground">{r.ticker}</td>
                  <td className="px-1.5 py-0.5 text-muted-foreground">{r.product}</td>
                  <td className="px-1.5 py-0.5 text-right tabular-nums text-foreground">
                    {r.futuresPrice != null ? r.futuresPrice.toFixed(4) : '—'}
                  </td>
                  <td
                    className={cn(
                      'px-1.5 py-0.5 text-right tabular-nums',
                      r.futuresNet == null
                        ? 'text-muted-foreground'
                        : r.futuresNet >= 0
                          ? 'text-up'
                          : 'text-down',
                    )}
                  >
                    {r.futuresNet != null
                      ? `${r.futuresNet >= 0 ? '+' : ''}${r.futuresNet.toFixed(4)}`
                      : '—'}
                  </td>
                  <td className="px-1.5 py-0.5 text-right tabular-nums text-foreground">
                    {r.cashYield != null ? `${r.cashYield.toFixed(3)}%` : '—'}
                    {r.cashLabel && (
                      <span className="ml-1 text-muted-foreground">({r.cashLabel})</span>
                    )}
                  </td>
                  <td className="px-1.5 py-0.5 text-muted-foreground">{r.tenor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-2 text-type-2xs leading-snug text-muted-foreground/80">{snap.note}</p>
    </CollapsibleSection>
  );
}
