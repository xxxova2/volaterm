import { useCallback, useState, useEffect } from 'react';
import { useTerminalStore } from '../../store/terminalStore';
import { fmtPrice, fmtClock } from '../../lib/format';
import { presetFor } from '../../lib/options/synthetic';
import { SymbolDialog } from './SymbolDialog';

export function TerminalHeader() {
  const { symbol, snapshot, source, setSource, setSymbol, loading } = useTerminalStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [clock, setClock] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const spot = snapshot?.spot ?? presetFor(symbol)?.spot ?? 548;
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
      <header className="flex h-11 items-center justify-between border-b border-border bg-card px-4 text-xs font-mono">
        <div className="flex items-center gap-4">
          <span className="text-primary font-bold text-sm tracking-wider">VOLATERM</span>
          <button
            onClick={() => setDialogOpen(true)}
            className="flex items-center gap-1.5 rounded px-2 py-1 bg-muted hover:bg-secondary transition-colors font-semibold"
          >
            <span className="text-amber">{symbol}</span>
            <span className="text-muted-foreground">▼</span>
          </button>
          <span className="text-foreground tabular-nums">{fmtPrice(spot)}</span>
          {loading && <span className="text-muted-foreground animate-pulse">⟳</span>}
          {atmIV != null && (
            <span className="text-muted-foreground">
              IV30: <span className="text-cyan">{fmtPrice(atmIV * 100, 1)}%</span>
            </span>
          )}
          {termSlope != null && (
            <span className={termSlope > 0 ? 'text-up' : 'text-down'}>
              {termSlope > 0 ? '↑' : '↓'} {fmtPrice(Math.abs(termSlope), 2)}%
            </span>
          )}
          <span className="text-muted-foreground">
            {snapshot?.expiries.length ?? 0} expiries
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-muted-foreground tabular-nums">{fmtClock(clock)}</span>
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
