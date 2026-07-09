/**
 * Breadcrumb / context line under tabs (Phase C).
 * e.g. Macros & Rates › STIR PATH · API yfinance · NYFed
 */
import { useTerminalStore } from '../../store/terminalStore';
import { tabLabel } from '../../config/deskNav';
import { ApiSources } from '../macrovol/ApiSources';

export function DeskContextBar() {
  const activeTab = useTerminalStore((s) => s.activeTab);
  const sectionLabel = useTerminalStore((s) => s.deskSectionLabel);
  const apis = useTerminalStore((s) => s.deskSectionApis);
  const density = useTerminalStore((s) => s.uiDensity);
  const chainUsed = useTerminalStore((s) => s.chainUsed);
  const source = useTerminalStore((s) => s.source);
  const symbol = useTerminalStore((s) => s.symbol);
  const provenance = useTerminalStore((s) => s.provenance);
  const cryptoDualCharts = useTerminalStore((s) => s.cryptoDualCharts);

  const desk = tabLabel(activeTab);
  const chainHint =
    activeTab === 'rates' || activeTab === 'crypto'
      ? null
      : source === 'live'
        ? chainUsed
        : 'demo';

  const cryptoHint =
    activeTab === 'crypto'
      ? `active:${symbol === 'ETH' ? 'ETH' : symbol === 'BTC' ? 'BTC' : symbol}${cryptoDualCharts ? ' · 2×charts' : ' · tape'}`
      : null;

  const spotProv = provenance.spot?.source;
  const chainProv = provenance.chain?.kind;

  return (
    <div
      className="flex h-4 shrink-0 items-center gap-1 border-b border-border/70 bg-card/30 px-1.5 font-mono text-type-2xs text-muted-foreground"
      role="status"
      aria-label="Desk context"
    >
      <span className="font-semibold text-foreground/90">{desk}</span>
      {sectionLabel && (
        <>
          <span className="text-muted-foreground/50" aria-hidden>
            ›
          </span>
          <span className="text-primary/90">{sectionLabel}</span>
        </>
      )}
      {apis && apis.length > 0 && (
        <span className="ml-1 hidden sm:inline">
          <ApiSources apis={apis} />
        </span>
      )}
      {chainHint && (
        <span className="hidden text-muted-foreground/70 md:inline">
          · chain:{chainHint}
        </span>
      )}
      {cryptoHint && (
        <span className="hidden text-muted-foreground/70 md:inline">
          · {cryptoHint} · deribit
        </span>
      )}
      {spotProv && activeTab !== 'rates' && (
        <span className="hidden text-muted-foreground/50 lg:inline">
          · spot:{spotProv}
          {chainProv ? ` · ${chainProv}` : ''}
        </span>
      )}
      <span className="ml-auto hidden items-center gap-2 sm:flex">
        <span className="text-muted-foreground/50" title="Jump sections with [ and ]">
          [ ] section
        </span>
        <span className="text-muted-foreground/40">·</span>
        <span className="text-muted-foreground/50" title="Board focus: j/k · y copy · Esc clear">
          j/k focus
        </span>
        <span className="text-muted-foreground/40">·</span>
        <span className="uppercase tracking-wider text-muted-foreground/60">
          {density}
        </span>
      </span>
    </div>
  );
}
