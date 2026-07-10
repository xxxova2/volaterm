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

export function WatchlistStrip({ className }: { className?: string }) {
  const symbol = useTerminalStore((s) => s.symbol);
  const snapshot = useTerminalStore((s) => s.snapshot);
  const setSymbol = useTerminalStore((s) => s.setSymbol);
  const [list, setList] = useState<string[]>(() => loadWatchlist());
  const [rows, setRows] = useState<WatchMetrics[]>([]);

  // Record metrics for active symbol when chain is live
  useEffect(() => {
    if (!snapshot || !symbol) return;
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
  }, [snapshot, symbol]);

  useEffect(() => {
    setRows(getWatchMetrics(list));
  }, [list]);

  return (
    <div className={cn('rounded border border-border bg-card/50 px-2 py-1.5', className)}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="font-mono text-type-2xs font-semibold tracking-wide text-muted-foreground">
          WATCHLIST · last-seen ATM IV / GEX
        </div>
        <button
          type="button"
          className="font-mono text-type-2xs text-muted-foreground hover:text-foreground"
          onClick={() => setList(addToWatchlist(symbol))}
          title="Pin active symbol"
        >
          + {symbol}
        </button>
      </div>
      <div className="flex flex-wrap gap-1">
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
                'min-w-[5.5rem] rounded border px-1.5 py-1 text-left font-mono transition-colors',
                active
                  ? 'border-primary/50 bg-secondary'
                  : 'border-border bg-background/40 hover:border-border hover:bg-secondary/50',
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
      <div className="mt-1 font-mono text-type-2xs text-muted-foreground/80">
        Metrics refresh when you open that symbol · right-click chip to drop
      </div>
    </div>
  );
}
