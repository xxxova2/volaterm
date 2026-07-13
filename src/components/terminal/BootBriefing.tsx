import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  macrovolApi,
  type RatesSummary,
  type MacroSummary,
  type FxBoardData,
  type TreasuryAuctionsData,
  type CryptoSpotData,
} from '../../lib/macrovol/api';
import { cn } from '../../lib/utils';
import { BRAND } from '../../config/brand';
import { BOOT_EDUCATION } from '../../config/bootEducation';

const BOOT_MS = 30_000;
const EDU_ROTATE_MS = 8_000;

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
 * First-open screen: meme + founder + education while rates load fast
 * and option chains load in the background (up to ~30s).
 */
export function BootBriefing({ heavyReady, onEnter }: BootBriefingProps) {
  const [rates, setRates] = useState<RatesSummary | null>(null);
  const [macro, setMacro] = useState<MacroSummary | null>(null);
  const [fx, setFx] = useState<FxBoardData | null>(null);
  const [auctions, setAuctions] = useState<TreasuryAuctionsData | null>(null);
  const [crypto, setCrypto] = useState<CryptoSpotData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [loadingBrief, setLoadingBrief] = useState(true);
  const [eduIdx, setEduIdx] = useState(0);
  const entered = useRef(false);

  const enter = useCallback(() => {
    if (entered.current) return;
    entered.current = true;
    onEnter();
  }, [onEnter]);

  // Pull lightweight rates + macro + free APIs ASAP.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [r, m, f, a, c] = await Promise.all([
          macrovolApi.ratesSummary().catch(() => null),
          macrovolApi.macroSummary().catch(() => null),
          macrovolApi.ratesFx().catch(() => null),
          macrovolApi.ratesAuctions(8).catch(() => null),
          macrovolApi.cryptoSpot().catch(() => null),
        ]);
        if (cancelled) return;
        setRates(r);
        setMacro(m);
        setFx(f);
        setAuctions(a);
        setCrypto(c);
        if (!r && !m && !f) setErr('Rates feed warming up — terminal will open shortly.');
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Briefing unavailable');
      } finally {
        if (!cancelled) setLoadingBrief(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Rotate education cards while loading.
  useEffect(() => {
    const id = window.setInterval(() => {
      setEduIdx((i) => (i + 1) % BOOT_EDUCATION.length);
    }, EDU_ROTATE_MS);
    return () => window.clearInterval(id);
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

  const usdjpy = fx?.pairs?.find((p) => p.pair === 'USDJPY')?.rate;
  const eurusd = fx?.pairs?.find((p) => p.pair === 'EURUSD')?.rate;
  const nextAuct = auctions?.next_coupon || auctions?.next;
  const btc = crypto?.btc;
  const btcChg = btc?.change_24h_pct;

  const cards: { label: string; value: string; sub?: string }[] = [
    { label: 'SOFR', value: fmtPct(rates?.sofr), sub: 'overnight funding' },
    { label: 'EFFR', value: fmtPct(rates?.effr), sub: 'fed funds effective' },
    { label: 'UST 2Y', value: fmtPct(rates?.usy2), sub: 'DGS2' },
    { label: 'UST 10Y', value: fmtPct(rates?.usy10), sub: 'DGS10' },
    { label: '2s10s', value: fmtBpsFromPp(rates?.spread_2s10s), sub: 'curve steepness' },
    { label: '3m10y', value: fmtBpsFromPp(rates?.spread_3m10y), sub: 'T10Y3M' },
    { label: 'USDJPY', value: usdjpy != null ? usdjpy.toFixed(2) : '—', sub: 'Frankfurter / ECB' },
    { label: 'EURUSD', value: eurusd != null ? eurusd.toFixed(4) : '—', sub: 'Frankfurter / ECB' },
    {
      label: 'Next auction',
      value: nextAuct?.auction_date
        ? `${nextAuct.security_type || ''} ${nextAuct.security_term || ''}`.trim() || nextAuct.auction_date
        : '—',
      sub: nextAuct?.auction_date
        ? `${nextAuct.auction_date}${nextAuct.offering_label ? ` · ${nextAuct.offering_label}` : ''}`
        : 'FiscalData',
    },
    {
      label: 'BTC',
      value: btc?.spot_usd != null
        ? (btc.spot_usd >= 1000 ? `$${(btc.spot_usd / 1000).toFixed(1)}k` : `$${btc.spot_usd.toFixed(0)}`)
        : '—',
      sub: btcChg != null ? `24h ${btcChg >= 0 ? '+' : ''}${btcChg.toFixed(1)}% · CoinGecko` : 'CoinGecko',
    },
    { label: 'CPI YoY', value: fmtPct(macro?.cpi_yoy), sub: 'inflation' },
    { label: 'Core PCE', value: fmtPct(macro?.core_pce_yoy), sub: 'Fed preferred' },
    { label: 'Unemployment', value: fmtPct(macro?.unemployment, 1), sub: 'U-3' },
    { label: 'NFP', value: fmtN(macro?.nfp_mom, 0, 'k'), sub: 'jobs mom' },
  ];

  const edu = BOOT_EDUCATION[eduIdx] ?? BOOT_EDUCATION[0]!;
  const topicLabel = useMemo(() => {
    switch (edu.topic) {
      case 'greeks': return 'GREEKS';
      case 'positioning': return 'POSITIONING';
      case 'rates': return 'RATES / SOFR';
      default: return 'MARKET';
    }
  }, [edu.topic]);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-[#050505] text-foreground"
      role="dialog"
      aria-label="Market briefing while terminal loads"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#0f172a_0%,_#050505_55%)]" />

      <header className="relative flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
        <div>
          <div className="font-mono text-type-xs uppercase tracking-[0.2em] text-muted-foreground">
            {BRAND.productName} · boot
          </div>
          <h1 className="text-type-lg font-semibold tracking-tight">
            Markets briefing
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={BRAND.founderXUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center gap-2 rounded border border-border/70 bg-card/60 px-2.5 py-1.5 font-mono text-type-2xs text-muted-foreground hover:border-border hover:text-foreground sm:flex"
          >
            <span className="text-muted-foreground/80">{BRAND.founderRole}</span>
            <span className="text-foreground">{BRAND.founderXHandle}</span>
            <span className="text-muted-foreground">on X</span>
          </a>
          <button
            type="button"
            onClick={enter}
            className="rounded border border-border bg-card px-3 py-1.5 font-mono text-type-xs uppercase tracking-wider text-foreground hover:bg-muted"
          >
            Enter terminal
          </button>
        </div>
      </header>

      <main className="relative flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 md:p-6">
        {/* Top: founder + rotating education (compact) */}
        <section className="grid shrink-0 grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="rounded border border-border/70 bg-card/70 px-3 py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-mono text-type-2xs uppercase tracking-wider text-muted-foreground">
                  Built by
                </div>
                <div className="mt-0.5 font-mono text-type-sm text-foreground">
                  {BRAND.founderName}{' '}
                  <span className="text-muted-foreground">· {BRAND.founderRole}</span>
                </div>
              </div>
              <a
                href={BRAND.founderXUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 font-mono text-type-xs text-sky-300 hover:bg-sky-500/20"
              >
                Follow {BRAND.founderXHandle}
              </a>
            </div>
            <p className="mt-2 max-w-xl text-type-xs text-muted-foreground">
              {BRAND.productName} — {BRAND.tagline}. Free APIs load on a shared server budget
              (not per visitor burst). Chains update on the desk cadence while you read.
            </p>
          </div>

          <div
            className="flex min-h-[120px] flex-col rounded border border-border/70 bg-card/80 px-3 py-2.5"
            aria-live="polite"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-type-2xs uppercase tracking-wider text-amber-400/90">
                While you wait · {topicLabel}
              </span>
              <span className="font-mono text-type-2xs text-muted-foreground">
                {eduIdx + 1}/{BOOT_EDUCATION.length}
              </span>
            </div>
            <h2 className="mt-1 font-mono text-type-sm font-semibold text-foreground">
              {edu.title}
            </h2>
            <p className="mt-1.5 flex-1 text-type-xs leading-relaxed text-muted-foreground">
              {edu.body}
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-type-2xs text-muted-foreground/80">
                Source: {edu.source} · educational only
              </span>
              <div className="flex gap-1">
                {BOOT_EDUCATION.map((c, i) => (
                  <button
                    key={c.id}
                    type="button"
                    aria-label={`Show tip ${i + 1}`}
                    onClick={() => setEduIdx(i)}
                    className={cn(
                      'h-1.5 w-1.5 rounded-full transition-colors',
                      i === eduIdx ? 'bg-amber-400' : 'bg-muted-foreground/40 hover:bg-muted-foreground/70',
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Meme: ~42% of viewport height — fills empty lower page */}
        <figure className="flex h-[42vh] min-h-[220px] max-h-[48vh] shrink-0 flex-col overflow-hidden rounded border border-border/70 bg-card/50">
          <img
            src={BRAND.bootMemeSrc}
            alt={BRAND.bootMemeAlt}
            className="h-full min-h-0 w-full flex-1 object-contain bg-white"
            width={640}
            height={480}
            decoding="async"
          />
          <figcaption className="shrink-0 border-t border-border/60 px-2 py-1.5 font-mono text-type-2xs text-muted-foreground">
            {BRAND.bootMemeAlt}
          </figcaption>
        </figure>

        <p className="max-w-2xl shrink-0 text-type-sm text-muted-foreground">
          Basics from FRED · Frankfurter FX · FiscalData auctions · CoinGecko while option chains load.
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
          <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-type-2xs text-muted-foreground/80">
            <span>
              Source: MacroVol · FRED · Frankfurter · FiscalData · CoinGecko
              {rates?.as_of ? ` · as of ${new Date(rates.as_of).toLocaleString()}` : ''}
            </span>
            <a
              href={BRAND.founderXUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-400/90 hover:text-sky-300 sm:hidden"
            >
              {BRAND.founderXHandle}
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
