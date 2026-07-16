/**
 * Top ETF holdings from FMP (allowlisted). 24h client TTL; fail-closed.
 * Free plan may 403 — strip hides quietly.
 */
import { useEffect, useState } from 'react';
import { fetchFmpEtfHoldings } from '../../lib/data/fmpClient';
import type { FmpEtfHolding } from '../../lib/data/types';
import { cn } from '../../lib/utils';

const ETF_SYMBOLS = new Set(['SPY', 'QQQ', 'IWM', 'DIA']);

export function EtfHoldingsStrip({
  symbol,
  className,
}: {
  symbol: string;
  className?: string;
}) {
  const upper = symbol.toUpperCase();
  const [rows, setRows] = useState<FmpEtfHolding[] | null>(null);

  useEffect(() => {
    if (!ETF_SYMBOLS.has(upper)) {
      setRows(null);
      return;
    }
    let cancelled = false;
    fetchFmpEtfHoldings(upper)
      .then((data) => {
        if (cancelled) return;
        if (!Array.isArray(data) || data.length === 0) {
          setRows(null);
          return;
        }
        const sorted = [...data]
          .filter((h) => h && (h.asset || h.symbol) && Number.isFinite(h.weight))
          .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))
          .slice(0, 8);
        setRows(sorted.length ? sorted : null);
      })
      .catch(() => {
        if (!cancelled) setRows(null);
      });
    return () => {
      cancelled = true;
    };
  }, [upper]);

  if (!ETF_SYMBOLS.has(upper) || !rows?.length) return null;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-border/60 bg-card/40 px-2 py-1 font-mono text-type-2xs',
        className,
      )}
      aria-label={`${upper} ETF holdings`}
    >
      <span className="rounded border border-border/60 px-1 py-0.5 font-semibold text-muted-foreground">
        ETF
      </span>
      <span className="text-muted-foreground">{upper} top weights · FMP</span>
      {rows.map((h) => {
        const name = h.asset || h.symbol || '?';
        const w = Number(h.weight);
        return (
          <span key={name} className="tabular-nums text-foreground">
            {name}{' '}
            <span className="text-muted-foreground">
              {Number.isFinite(w) ? `${w.toFixed(1)}%` : '—'}
            </span>
          </span>
        );
      })}
    </div>
  );
}
