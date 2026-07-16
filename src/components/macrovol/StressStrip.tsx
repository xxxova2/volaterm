import { useEffect, useState } from 'react';
import {
  macrovolApi,
  type MacroPrimaryPack,
  type MacroStressPack,
} from '../../lib/macrovol/api';
import { DataBadge } from './DataBadge';
import { cn } from '../../lib/utils';

/**
 * Free FRED stress pack — credit, vol, inflation expectations, USD, conditions.
 * Plus keyless OFR/ECB primary repo/policy chips (not VIXCLS).
 * Shared FRED stress endpoints (TTL + Node light-path cache). No per-visitor FRED stampede.
 */

/** Rates-first order — VIX last (equity vol is not a rates print). */
const CELLS: {
  key: keyof MacroStressPack;
  label: string;
  fmt: (v: number) => string;
  tip: string;
}[] = [
  { key: 'term_sofr_3m', label: 'TSFR 3M', fmt: (v) => `${v.toFixed(2)}%`, tip: '3M term SOFR' },
  { key: 'real_10y', label: 'Real 10Y', fmt: (v) => `${v.toFixed(2)}%`, tip: '10Y TIPS real yield' },
  { key: 'bei_5y', label: '5Y BEI', fmt: (v) => `${v.toFixed(2)}%`, tip: '5Y breakeven inflation' },
  { key: 'bei_10y', label: '10Y BEI', fmt: (v) => `${v.toFixed(2)}%`, tip: '10Y breakeven inflation' },
  // FRED BAML* OAS is percent (2.72 = 272 bps). Display as bps for desk convention.
  { key: 'hy_oas', label: 'HY OAS', fmt: (v) => `${(v * 100).toFixed(0)}bp`, tip: 'ICE BofA HY OAS (FRED percent ×100 = bps)' },
  { key: 'ig_oas', label: 'IG OAS', fmt: (v) => `${(v * 100).toFixed(0)}bp`, tip: 'ICE BofA IG OAS (FRED percent ×100 = bps)' },
  { key: 'usd_broad', label: 'USD', fmt: (v) => v.toFixed(1), tip: 'Trade-weighted USD broad' },
  { key: 'nfci', label: 'NFCI', fmt: (v) => v.toFixed(2), tip: 'Chicago Fed financial conditions (<0 easier)' },
  { key: 'vix', label: 'VIXCLS', fmt: (v) => v.toFixed(1), tip: 'FRED VIXCLS — equity index VIX (risk context only, not a rates print)' },
];

const PRIMARY_CELLS: {
  key: keyof MacroPrimaryPack;
  label: string;
  fmt: (v: number) => string;
  tip: string;
}[] = [
  { key: 'bgcr', label: 'BGCR', fmt: (v) => `${v.toFixed(2)}%`, tip: 'OFR Broad General Collateral Rate (NY Fed repo)' },
  { key: 'tgcr', label: 'TGCR', fmt: (v) => `${v.toFixed(2)}%`, tip: 'OFR Tri-party GCR (NY Fed repo)' },
  { key: 'sofr_ofr', label: 'SOFR·OFR', fmt: (v) => `${v.toFixed(2)}%`, tip: 'SOFR via OFR data API (cross-check FRED SOFR)' },
  { key: 'ecb_dfr', label: 'ECB DFR', fmt: (v) => `${v.toFixed(2)}%`, tip: 'ECB deposit facility rate (primary Europe)' },
];

export function StressStrip({ className }: { className?: string }) {
  const [pack, setPack] = useState<MacroStressPack | null>(null);
  const [primary, setPrimary] = useState<MacroPrimaryPack | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    macrovolApi
      .macroStress()
      .then((d) => {
        if (!cancelled) {
          setPack(d);
          setErr(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setErr(e instanceof Error ? e.message : String(e));
      });
    macrovolApi
      .macroPrimary()
      .then((d) => {
        if (!cancelled) setPrimary(d);
      })
      .catch(() => {
        if (!cancelled) setPrimary(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (err) {
    return (
      <div className={cn('px-2 py-1 font-mono text-type-xs text-muted-foreground', className)}>
        Stress pack: {err}
      </div>
    );
  }

  if (!pack) {
    return (
      <div
        className={cn('flex flex-wrap gap-1 border-b border-border/50 px-1.5 py-1', className)}
        aria-busy="true"
      >
        {CELLS.map((c) => (
          <div key={c.key} className="h-10 w-16 animate-pulse rounded bg-muted/30" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn('border-b border-border/50 px-1.5 py-1.5 space-y-1', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-type-2xs font-semibold uppercase tracking-wider text-muted-foreground">
          Stress · free FRED
        </span>
        <DataBadge source={pack.source || 'FRED'} asOf={pack.as_of} />
        {pack.note ? (
          <span className="text-type-3xs text-muted-foreground truncate max-w-[40rem]" title={pack.note}>
            shared cache · not per visitor
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-1">
        {CELLS.map((c) => {
          const raw = pack[c.key];
          const value = typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
          return (
            <div
              key={c.key}
              title={c.tip}
              className="min-w-[4.5rem] rounded border border-border/50 bg-muted/15 px-2 py-1"
            >
              <div className="text-type-3xs text-muted-foreground">{c.label}</div>
              <div
                className={cn(
                  'text-sm font-semibold tabular-nums',
                  value == null ? 'text-muted-foreground' : 'text-foreground',
                )}
              >
                {value == null ? '—' : c.fmt(value)}
              </div>
            </div>
          );
        })}
      </div>
      {primary && (
        <div className="space-y-1 pt-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-type-2xs font-semibold uppercase tracking-wider text-muted-foreground">
              Primary · OFR + ECB
            </span>
            <DataBadge source={primary.source || 'OFR+ECB'} asOf={primary.as_of} />
            <span
              className="text-type-3xs text-muted-foreground"
              title={primary.note || 'Keyless primary sources — not FRED VIXCLS'}
            >
              keyless · repo / policy
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {PRIMARY_CELLS.map((c) => {
              const raw = primary[c.key];
              const value = typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
              return (
                <div
                  key={c.key}
                  title={c.tip}
                  className="min-w-[4.5rem] rounded border border-border/50 bg-muted/10 px-2 py-1"
                >
                  <div className="text-type-3xs text-muted-foreground">{c.label}</div>
                  <div
                    className={cn(
                      'text-sm font-semibold tabular-nums',
                      value == null ? 'text-muted-foreground' : 'text-foreground',
                    )}
                  >
                    {value == null ? '—' : c.fmt(value)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
