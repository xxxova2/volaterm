/**
 * Shared free-API desk strip — shows the server board (not per-visitor upstream calls).
 * SPY tape from Finnhub + Alpha Vantage (+ TV if available) and free-tier budget meters.
 */
import { useEffect, useState } from 'react';
import {
  fetchDeskPack,
  type DeskPack,
} from '../../lib/data/deskFeedsClient';
import { cn } from '../../lib/utils';

function fmtAge(ms?: number): string {
  if (ms == null || !Number.isFinite(ms)) return '';
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  return `${(ms / 3_600_000).toFixed(1)}h`;
}

function BudgetChip({
  label,
  used,
  cap,
  warnAt = 0.8,
}: {
  label: string;
  used?: number;
  cap?: number;
  warnAt?: number;
}) {
  if (used == null || cap == null || cap <= 0) {
    return (
      <span className="rounded border border-border/60 px-1.5 py-0.5 text-type-2xs text-muted-foreground">
        {label}: —
      </span>
    );
  }
  const pct = used / cap;
  return (
    <span
      className={cn(
        'rounded border px-1.5 py-0.5 font-mono text-type-2xs tabular-nums',
        pct >= warnAt ? 'border-warn/50 text-warn' : 'border-border/60 text-muted-foreground',
      )}
      title={`${label} free-tier usage (shared server budget)`}
    >
      {label} {used}/{cap}
    </span>
  );
}

export function SharedDeskStrip({
  symbol = 'SPY',
  className,
}: {
  symbol?: string;
  className?: string;
}) {
  const [pack, setPack] = useState<DeskPack | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetchDeskPack(symbol)
        .then((d) => {
          if (!cancelled) {
            setPack(d);
            setErr(null);
          }
        })
        .catch((e) => {
          if (!cancelled) setErr(e instanceof Error ? e.message : String(e));
        });
    };
    load();
    // Re-read server board every 60s (does not re-burn AV/TV if still cached)
    const id = window.setInterval(load, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [symbol]);

  const fh = pack?.finnhub_quote;
  const av = pack?.alphavantage_quote;
  const tv = pack?.tradingview;
  const bars = pack?.alphavantage_daily?.bars || [];
  const lastBars = bars.slice(-16);
  const maxC = Math.max(...lastBars.map((b) => b.close || 0), 0.001);
  const budgets = pack?.budgets;

  const primary =
    fh?.price != null && fh.price > 0
      ? { price: fh.price, chg: fh.change_pct, src: 'Finnhub', age: fh.ageMs }
      : av?.price != null && av.price > 0
        ? { price: av.price, chg: av.change_pct, src: 'Alpha Vantage', age: av.ageMs }
        : tv?.price != null && tv.price > 0
          ? { price: tv.price, chg: tv.change_pct, src: 'TradingView', age: undefined }
          : null;

  return (
    <div
      className={cn(
        'rounded border border-border/70 bg-card/50 px-2 py-1.5 font-mono',
        className,
      )}
    >
      <div className="mb-1 flex flex-wrap items-center gap-1.5">
        <span className="text-type-2xs font-bold tracking-wide text-foreground">
          SHARED DESK
        </span>
        <span className="text-type-2xs text-muted-foreground">
          {symbol} · one board for all visitors · free APIs budgeted on server
        </span>
      </div>

      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        <div className="rounded border border-border bg-background/50 px-2 py-1">
          <div className="text-type-2xs text-muted-foreground">{symbol} last</div>
          <div className="text-lg font-bold tabular-nums text-foreground">
            {primary ? primary.price.toFixed(2) : '—'}
          </div>
          {primary?.chg != null && (
            <div
              className={cn(
                'text-type-2xs tabular-nums',
                primary.chg >= 0 ? 'text-up' : 'text-down',
              )}
            >
              {primary.chg >= 0 ? '+' : ''}
              {primary.chg.toFixed(2)}%
              <span className="ml-1 text-muted-foreground">
                {primary.src}
                {primary.age != null ? ` · ${fmtAge(primary.age)}` : ''}
              </span>
            </div>
          )}
        </div>

        <div className="rounded border border-border bg-background/50 px-2 py-1">
          <div className="text-type-2xs text-muted-foreground">Finnhub</div>
          <div className="text-sm font-semibold tabular-nums">
            {fh?.price != null ? fh.price.toFixed(2) : '—'}
          </div>
          <div className="text-type-2xs text-muted-foreground">
            {fh?.error ? String(fh.error).slice(0, 24) : fh?.fromCache ? 'cache' : 'live fill'}
          </div>
        </div>

        <div className="rounded border border-border bg-background/50 px-2 py-1">
          <div className="text-type-2xs text-muted-foreground">Alpha Vantage</div>
          <div className="text-sm font-semibold tabular-nums">
            {av?.price != null ? av.price.toFixed(2) : '—'}
          </div>
          <div className="text-type-2xs text-muted-foreground">
            {av?.latest_trading_day || (av?.error ? String(av.error).slice(0, 24) : '—')}
          </div>
        </div>

        <div className="rounded border border-border bg-background/50 px-2 py-1">
          <div className="text-type-2xs text-muted-foreground">TradingView</div>
          <div className="text-sm font-semibold tabular-nums">
            {tv?.price != null ? tv.price.toFixed(2) : '—'}
          </div>
          <div className="truncate text-type-2xs text-muted-foreground" title={tv?.note || ''}>
            {tv?.error ? 'no endpoint / budget' : tv?.source ? 'ok' : '—'}
          </div>
        </div>
      </div>

      {lastBars.length > 2 && (
        <div className="mt-1.5">
          <div className="mb-0.5 text-type-2xs text-muted-foreground">
            SPY daily (Alpha Vantage shared) · {bars.length} bars
          </div>
          <div className="flex h-8 items-end gap-px">
            {lastBars.map((b, i) => (
              <div
                key={b.date || i}
                className="min-w-[3px] flex-1 rounded-t bg-primary/70"
                style={{ height: `${Math.max(8, ((b.close || 0) / maxC) * 100)}%` }}
                title={`${b.date}: ${b.close}`}
              />
            ))}
          </div>
        </div>
      )}

      <div className="mt-1.5 flex flex-wrap gap-1">
        <BudgetChip
          label="AV day"
          used={budgets?.alphavantage?.used}
          cap={budgets?.alphavantage?.capDaily}
        />
        <BudgetChip
          label="FH day"
          used={budgets?.finnhub?.used}
          cap={budgets?.finnhub?.capDailySoft}
          warnAt={0.5}
        />
        <BudgetChip
          label="TV mo"
          used={budgets?.tradingview?.usedMonth}
          cap={budgets?.tradingview?.capMonthly}
        />
      </div>

      {(err || pack?.note) && (
        <p className="mt-1 text-type-2xs text-muted-foreground">
          {err || pack?.note}
        </p>
      )}
    </div>
  );
}
