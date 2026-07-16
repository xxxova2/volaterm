/**
 * Honesty strip: VIXCLS (FRED) ≠ front ATM IV (chain) ≠ RV20 (realized).
 * Never reuse the word "VIX" for ATM or RV.
 * W5: denser black-field print strip.
 */
import { useEffect, useState } from 'react';
import { macrovolApi, type MacroStressPack } from '../../lib/macrovol/api';
import { useTerminalStore } from '../../store/terminalStore';
import { fetchDeskPack } from '../../lib/data/deskFeedsClient';
import { realizedVolCloseToClose } from '../../lib/options/analytics';
import { cn } from '../../lib/utils';
import { PrintStrip } from '../desk/PrintStrip';

export function ThreeVolStrip({ className }: { className?: string }) {
  const symbol = useTerminalStore((s) => s.symbol);
  const atmIv = useTerminalStore((s) => s.snapshot?.expiries[0]?.atmIV ?? null);
  const fmpHistory = useTerminalStore((s) => s.fmpHistory);
  const metrics = useTerminalStore((s) => s.surfaceMetrics);
  const lastPath = useTerminalStore((s) => s.lastSurfacePath);

  const [stress, setStress] = useState<MacroStressPack | null>(null);
  const [rv20, setRv20] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    macrovolApi
      .macroStress()
      .then((s) => {
        if (!cancelled) setStress(s);
      })
      .catch(() => {
        if (!cancelled) setStress(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchDeskPack(symbol)
      .then((p) => {
        if (cancelled) return;
        const fromPack = p?.derived?.realized_vol_20d_pct;
        if (fromPack != null && Number.isFinite(fromPack)) {
          setRv20(fromPack);
          return;
        }
        if (fmpHistory && fmpHistory.length >= 21) {
          const rv = realizedVolCloseToClose(fmpHistory.map((b) => b.close));
          setRv20(rv != null ? rv * 100 : null);
        } else {
          setRv20(null);
        }
      })
      .catch(() => {
        if (cancelled) return;
        if (fmpHistory && fmpHistory.length >= 21) {
          const rv = realizedVolCloseToClose(fmpHistory.map((b) => b.close));
          setRv20(rv != null ? rv * 100 : null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [symbol, fmpHistory]);

  const vix = stress?.vix;
  const vixDate = stress?.obs_dates?.vix ?? null;
  const last = metrics.length >= 1 ? metrics[metrics.length - 1]! : null;
  const prev = metrics.length >= 2 ? metrics[metrics.length - 2]! : null;
  const atmDeltaBps =
    last?.atmIv != null && prev?.atmIv != null
      ? Math.round((last.atmIv - prev.atmIv) * 10_000)
      : null;
  const rrDeltaBps =
    last?.rr25 != null && prev?.rr25 != null
      ? Math.round((last.rr25 - prev.rr25) * 10_000)
      : null;

  return (
    <div
      className={cn(
        'flex flex-wrap items-end gap-x-2 gap-y-1 rounded border border-border bg-black/40 px-2 py-1 font-mono',
        className,
      )}
      data-testid="three-vol-strip"
      title="Three different numbers: index VIX (FRED), front ATM IV (options), 20d realized vol. Do not equate them."
    >
      <span className="rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-type-2xs font-bold tracking-wider text-amber-500/90">
        VOL
      </span>
      <PrintStrip
        className="min-w-0 flex-1 border-0 bg-transparent p-0"
        items={[
          {
            label: 'VIXCLS',
            value: vix != null ? vix.toFixed(1) : '—',
            title: `CBOE VIX via FRED VIXCLS — not ATM IV, not realized vol${vixDate ? ` · ${vixDate}` : ''}`,
          },
          {
            label: 'ATM',
            value: atmIv != null && atmIv > 0 ? `${(atmIv * 100).toFixed(1)}%` : '—',
            title: 'Front-expiry ATM IV from live option chain (mid-solved)',
          },
          {
            label: 'RV20',
            value: rv20 != null ? `${rv20.toFixed(1)}%` : '—',
            title: '20-day close-to-close realized vol — not VIX',
          },
          ...(atmDeltaBps != null
            ? [
                {
                  label: 'ΔATM',
                  value: `${atmDeltaBps >= 0 ? '+' : ''}${atmDeltaBps}bp`,
                  tone: (atmDeltaBps >= 0 ? 'up' : 'down') as 'up' | 'down',
                  title: 'Change vs previous session frame (bps of vol)',
                },
              ]
            : []),
          ...(rrDeltaBps != null
            ? [
                {
                  label: 'ΔRR25',
                  value: `${rrDeltaBps >= 0 ? '+' : ''}${rrDeltaBps}bp`,
                  tone: (rrDeltaBps >= 0 ? 'up' : 'down') as 'up' | 'down',
                  title: '25Δ RR change vs previous frame',
                },
              ]
            : []),
        ]}
      />
      {lastPath && (
        <span
          className="text-type-2xs text-muted-foreground"
          title={
            lastPath === 'sticky_spot'
              ? 'Surface last rebuilt from sticky-IV spot reprice (IV by strike held)'
              : 'Surface last rebuilt from full option chain refresh'
          }
        >
          {lastPath === 'sticky_spot' ? 'sticky-IV' : 'full-chain'}
        </span>
      )}
    </div>
  );
}
