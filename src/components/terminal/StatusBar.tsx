import { useTerminalStore } from '../../store/terminalStore';
import { fmtTime } from '../../lib/format';

export function StatusBar() {
  const { source, symbol, snapshot, lastUpdate } = useTerminalStore();
  const expiryCount = snapshot?.expiries.length ?? 0;
  const quoteCount = snapshot?.expiries.reduce((s, e) => s + e.calls.length + e.puts.length, 0) ?? 0;

  return (
    <footer className="flex h-6 items-center justify-between border-t border-border bg-card px-3 text-[10px] font-mono text-muted-foreground">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1">
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${source === 'live' ? 'bg-up' : 'bg-amber'}`} />
          {source === 'live' ? 'LIVE' : 'DEMO'}
        </span>
        <span>{symbol} · {expiryCount} expiries · {quoteCount} contracts</span>
      </div>
      <div className="flex items-center gap-3">
        <span>Updated: {fmtTime(lastUpdate)}</span>
        <span>1-7 tabs · R refresh · S symbol · Space play · ? help</span>
      </div>
    </footer>
  );
}
