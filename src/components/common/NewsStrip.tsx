/**
 * Finnhub news + earnings chip for Home desk.
 */
import { useEffect, useState } from 'react';
import {
  fetchFinnhubEarnings,
  fetchFinnhubNews,
  type FinnhubEarningsData,
  type FinnhubNewsItem,
} from '../../lib/data/finnhubClient';
import { macrovolApi, type SecContextData } from '../../lib/macrovol/api';
import { cn } from '../../lib/utils';

function fmtEpoch(ts: number | null | undefined): string {
  if (ts == null || !Number.isFinite(ts)) return '';
  try {
    return new Date(ts * 1000).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export function NewsStrip({ symbol, className }: { symbol: string; className?: string }) {
  const [items, setItems] = useState<FinnhubNewsItem[]>([]);
  const [earnings, setEarnings] = useState<FinnhubEarningsData | null>(null);
  const [sec, setSec] = useState<SecContextData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    const sym = symbol.toUpperCase();
    Promise.allSettled([
      fetchFinnhubNews(sym, 10),
      fetchFinnhubEarnings(sym),
      macrovolApi.secContext(sym, 4).catch(() => null),
    ]).then(([n, e, s]) => {
      if (cancelled) return;
      if (n.status === 'fulfilled') {
        setItems(n.value.items || []);
        if (n.value.error && n.value.error !== 'empty') setErr(String(n.value.error));
      } else {
        setItems([]);
        setErr('news unavailable');
      }
      if (e.status === 'fulfilled') setEarnings(e.value);
      else setEarnings(null);
      if (s.status === 'fulfilled' && s.value) setSec(s.value as SecContextData);
      else setSec(null);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [symbol]);

  const nextEarn = earnings?.next;
  const latest8k = sec?.filings?.find((f) => f.form.startsWith('8-K')) ?? sec?.latest;

  return (
    <div className={cn('rounded border border-border bg-card/60 font-mono', className)}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border/60 px-2 py-1">
        <span className="text-type-xs font-semibold text-foreground">News · Events</span>
        <span className="text-type-2xs text-muted-foreground">Finnhub · SEC EDGAR</span>
        {nextEarn?.date && (
          <span className="rounded border border-info/40 bg-info/10 px-1.5 py-0.5 text-type-2xs text-info" title={earnings?.note || 'Next earnings'}>
            Next report {nextEarn.date}
            {nextEarn.hour ? ` · ${nextEarn.hour}` : ''}
            {nextEarn.eps_estimate != null ? ` · est ${nextEarn.eps_estimate}` : ''}
          </span>
        )}
        {latest8k && (
          <span className="text-type-2xs text-muted-foreground" title={latest8k.description || latest8k.form}>
            SEC {latest8k.form} {latest8k.filing_date}
            {latest8k.url && (
              <a
                href={latest8k.url}
                target="_blank"
                rel="noreferrer"
                className="ml-1 text-info hover:underline"
              >
                open
              </a>
            )}
          </span>
        )}
        {loading && <span className="text-type-2xs text-muted-foreground">…</span>}
        {err && !items.length && (
          <span className="text-type-2xs text-muted-foreground">
            {err === 'no_api_key' ? 'Set FINNHUB_API_KEY on server' : err}
          </span>
        )}
      </div>
      <ul className="max-h-28 overflow-y-auto divide-y divide-border/40">
        {items.length === 0 && !loading ? (
          <li className="px-2 py-1.5 text-type-2xs text-muted-foreground">
            No headlines (fail-closed — no demo news).
          </li>
        ) : (
          items.map((it) => (
            <li key={String(it.id)} className="px-2 py-1 text-type-2xs leading-snug">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-muted-foreground shrink-0">
                  {it.related || symbol}
                  {it.datetime ? ` · ${fmtEpoch(it.datetime)}` : ''}
                </span>
                {it.source && <span className="text-muted-foreground/80">{it.source}</span>}
              </div>
              {it.url ? (
                <a
                  href={it.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-foreground hover:text-info hover:underline"
                >
                  {it.headline}
                </a>
              ) : (
                <span className="text-foreground">{it.headline}</span>
              )}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
