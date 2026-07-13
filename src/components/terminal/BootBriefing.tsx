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

export type BootBriefingProps = {
  /** True when heavy desks (chain / vol) finished or timed out. */
  heavyReady: boolean;
  onEnter: () => void;
};

/** Free, shared upstream APIs that back the briefing. Honest status only. */
type BriefApiId = 'macrovol-rates' | 'fmp-macro' | 'fx' | 'auctions' | 'crypto-spot';
type BriefStatus = 'pending' | 'ok' | 'fail';

const BRIEF_APIS: { id: BriefApiId; label: string; source: string }[] = [
  { id: 'macrovol-rates', label: 'MacroVol rates', source: 'MacroVol' },
  { id: 'fmp-macro', label: 'US macro', source: 'FRED' },
  { id: 'fx', label: 'FX', source: 'Frankfurter' },
  { id: 'auctions', label: 'Auctions', source: 'FiscalData' },
  { id: 'crypto-spot', label: 'Crypto spot', source: 'CoinGecko' },
];

/** Live decks that load in the background (not part of the brief fetch). */
const HEAVY_APIS: { label: string; source: string }[] = [
  { label: 'Option chain / surface', source: 'yfinance · FMP · Deribit' },
];

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
  const [apiStatus, setApiStatus] = useState<Record<BriefApiId, BriefStatus>>({
    'macrovol-rates': 'pending',
    'fmp-macro': 'pending',
    'fx': 'pending',
    'auctions': 'pending',
    'crypto-spot': 'pending',
  });
  const entered = useRef(false);

  const enter = useCallback(() => {
    if (entered.current) return;
    entered.current = true;
    onEnter();
  }, [onEnter]);

  // Pull lightweight rates + macro + free APIs ASAP; track honest status.
  useEffect(() => {
    let cancelled = false;
    const set = (id: BriefApiId, s: BriefStatus) =>
      setApiStatus((prev) => (prev[id] === s ? prev : { ...prev, [id]: s }));

    (async () => {
      try {
        const [r, m, f, a, c] = await Promise.all([
          macrovolApi.ratesSummary().then((v) => { set('macrovol-rates', 'ok'); return v; }).catch(() => { set('macrovol-rates', 'fail'); return null; }),
          macrovolApi.macroSummary().then((v) => { set('fmp-macro', 'ok'); return v; }).catch(() => { set('fmp-macro', 'fail'); return null; }),
          macrovolApi.ratesFx().then((v) => { set('fx', 'ok'); return v; }).catch(() => { set('fx', 'fail'); return null; }),
          macrovolApi.ratesAuctions(8).then((v) => { set('auctions', 'ok'); return v; }).catch(() => { set('auctions', 'fail'); return null; }),
          macrovolApi.cryptoSpot().then((v) => { set('crypto-spot', 'ok'); return v; }).catch(() => { set('crypto-spot', 'fail'); return null; }),
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
  const btc = crypto?.btc;
  const btcChg = btc?.change_24h_pct;
  const nextAuct = auctions?.next_coupon || auctions?.next;

  const cards: { label: string; value: string; sub?: string }[] = [
    { label: 'SOFR', value: fmtPct(rates?.sofr), sub: 'overnight funding' },
    { label: 'UST 10Y', value: fmtPct(rates?.usy10), sub: 'DGS10' },
    { label: '2s10s', value: fmtBpsFromPp(rates?.spread_2s10s), sub: 'curve steepness' },
    { label: 'USDJPY', value: usdjpy != null ? usdjpy.toFixed(2) : '—', sub: 'Frankfurter / ECB' },
    {
      label: 'BTC',
      value: btc?.spot_usd != null
        ? (btc.spot_usd >= 1000 ? `$${(btc.spot_usd / 1000).toFixed(1)}k` : `$${btc.spot_usd.toFixed(0)}`)
        : '—',
      sub: btcChg != null ? `24h ${btcChg >= 0 ? '+' : ''}${btcChg.toFixed(1)}% · CoinGecko` : 'CoinGecko',
    },
    {
      label: 'Auction',
      value: nextAuct?.security_type
        ? String(nextAuct.security_type).slice(0, 12)
        : fmtPct(macro?.cpi_yoy),
      sub: nextAuct?.auction_date
        ? `next ${nextAuct.auction_date}`
        : 'CPI YoY (fallback)',
    },
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
      className="fixed inset-0 z-[100] flex h-dvh w-full flex-col overflow-hidden bg-[#050505] text-foreground"
      role="dialog"
      aria-label="LOADING SCREEN — market briefing while terminal loads"
      aria-busy={!heavyReady}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#0f172a_0%,_#050505_55%)]" />

      {/* Sticky top banner — impossible to miss this is a loading overlay */}
      <div className="relative z-10 flex shrink-0 items-center justify-between gap-2 border-b border-amber-400/60 bg-amber-500 px-2 py-1 font-mono text-type-xs font-bold uppercase tracking-[0.14em] text-black sm:px-3">
        <span className="truncate">Loading screen · not the app yet · do not close this tab</span>
        <span className="shrink-0 tabular-nums">{Math.round(progress)}% · {secsLeft}s</span>
      </div>

      <header className="relative flex shrink-0 flex-col gap-1.5 border-b border-amber-500/40 bg-amber-500/10 px-2 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-3">
        <div>
          <div className="font-mono text-type-xs font-bold uppercase tracking-[0.18em] text-amber-300">
            {BRAND.productName} · LOADING SCREEN — not the trading terminal yet
          </div>
          <h1 className="mt-0.5 flex flex-wrap items-center gap-2 text-type-lg font-semibold tracking-tight">
            Warming free APIs
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-type-2xs font-normal uppercase tracking-wider',
                loadingBrief
                  ? 'border-sky-500/40 bg-sky-500/10 text-sky-300'
                  : 'border-up/40 bg-up/10 text-up',
              )}
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  loadingBrief ? 'animate-pulse bg-sky-400' : 'bg-up',
                )}
              />
              {loadingBrief ? 'Loading APIs…' : heavyReady ? 'Ready — Enter' : 'Chain still loading…'}
            </span>
            <span className="font-mono text-type-xs font-normal text-muted-foreground">
              auto-enter in {secsLeft}s · or press Enter terminal
            </span>
          </h1>
          <p className="mt-1 max-w-2xl font-mono text-type-2xs text-muted-foreground">
            This overlay closes when data is ready. The real desks (Vol · Flow · Trade · Crypto · Rates) open after Enter.
            Do not close the tab — you are not stuck on a dead page.
          </p>
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
            className="rounded border border-amber-400/60 bg-amber-500/20 px-3 py-1.5 font-mono text-type-xs uppercase tracking-wider text-amber-100 hover:bg-amber-500/30"
          >
            Enter terminal
          </button>
        </div>
        {/* Full-width loading line — client must see progress, not a static fake app */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-border/40" aria-hidden>
          <div
            className="h-full bg-amber-400 transition-[width] duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <main className="relative flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2 sm:p-3">
        {/* Compact mid: founder + rotating education — edge-to-edge, no large page margins */}
        <section className="grid shrink-0 grid-cols-1 gap-2 lg:grid-cols-2">
          <div className="rounded border border-border/70 bg-card/70 px-3 py-2">
            <div className="font-mono text-type-2xs uppercase tracking-wider text-muted-foreground">
              Built by
            </div>
            <div className="mt-0.5 font-mono text-type-sm text-foreground">
              {BRAND.founderName}{' '}
              <span className="text-muted-foreground">· {BRAND.founderRole}</span>
            </div>
            <p className="mt-2 max-w-xl text-type-xs text-muted-foreground">
              {BRAND.productName} — {BRAND.tagline}. Free shared APIs (not per-visitor burst);
              chains load on the desk cadence. You are never blocked on the heavy APIs.
            </p>
            <a
              href={BRAND.founderXUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2.5 hidden items-center gap-2 rounded border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 font-mono text-type-xs text-sky-300 hover:bg-sky-500/20 sm:inline-flex"
            >
              Follow {BRAND.founderXHandle}
            </a>
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

        {/* API checklist + progress — honest status from the brief fetch + heavy decks */}
        <section className="shrink-0 rounded border border-border/70 bg-card/50 px-3 py-2.5">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="font-mono text-type-2xs uppercase tracking-wider text-muted-foreground">
              API boot status · free shared APIs (no fake speeds)
            </span>
            <span className="font-mono text-type-2xs text-muted-foreground">
              {BRIEF_APIS.filter((a) => apiStatus[a.id] === 'ok').length}/{BRIEF_APIS.length} brief · heavy {heavyReady ? 'ready' : 'loading'}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {BRIEF_APIS.map((a) => {
              const st = apiStatus[a.id];
              return (
                <span
                  key={a.id}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded border px-2 py-0.5 font-mono text-type-2xs',
                    st === 'ok' && 'border-up/40 bg-up/10 text-up',
                    st === 'fail' && 'border-down/40 bg-down/10 text-down',
                    st === 'pending' && 'border-border/70 bg-card/60 text-muted-foreground',
                  )}
                >
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      st === 'ok' && 'bg-up',
                      st === 'fail' && 'bg-down',
                      st === 'pending' && 'animate-pulse bg-muted-foreground/60',
                    )}
                  />
                  {a.label}
                  <span className="text-muted-foreground/70">{a.source}</span>
                </span>
              );
            })}
            {HEAVY_APIS.map((a) => (
              <span
                key={a.label}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded border px-2 py-0.5 font-mono text-type-2xs',
                  heavyReady
                    ? 'border-up/40 bg-up/10 text-up'
                    : 'border-amber-500/40 bg-amber-500/10 text-amber-400/90',
                )}
              >
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    heavyReady ? 'bg-up' : 'animate-pulse bg-amber-400',
                  )}
                />
                {a.label}
                <span className="text-muted-foreground/70">{a.source}</span>
              </span>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
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

        {err && (
          <div className="shrink-0 rounded border border-warn/40 bg-warn/10 px-3 py-2 font-mono text-type-xs text-warn">
            {err}
          </div>
        )}

        {/* LOWER hero fills remaining viewport — no large empty margins */}
        <figure className="mt-auto flex min-h-[28vh] flex-1 flex-col overflow-hidden rounded border border-border/70 bg-card/50">
          <img
            src={BRAND.bootMemeSrc}
            alt={BRAND.bootMemeAlt}
            className="h-full min-h-0 w-full flex-1 object-cover object-center bg-white sm:object-contain"
            width={640}
            height={480}
            decoding="async"
          />
          <figcaption className="shrink-0 border-t border-border/60 px-2 py-1 font-mono text-type-2xs text-muted-foreground">
            {BRAND.bootMemeAlt}
          </figcaption>
        </figure>

        <div className="flex shrink-0 items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-mono text-type-2xs text-muted-foreground">
            <span>Enter opens the Vol desk — no auto-navigation off-app.</span>
          </div>
          <a
            href={BRAND.founderXUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded border border-sky-500/50 bg-sky-500/15 px-4 py-2 font-mono text-type-sm font-semibold text-sky-200 hover:bg-sky-500/25"
          >
            Follow {BRAND.founderXHandle} on X
          </a>
        </div>
      </main>

      {/* Fixed bottom progress — always visible while scrolling the meme */}
      <div
        className="relative z-10 shrink-0 border-t border-amber-400/50 bg-[#0a0a0a] px-3 py-2"
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Terminal load progress"
      >
        <div className="mb-1 flex items-center justify-between font-mono text-type-2xs uppercase tracking-wider text-amber-300">
          <span className="animate-pulse font-bold">
            {heavyReady ? 'Ready — Enter terminal' : 'Loading APIs + option chain…'}
          </span>
          <span className="tabular-nums text-amber-100">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-border/50">
          <div
            className="h-full rounded-full bg-amber-400 transition-[width] duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
