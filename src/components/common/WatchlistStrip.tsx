/**
 * Multi-symbol watchlist — last-seen ATM IV / GEX / IV rank from active desk visits.
 */
import { useEffect, useState } from 'react';
import { useTerminalStore } from '../../store/terminalStore';
import { dealerExposure } from '../../lib/options/analytics';
import {
  addToWatchlist,
  getWatchMetrics,
  loadWatchlist,
  recordWatchMetrics,
  removeFromWatchlist,
  type WatchMetrics,
} from '../../lib/market/watchlist';
import { fmtCompact, fmtPct, fmtPrice } from '../../lib/format';
import { cn } from '../../lib/utils';

export function WatchlistStrip({
  className,
  /** When false, display only — no recordWatchMetrics / auto-pin (Home when shell owns strip). */
  recordMetrics = true,
  /** Single-line tape for shell chrome (under tabs). */
  compact = false,
}: {
  className?: string;
  recordMetrics?: boolean;
  compact?: boolean;
}) {
  const symbol = useTerminalStore((s) => s.symbol);
  const snapshot = useTerminalStore((s) => s.snapshot);
  const setSymbol = useTerminalStore((s) => s.setSymbol);
  const [list, setList] = useState<string[]>(() => loadWatchlist());
  const [rows, setRows] = useState<WatchMetrics[]>([]);

  // Record metrics for active symbol when chain is live
  useEffect(() => {
    if (!recordMetrics || !snapshot || !symbol) return;
    const front = snapshot.expiries[0];
    const d = dealerExposure(snapshot);
    recordWatchMetrics({
      symbol,
      spot: snapshot.spot,
      atmIV: front?.atmIV ?? null,
      totalGEX: d.totalGEX,
      gammaFlip: d.gammaFlip,
    });
    // Ensure active symbol is on the list
    setList((prev) => {
      if (prev.includes(symbol.toUpperCase())) return prev;
      return addToWatchlist(symbol);
    });
    setRows(getWatchMetrics(loadWatchlist()));
  }, [snapshot, symbol, recordMetrics]);

  useEffect(() => {
    setRows(getWatchMetrics(list));
  }, [list]);

  if (compact) {
    return (
      <div
        className={cn(
          'flex min-h-[1.35rem] items-center gap-1 overflow-x-auto scrollbar-none font-mono',
          className,
        )}
      >
        <span className="term-code shrink-0 text-type-2xs">WL</span>
        <button
          type="button"
          className="shrink-0 text-type-2xs text-muted-foreground hover:text-primary"
          onClick={() => setList(addToWatchlist(symbol))}
          title="Pin active symbol"
        >
          +{symbol}
        </button>
        {rows.map((r) => {
          const active = r.symbol === symbol.toUpperCase();
          return (
            <button
              key={r.symbol}
              type="button"
              onClick={() => setSymbol(r.symbol)}
              onContextMenu={(e) => {
                e.preventDefault();
                setList(removeFromWatchlist(r.symbol));
              }}
              title="Click to switch · right-click to remove · last-seen metrics"
              className={cn(
                'flex shrink-0 items-center gap-1 border-r border-border/60 px-1.5 py-0.5 text-type-2xs tabular-nums transition-colors last:border-r-0',
                active ? 'bg-secondary text-primary' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
              )}
            >
              <span className={cn('font-bold', active ? 'text-primary' : 'text-foreground')}>{r.symbol}</span>
              <span>{r.spot != null ? fmtPrice(r.spot, r.spot > 1000 ? 1 : 2) : '—'}</span>
              <span className="text-cyan">{r.atmIV != null ? fmtPct(r.atmIV) : '—'}</span>
              <span className={(r.totalGEX ?? 0) >= 0 ? 'text-up' : 'text-down'}>
                {r.totalGEX != null ? fmtCompact(r.totalGEX) : '—'}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn('border border-border bg-card/50', className)}>
      <div className="term-fn-bar justify-between normal-case tracking-normal">
        <div className="font-mono text-type-2xs font-semibold tracking-wide text-muted-foreground">
          <span className="term-code mr-1">WL</span>
          last-seen ATM IV / GEX
        </div>
        <button
          type="button"
          className="font-mono text-type-2xs text-muted-foreground hover:text-primary"
          onClick={() => setList(addToWatchlist(symbol))}
          title="Pin active symbol"
        >
          + {symbol}
        </button>
      </div>
      <div className="flex flex-wrap gap-px bg-border p-px">
        {rows.map((r) => {
          const active = r.symbol === symbol.toUpperCase();
          return (
            <button
              key={r.symbol}
              type="button"
              onClick={() => setSymbol(r.symbol)}
              onContextMenu={(e) => {
                e.preventDefault();
                setList(removeFromWatchlist(r.symbol));
              }}
              title="Click to switch · right-click to remove"
              className={cn(
                'min-w-[5.5rem] bg-card px-1.5 py-1 text-left font-mono transition-colors',
                active
                  ? 'bg-secondary ring-1 ring-inset ring-primary/40'
                  : 'hover:bg-secondary/50',
              )}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-type-xs font-bold text-foreground">{r.symbol}</span>
                {r.ivRankPct != null && (
                  <span
                    className={cn(
                      'text-type-2xs tabular-nums',
                      r.ivRankPct >= 70 ? 'text-down' : r.ivRankPct <= 30 ? 'text-up' : 'text-muted-foreground',
                    )}
                  >
                    {r.ivRankPct.toFixed(0)}%
                  </span>
                )}
              </div>
              <div className="text-type-2xs tabular-nums text-muted-foreground">
                {r.spot != null ? fmtPrice(r.spot, r.spot > 1000 ? 1 : 2) : '—'}
                {' · '}
                {r.atmIV != null ? fmtPct(r.atmIV) : '—'}
              </div>
              <div
                className={cn(
                  'text-type-2xs tabular-nums',
                  (r.totalGEX ?? 0) >= 0 ? 'text-up/90' : 'text-down/90',
                )}
              >
                GEX {r.totalGEX != null ? fmtCompact(r.totalGEX) : '—'}
              </div>
            </button>
          );
        })}
      </div>
      <div className="px-2 py-0.5 font-mono text-type-2xs text-muted-foreground/80">
        Metrics refresh when you open that symbol · right-click chip to drop
      </div>
    </div>
  );
}
