import { useEffect, useState, useCallback, useRef } from 'react';
import { macrovolApi, type RatesSummary, type MacroSummary } from '../../lib/macrovol/api';
import { cn } from '../../lib/utils';

const BOOT_MS = 30_000;

function fmtPct(v: number | null | undefined, digits = 2): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return `${v.toFixed(digits)}%`;
}

function fmtBpsFromPp(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—';
  const bps = v * 100;
  return `${bps >= 0 ? '+' : ''}${bps.toFixed(0)} bp`;
}

function fmtN(v: number | null | undefined, digits = 1, suffix = ''): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return `${v.toFixed(digits)}${suffix}`;
}

export type BootBriefingProps = {
  /** True when heavy desks (chain / vol) finished or timed out. */
  heavyReady: boolean;
  onEnter: () => void;
};

/**
 * First-open screen: show basic rates/macro immediately while chain APIs load
 * in the background (up to ~30s, or sooner when heavy data is ready).
 */
export function BootBriefing({ heavyReady, onEnter }: BootBriefingProps) {
  const [rates, setRates] = useState<RatesSummary | null>(null);
  const [macro, setMacro] = useState<MacroSummary | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [loadingBrief, setLoadingBrief] = useState(true);
  const entered = useRef(false);

  const enter = useCallback(() => {
    if (entered.current) return;
    entered.current = true;
    onEnter();
  }, [onEnter]);

  // Pull lightweight rates + macro (shared backend cache) ASAP.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [r, m] = await Promise.all([
          macrovolApi.ratesSummary().catch(() => null),
          macrovolApi.macroSummary().catch(() => null),
        ]);
        if (cancelled) return;
        setRates(r);
        setMacro(m);
        if (!r && !m) setErr('Rates feed warming up — terminal will open shortly.');
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Briefing unavailable');
      } finally {
        if (!cancelled) setLoadingBrief(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // 30s progress clock; auto-enter when time's up or heavy path is ready.
  useEffect(() => {
    const t0 = Date.now();
    const id = window.setInterval(() => {
      const ms = Date.now() - t0;
      setElapsed(ms);
      if (ms >= BOOT_MS || heavyReady) {
        window.clearInterval(id);
        // Small delay so user can read last numbers if heavy finished early.
        if (heavyReady && ms < 4_000) {
          window.setTimeout(enter, Math.max(0, 4_000 - ms));
        } else {
          enter();
        }
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [heavyReady, enter]);

  const progress = Math.min(100, (elapsed / BOOT_MS) * 100);
  const secsLeft = Math.max(0, Math.ceil((BOOT_MS - elapsed) / 1000));

  const cards: { label: string; value: string; sub?: string }[] = [
    { label: 'SOFR', value: fmtPct(rates?.sofr), sub: 'overnight funding' },
    { label: 'EFFR', value: fmtPct(rates?.effr), sub: 'fed funds effective' },
    { label: 'UST 2Y', value: fmtPct(rates?.usy2), sub: 'DGS2' },
    { label: 'UST 10Y', value: fmtPct(rates?.usy10), sub: 'DGS10' },
    { label: '2s10s', value: fmtBpsFromPp(rates?.spread_2s10s), sub: 'curve steepness' },
    { label: '3m10y', value: fmtBpsFromPp(rates?.spread_3m10y), sub: 'T10Y3M' },
    { label: 'CPI YoY', value: fmtPct(macro?.cpi_yoy), sub: 'inflation' },
    { label: 'Core PCE', value: fmtPct(macro?.core_pce_yoy), sub: 'Fed preferred' },
    { label: 'Unemployment', value: fmtPct(macro?.unemployment, 1), sub: 'U-3' },
    { label: 'NFP', value: fmtN(macro?.nfp_mom, 0, 'k'), sub: 'jobs mom' },
  ];

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-[#050505] text-foreground"
      role="dialog"
      aria-label="Market briefing while terminal loads"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#0f172a_0%,_#050505_55%)]" />

      <header className="relative flex items-center justify-between border-b border-border/60 px-4 py-3">
        <div>
          <div className="font-mono text-type-xs uppercase tracking-[0.2em] text-muted-foreground">
            VOLATERM · boot
          </div>
          <h1 className="text-type-lg font-semibold tracking-tight">
            Markets briefing
          </h1>
        </div>
        <button
          type="button"
          onClick={enter}
          className="rounded border border-border bg-card px-3 py-1.5 font-mono text-type-xs uppercase tracking-wider text-foreground hover:bg-muted"
        >
          Enter terminal
        </button>
      </header>

      <main className="relative flex flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-6">
        <p className="max-w-2xl text-type-sm text-muted-foreground">
          Basics from FRED / macro feeds while option chains and surfaces load in the background.
          You are not blocked on the heavy APIs.
        </p>

        {err && (
          <div className="rounded border border-warn/40 bg-warn/10 px-3 py-2 font-mono text-type-xs text-warn">
            {err}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {cards.map((c) => (
            <div
              key={c.label}
              className={cn(
                'rounded border border-border/70 bg-card/80 px-3 py-2.5',
                loadingBrief && 'animate-pulse',
              )}
            >
              <div className="font-mono text-type-2xs uppercase tracking-wider text-muted-foreground">
                {c.label}
              </div>
              <div className="mt-1 font-mono text-type-xl tabular-nums tracking-tight">
                {c.value}
              </div>
              {c.sub && (
                <div className="mt-0.5 text-type-2xs text-muted-foreground">{c.sub}</div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-auto space-y-2 pt-4">
          <div className="flex items-center justify-between font-mono text-type-2xs text-muted-foreground">
            <span>
              {heavyReady
                ? 'Live desks ready — opening terminal…'
                : 'Loading option chain & surfaces in background…'}
            </span>
            <span>{heavyReady ? 'ready' : `${secsLeft}s`}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                'h-full rounded-full transition-[width] duration-200',
                heavyReady ? 'bg-up' : 'bg-sky-500',
              )}
              style={{ width: `${heavyReady ? 100 : progress}%` }}
            />
          </div>
          <div className="font-mono text-type-2xs text-muted-foreground/80">
            Source: MacroVol · FRED
            {rates?.as_of ? ` · as of ${new Date(rates.as_of).toLocaleString()}` : ''}
          </div>
        </div>
      </main>
    </div>
  );
}
