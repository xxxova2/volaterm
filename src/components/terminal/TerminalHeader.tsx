import { useCallback, useState, useEffect } from 'react';
import { useTerminalStore } from '../../store/terminalStore';
import { fmtPrice, fmtClock } from '../../lib/format';
import { SymbolDialog } from './SymbolDialog';
import { FreshnessChip } from '../common/Freshness';
import {
  kindFromProvenance,
  worstFreshnessKind,
} from '../../lib/data/freshness';

export function TerminalHeader() {
  const {
    symbol,
    snapshot,
    setSymbol,
    loading,
    fmpQuote,
    liveRFR,
    chainUsed,
    chainAvailable,
    spotSource,
    lastSpotUpdate,
    lastChainUpdate,
    provenance,
  } = useTerminalStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [clock, setClock] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Real prints only — never seed a demo/preset spot into the header.
  const spot = fmpQuote?.price ?? (snapshot?.spot && snapshot.spot > 0 ? snapshot.spot : null);
  const atmIV = snapshot?.expiries[0]?.atmIV;
  const termSlope = snapshot && snapshot.expiries.length > 2
    ? ((snapshot.expiries[1]?.atmIV ?? 0) - (snapshot.expiries[0]?.atmIV ?? 0)) * 100
    : null;

  const handleSymbolSelect = useCallback((sym: string) => {
    setSymbol(sym);
    setDialogOpen(false);
  }, [setSymbol]);

  // Product mode is static MODE LIVE; data trust uses same missing→down as StatusBar.
  const spotMissing = spotSource === 'none';
  const chainMissing = !chainAvailable || chainUsed === 'none';
  const spotKind = kindFromProvenance(
    provenance.spot?.kind,
    provenance.spot?.asOfMs ?? (lastSpotUpdate > 0 ? lastSpotUpdate : null),
    'spot',
    { demo: false, down: spotMissing },
  );
  const chainKind = kindFromProvenance(
    provenance.chain?.kind,
    provenance.chain?.asOfMs ?? (lastChainUpdate > 0 ? lastChainUpdate : null),
    'chain',
    { demo: false, down: chainMissing },
  );
  const summaryKind = worstFreshnessKind(spotKind, chainKind);
  const spotAsOf = provenance.spot?.asOfMs ?? (lastSpotUpdate > 0 ? lastSpotUpdate : null);
  const chainAsOf = provenance.chain?.asOfMs ?? (lastChainUpdate > 0 ? lastChainUpdate : null);
  const asOfHint = [
    spotAsOf != null ? `spot ${new Date(spotAsOf).toLocaleTimeString()}` : null,
    chainAsOf != null ? `chain ${new Date(chainAsOf).toLocaleTimeString()}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const dataTitle = `Spot: ${spotKind} · Chain: ${chainKind}${asOfHint ? ` · as-of ${asOfHint}` : ''}`;

  return (
    <>
      <header className="flex h-7 shrink-0 items-center justify-between border-b border-border bg-card px-1.5 text-type-xs font-mono sm:px-2">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <span className="shrink-0 text-primary font-bold text-xs tracking-wider sm:text-sm">VOLATERM</span>
          <button
            onClick={() => setDialogOpen(true)}
            className="flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 font-semibold transition-colors hover:bg-secondary"
          >
            <span className="text-amber">{symbol}</span>
            <span className="text-muted-foreground text-type-2xs">▼</span>
          </button>
          {fmpQuote?.name && (
            <span className="hidden max-w-36 truncate text-muted-foreground lg:inline">{fmpQuote.name}</span>
          )}
          <span className="tabular-nums text-foreground">
            {spot != null ? fmtPrice(spot) : '—'}
          </span>
          {loading && <span className="text-muted-foreground" title="Refreshing">⟳</span>}
          {atmIV != null && (
            <span className="hidden text-muted-foreground sm:inline">
              IV30: <span className="text-cyan">{fmtPrice(atmIV * 100, 1)}%</span>
            </span>
          )}
          {liveRFR != null && (
            <span className="hidden text-muted-foreground md:inline">
              RFR: <span className="text-rate">{fmtPrice(liveRFR * 100, 2)}%</span>
            </span>
          )}
          {termSlope != null && (
            <span className={`hidden md:inline ${termSlope > 0 ? 'text-up' : 'text-down'}`}>
              {termSlope > 0 ? '↑' : '↓'} {fmtPrice(Math.abs(termSlope), 2)}%
            </span>
          )}
          <span className="hidden text-muted-foreground lg:inline">
            {snapshot?.expiries.length ?? 0} exp
            {chainAvailable ? ` · ${chainUsed}` : ''}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden tabular-nums text-muted-foreground sm:inline">{fmtClock(clock)}</span>
          {/* KD-UI-13: product mode (muted) — not a green freshness pill */}
          <span
            className="rounded border border-border bg-muted/50 px-1.5 py-0.5 text-type-2xs font-medium uppercase tracking-wider text-muted-foreground"
            title="LIVE-only terminal — market feeds only; no demo mode."
            aria-label="LIVE-only terminal — market feeds only; no demo mode."
          >
            MODE LIVE
          </span>
          <FreshnessChip
            kind={summaryKind}
            title={dataTitle}
            aria-label={`Data freshness: ${summaryKind}`}
          />
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
