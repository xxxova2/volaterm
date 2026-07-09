import { useCallback, useState, useEffect } from 'react';
import { useTerminalStore } from '../../store/terminalStore';
import { fmtPrice, fmtClock } from '../../lib/format';
import { presetFor } from '../../lib/options/synthetic';
import { SymbolDialog } from './SymbolDialog';

export function TerminalHeader() {
  const { symbol, snapshot, source, setSource, setSymbol, loading, fmpQuote, liveRFR } = useTerminalStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [clock, setClock] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const spot = fmpQuote?.price ?? snapshot?.spot ?? presetFor(symbol)?.spot ?? 548;
  const atmIV = snapshot?.expiries[0]?.atmIV;
  const termSlope = snapshot && snapshot.expiries.length > 2
    ? ((snapshot.expiries[1]?.atmIV ?? 0) - (snapshot.expiries[0]?.atmIV ?? 0)) * 100
    : null;

  const handleSymbolSelect = useCallback((sym: string) => {
    setSymbol(sym);
    setDialogOpen(false);
  }, [setSymbol]);

  return (
    <>
      <header className="flex h-9 shrink-0 items-center justify-between border-b border-border bg-card px-2 text-[11px] font-mono sm:px-3">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <span className="shrink-0 text-primary font-bold text-xs tracking-wider sm:text-sm">VOLATERM</span>
          <button
            onClick={() => setDialogOpen(true)}
            className="flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 font-semibold transition-colors hover:bg-secondary"
          >
            <span className="text-amber">{symbol}</span>
            <span className="text-muted-foreground text-[9px]">▼</span>
          </button>
          {fmpQuote?.name && (
            <span className="hidden max-w-36 truncate text-muted-foreground lg:inline">{fmpQuote.name}</span>
          )}
          <span className="tabular-nums text-foreground">{fmtPrice(spot)}</span>
          {loading && <span className="animate-pulse text-muted-foreground">⟳</span>}
          {atmIV != null && (
            <span className="hidden text-muted-foreground sm:inline">
              IV30: <span className="text-cyan">{fmtPrice(atmIV * 100, 1)}%</span>
            </span>
          )}
          {liveRFR != null && (
            <span className="hidden text-muted-foreground md:inline">
              RFR: <span className="text-violet-400">{fmtPrice(liveRFR * 100, 2)}%</span>
            </span>
          )}
          {termSlope != null && (
            <span className={`hidden md:inline ${termSlope > 0 ? 'text-up' : 'text-down'}`}>
              {termSlope > 0 ? '↑' : '↓'} {fmtPrice(Math.abs(termSlope), 2)}%
            </span>
          )}
          <span className="hidden text-muted-foreground lg:inline">
            {snapshot?.expiries.length ?? 0} exp
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden tabular-nums text-muted-foreground sm:inline">{fmtClock(clock)}</span>
          <button
            onClick={() => setSource(source === 'demo' ? 'live' : 'demo')}
            className={`rounded px-2 py-0.5 text-xs font-medium ${
              source === 'live'
                ? 'bg-up/20 text-up'
                : 'bg-amber/20 text-amber'
            }`}
          >
            {source === 'live' ? 'LIVE' : 'DEMO'}
          </button>
          <button
            onClick={() => useTerminalStore.getState().refresh()}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Refresh (R)"
          >
            ↻
          </button>
          <button
            onClick={() => {}}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Shortcuts (?)"
          >
            ⌨
          </button>
        </div>
      </header>
      {dialogOpen && <SymbolDialog onSelect={handleSymbolSelect} onClose={() => setDialogOpen(false)} />}
    </>
  );
}
