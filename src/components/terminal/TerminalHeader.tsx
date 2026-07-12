import { useCallback, useState, useEffect } from 'react';
import { useTerminalStore } from '../../store/terminalStore';
import { fmtPrice, fmtClock } from '../../lib/format';
import { SymbolDialog } from './SymbolDialog';
import { FreshnessChip } from '../common/Freshness';
import {
  kindFromProvenance,
  worstFreshnessKind,
} from '../../lib/data/freshness';

interface TerminalHeaderProps {
  /** Open keyboard shortcuts overlay (same as ?). */
  onOpenShortcuts?: () => void;
}

export function TerminalHeader({ onOpenShortcuts }: TerminalHeaderProps) {
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
      {/* Single tight BBG top line — desk jump lives in red FunctionMenuBar (1–7). */}
      <header className="flex h-6 shrink-0 items-center justify-between border-b border-border bg-card px-1 text-type-2xs font-mono sm:px-1.5">
        <div className="flex min-w-0 items-center gap-1 sm:gap-1.5">
          <span className="term-code shrink-0 tracking-[0.12em]">VT</span>
          <button
            onClick={() => setDialogOpen(true)}
            className="flex items-center gap-0.5 border border-border bg-background px-1 py-0 font-semibold transition-colors hover:border-primary/50 hover:bg-secondary"
            title="Change security (S)"
          >
            <span className="text-primary tabular-nums text-type-xs">{symbol}</span>
            <span className="text-muted-foreground">▼</span>
          </button>
          <span className="tabular-nums text-type-xs font-semibold text-foreground">
            {spot != null ? fmtPrice(spot) : '—'}
          </span>
          {loading && <span className="text-muted-foreground" title="Refreshing">⟳</span>}
          {atmIV != null && (
            <span className="text-muted-foreground">
              IV <span className="text-cyan">{fmtPrice(atmIV * 100, 1)}%</span>
            </span>
          )}
          {termSlope != null && (
            <span className={termSlope > 0 ? 'text-up' : 'text-down'}>
              {termSlope > 0 ? '↑' : '↓'}
              {fmtPrice(Math.abs(termSlope), 1)}
            </span>
          )}
          <span className="hidden text-muted-foreground md:inline">
            {snapshot?.expiries.length ?? 0}e
            {chainAvailable ? ` · ${chainUsed}` : ''}
          </span>
          {liveRFR != null && (
            <span className="hidden text-muted-foreground lg:inline">
              r <span className="text-rate">{fmtPrice(liveRFR * 100, 2)}</span>
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          <span className="hidden tabular-nums text-muted-foreground sm:inline">{fmtClock(clock)}</span>
          <span
            className="px-0.5 text-type-2xs uppercase tracking-wider text-muted-foreground/80"
            title="LIVE-only terminal — market feeds only; no demo mode."
            aria-label="LIVE-only terminal — market feeds only; no demo mode."
          >
            LIVE
          </span>
          <FreshnessChip
            kind={summaryKind}
            title={dataTitle}
            aria-label={`Data freshness: ${summaryKind}`}
          />
          <button
            onClick={() => useTerminalStore.getState().refresh()}
            className="text-muted-foreground hover:text-primary transition-colors"
            title="Refresh (R)"
          >
            ↻
          </button>
          <button
            onClick={() => onOpenShortcuts?.()}
            className="text-muted-foreground hover:text-primary transition-colors"
            title="Shortcuts (?)"
          >
            ?
          </button>
        </div>
      </header>
      {dialogOpen && <SymbolDialog onSelect={handleSymbolSelect} onClose={() => setDialogOpen(false)} />}
    </>
  );
}
