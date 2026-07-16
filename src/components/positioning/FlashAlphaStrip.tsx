import { useEffect, useState } from 'react';
import { useTerminalStore } from '../../store/terminalStore';
import { fetchFALevels } from '../../lib/data/flashalphaClient';
import { fmtPct, fmtPrice } from '../../lib/format';
import { cn } from '../../lib/utils';

const ETF_TICKERS = new Set(['SPY', 'QQQ', 'IWM', 'DIA']);

/**
 * FlashAlpha levels — free tier ~5 upstream calls/day total (shared board).
 * Load only when this strip is mounted (Flow desk) and user opts in / one auto-load per symbol.
 * Never hook to setSymbol (that burned the budget on every ticker change).
 */
export function FlashAlphaStrip() {
  const symbol = useTerminalStore((s) => s.symbol);
  const faLevels = useTerminalStore((s) => s.faLevels);
  const faLevelsLoading = useTerminalStore((s) => s.faLevelsLoading);
  const setFALevels = useTerminalStore((s) => s.setFALevels);
  const spot = useTerminalStore((s) => s.snapshot?.spot);
  const [err, setErr] = useState<string | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  const upper = symbol.toUpperCase();
  const isETF = ETF_TICKERS.has(upper);

  const load = (sym: string) => {
    const s = sym.toUpperCase();
    if (ETF_TICKERS.has(s)) return;
    setErr(null);
    useTerminalStore.setState({ faLevelsLoading: true, faLevels: null });
    fetchFALevels(s)
      .then((data) => {
        if (useTerminalStore.getState().symbol.toUpperCase() !== s) return;
        if (!data) {
          setErr('No data (budget/key/upstream). Cache 6h · global 5/day.');
          useTerminalStore.setState({ faLevelsLoading: false, faLevels: null });
          return;
        }
        setFALevels(data);
        setLoadedFor(s);
      })
      .catch(() => {
        if (useTerminalStore.getState().symbol.toUpperCase() !== s) return;
        setErr('Fetch failed');
        useTerminalStore.setState({ faLevelsLoading: false, faLevels: null });
      });
  };

  // One automatic load when strip mounts for a non-ETF symbol (Flow only).
  useEffect(() => {
    if (isETF) {
      useTerminalStore.setState({ faLevels: null, faLevelsLoading: false });
      setLoadedFor(null);
      setErr(null);
      return;
    }
    if (loadedFor === upper && faLevels) return;
    load(upper);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: reload on symbol only
  }, [upper, isETF]);

  if (isETF) {
    return (
      <div className={cn('border border-border/40 rounded px-3 py-2', 'bg-muted/30')}>
        <div className="flex items-center gap-2">
          <span className="font-mono text-type-2xs text-muted-foreground uppercase tracking-wider">
            FlashAlpha
          </span>
          <span className="text-type-xs text-muted-foreground">
            {symbol} requires Basic plan. Free tier: individual stocks only.
          </span>
        </div>
      </div>
    );
  }

  if (faLevelsLoading) {
    return (
      <div className={cn('border border-border/40 rounded px-3 py-2', 'bg-muted/30')}>
        <div className="flex items-center gap-2">
          <span className="font-mono text-type-2xs text-muted-foreground uppercase tracking-wider">
            FlashAlpha
          </span>
          <span className="text-type-xs text-muted-foreground animate-pulse">Loading levels…</span>
        </div>
      </div>
    );
  }

  if (!faLevels) {
    return (
      <div className={cn('border border-border/40 rounded px-3 py-2', 'bg-muted/30')}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-type-2xs text-muted-foreground uppercase tracking-wider">
            FlashAlpha
          </span>
          <span className="text-type-xs text-muted-foreground">
            {err || 'No data — key, budget, or upstream'}
          </span>
          <button
            type="button"
            className="ml-auto text-type-2xs uppercase tracking-wide border border-border/60 px-1.5 py-0.5 hover:bg-muted"
            onClick={() => load(upper)}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { levelStack, netGEX, dealerCushion, flipDistancePct } = faLevels;

  return (
    <div className={cn('border border-border/40 rounded px-3 py-2', 'bg-muted/30')}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="font-mono text-type-2xs text-muted-foreground uppercase tracking-wider">
          FlashAlpha
        </span>
        <span className="text-type-3xs px-1 py-px rounded bg-accent/30 text-accent-foreground font-mono">
          {upper}
        </span>
        <span className="text-type-3xs text-muted-foreground ml-auto" title={faLevels.as_of}>
          as of {faLevels.as_of?.slice(11, 16) || '—'}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-type-xs">
        {levelStack.flip != null && (
          <span className="flex items-center gap-1">
            <span className="text-muted-foreground text-type-2xs">flip</span>
            <span className={cn(
              spot != null && levelStack.flip > spot ? 'text-up' : 'text-down',
            )}>
              {fmtPrice(levelStack.flip)}
            </span>
            {flipDistancePct != null && (
              <span className={cn(
                'text-type-3xs',
                flipDistancePct > 0 ? 'text-up' : 'text-down',
              )}>
                {flipDistancePct > 0 ? '+' : ''}{fmtPct(flipDistancePct / 100)}
              </span>
            )}
          </span>
        )}

        {levelStack.mp != null && (
          <span className="flex items-center gap-1">
            <span className="text-muted-foreground text-type-2xs">MP</span>
            <span>{fmtPrice(levelStack.mp)}</span>
          </span>
        )}

        {levelStack.callWall != null && (
          <span className="flex items-center gap-1">
            <span className="text-muted-foreground text-type-2xs">call wall</span>
            <span className="text-up">
              {fmtPrice(levelStack.callWall)}
              {spot != null && levelStack.callWall - spot < spot * 0.02 ? (
                <span className="text-type-3xs ml-0.5 text-amber">WATCH</span>
              ) : null}
            </span>
          </span>
        )}

        {levelStack.putWall != null && (
          <span className="flex items-center gap-1">
            <span className="text-muted-foreground text-type-2xs">put wall</span>
            <span className="text-down">
              {fmtPrice(levelStack.putWall)}
              {spot != null && spot - levelStack.putWall < spot * 0.02 ? (
                <span className="text-type-3xs ml-0.5 text-amber">WATCH</span>
              ) : null}
            </span>
          </span>
        )}

        {levelStack.topOI != null && (
          <span className="flex items-center gap-1">
            <span className="text-muted-foreground text-type-2xs">top OI</span>
            <span>{fmtPrice(levelStack.topOI)}</span>
          </span>
        )}
      </div>

      {(netGEX != null || dealerCushion != null) && (
        <div className="flex items-center gap-3 mt-1 font-mono text-type-2xs text-muted-foreground">
          {netGEX != null && (
            <span>
              NetGEX{' '}
              <span className={cn(netGEX > 0 ? 'text-up' : 'text-down', 'font-medium')}>
                {netGEX > 0 ? '+' : ''}{netGEX.toFixed(1)}
              </span>
            </span>
          )}
          {dealerCushion != null && (
            <span>
              cushion{' '}
              <span className={cn(dealerCushion > 0 ? 'text-up' : 'text-down', 'font-medium')}>
                +${dealerCushion.toFixed(2)}
              </span>
              {dealerCushion > 0 ? ' BRANGE' : ' PRANGE'}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
