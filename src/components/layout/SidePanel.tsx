import { useTerminalStore } from '../../store/terminalStore';
import { fmtPrice, fmtPct, fmtInt } from '../../lib/format';
import { cn } from '../../lib/utils';
import type { DisplayMode } from '../../lib/options/types';

export function SidePanel() {
  const { snapshot, selectedExpiry, setSelectedExpiry, displayMode, setDisplayMode } = useTerminalStore();
  const spot = snapshot?.spot ?? 0;

  if (!snapshot) {
    return (
      <aside className="w-56 border-r border-border bg-card p-3 flex flex-col gap-2">
        <div className="text-xs text-muted-foreground animate-pulse">Loading...</div>
      </aside>
    );
  }

  const modes: { key: DisplayMode; label: string }[] = [
    { key: 'strike', label: 'Strike' },
    { key: 'moneyness', label: 'Moneyness' },
    { key: 'delta', label: 'Delta' },
  ];

  return (
    <aside className="w-56 border-r border-border bg-card flex flex-col overflow-y-auto">
      <div className="p-2 border-b border-border">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Display</div>
        <div className="flex gap-0.5">
          {modes.map(m => (
            <button
              key={m.key}
              onClick={() => setDisplayMode(m.key)}
              className={cn(
                'px-2 py-0.5 text-[10px] font-mono rounded',
                displayMode === m.key
                  ? 'bg-primary/20 text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-2 border-b border-border">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Expiries</div>
        <div className="flex flex-col gap-0.5 max-h-60 overflow-y-auto">
          {snapshot.expiries.map(slice => (
            <button
              key={slice.expiry}
              onClick={() => setSelectedExpiry(slice.expiry)}
              className={cn(
                'flex items-center justify-between px-2 py-1 text-[11px] font-mono rounded hover:bg-muted transition-colors',
                selectedExpiry === slice.expiry ? 'bg-primary/10 text-primary' : 'text-foreground',
              )}
            >
              <span>
                {slice.dte}d
                <span className="text-muted-foreground ml-1">{slice.expiry.slice(5)}</span>
              </span>
              <span className="tabular-nums">{slice.atmIV > 0 ? fmtPct(slice.atmIV, 1) : '—'}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-2 border-b border-border text-[10px] font-mono text-muted-foreground space-y-1">
        <div className="flex justify-between">
          <span>Spot</span>
          <span className="tabular-nums text-foreground">{fmtPrice(spot)}</span>
        </div>
        <div className="flex justify-between">
          <span>Rate</span>
          <span className="tabular-nums">{fmtPct(snapshot.riskFreeRate)}</span>
        </div>
        <div className="flex justify-between">
          <span>Div Yield</span>
          <span className="tabular-nums">{fmtPct(snapshot.dividendYield)}</span>
        </div>
        <div className="flex justify-between">
          <span>Expiries</span>
          <span className="tabular-nums">{snapshot.expiries.length}</span>
        </div>
        <div className="flex justify-between">
          <span>Quotes</span>
          <span className="tabular-nums">{fmtInt(snapshot.expiries.reduce((s, e) => s + e.calls.length + e.puts.length, 0))}</span>
        </div>
      </div>

      <div className="p-2 text-[10px] text-muted-foreground">
        <div className="uppercase tracking-wider mb-1">Source</div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber" />
          Synthetic
        </div>
      </div>
    </aside>
  );
}
