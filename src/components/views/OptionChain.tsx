import { useMemo } from 'react';
import { List } from 'react-window';
import { useTerminalStore } from '../../store/terminalStore';
import { fmtPrice, fmtPct, fmtInt } from '../../lib/format';
import { cn } from '../../lib/utils';
import { VISUAL_CONFIG } from '../../config/constants';
import { DiagnosticsStrip } from './DiagnosticsStrip';
import { Explain } from '../common/Explain';

interface RowData {
  strike: number;
  callIV: string;
  callDelta: string;
  callBid: string;
  callAsk: string;
  callOI: string;
  callVol: string;
  putIV: string;
  putDelta: string;
  putBid: string;
  putAsk: string;
  putOI: string;
  putVol: string;
  atm: boolean;
}

const COL_WIDTHS = { sm: 'flex-[1.5]', md: 'flex-[1]', lg: 'flex-[1.2]' };
const { ROW_HEIGHT, ATM_THRESHOLD } = VISUAL_CONFIG.optionChain;

function HeaderRow() {
  return (
    <div className="flex text-[10px] font-mono text-muted-foreground border-b border-border bg-card sticky top-0 z-10 h-6 items-center">
      <div className="flex-[4] flex">
        <Explain term="impliedVol" className={`${COL_WIDTHS.sm} text-right px-1`}>IV%</Explain>
        <Explain term="delta" className={`${COL_WIDTHS.sm} text-right px-1`}>Δ</Explain>
        <Explain term="bid" className={`${COL_WIDTHS.md} text-right px-1`}>Bid</Explain>
        <Explain term="ask" className={`${COL_WIDTHS.md} text-right px-1`}>Ask</Explain>
        <Explain term="openInterest" className={`${COL_WIDTHS.sm} text-right px-1`}>OI</Explain>
        <Explain term="volume" className={`${COL_WIDTHS.sm} text-right px-1`}>Vol</Explain>
      </div>
      <span className="flex-[1] text-center font-semibold text-amber"><Explain term="strike">Strike</Explain></span>
      <div className="flex-[4] flex">
        <Explain term="volume" className={`${COL_WIDTHS.sm} text-right px-1`}>Vol</Explain>
        <Explain term="openInterest" className={`${COL_WIDTHS.sm} text-right px-1`}>OI</Explain>
        <Explain term="bid" className={`${COL_WIDTHS.md} text-right px-1`}>Bid</Explain>
        <Explain term="ask" className={`${COL_WIDTHS.md} text-right px-1`}>Ask</Explain>
        <Explain term="delta" className={`${COL_WIDTHS.sm} text-right px-1`}>Δ</Explain>
        <Explain term="impliedVol" className={`${COL_WIDTHS.sm} text-right px-1`}>IV%</Explain>
      </div>
    </div>
  );
}

function RowComponent({ index, style, data }: { index: number; style: React.CSSProperties; data: RowData[] }) {
  const r = data[index];
  if (!r) return null;
  return (
    <div
      style={style}
      className={cn(
        'flex text-[10px] font-mono items-center border-b border-border/30 hover:bg-muted/20',
        r.atm && 'bg-primary/5',
      )}
    >
      <div className="flex-[4] flex text-up">
        <span className={`${COL_WIDTHS.sm} text-right px-1 tabular-nums`}>{r.callIV}</span>
        <span className={`${COL_WIDTHS.sm} text-right px-1 tabular-nums`}>{r.callDelta}</span>
        <span className={`${COL_WIDTHS.md} text-right px-1 tabular-nums`}>{r.callBid}</span>
        <span className={`${COL_WIDTHS.md} text-right px-1 tabular-nums`}>{r.callAsk}</span>
        <span className={`${COL_WIDTHS.sm} text-right px-1 tabular-nums`}>{r.callOI}</span>
        <span className={`${COL_WIDTHS.sm} text-right px-1 tabular-nums`}>{r.callVol}</span>
      </div>
      <span className="flex-[1] text-center text-amber font-semibold tabular-nums">{fmtPrice(r.strike, 0)}</span>
      <div className="flex-[4] flex text-down">
        <span className={`${COL_WIDTHS.sm} text-right px-1 tabular-nums`}>{r.putVol}</span>
        <span className={`${COL_WIDTHS.sm} text-right px-1 tabular-nums`}>{r.putOI}</span>
        <span className={`${COL_WIDTHS.md} text-right px-1 tabular-nums`}>{r.putBid}</span>
        <span className={`${COL_WIDTHS.md} text-right px-1 tabular-nums`}>{r.putAsk}</span>
        <span className={`${COL_WIDTHS.sm} text-right px-1 tabular-nums`}>{r.putDelta}</span>
        <span className={`${COL_WIDTHS.sm} text-right px-1 tabular-nums`}>{r.putIV}</span>
      </div>
    </div>
  );
}

export function OptionChain() {
  const snapshot = useTerminalStore(s => s.snapshot);
  const selectedExpiry = useTerminalStore(s => s.selectedExpiry);
  const sviReadout = useTerminalStore(s => s.sviReadout);
  const arbResult = useTerminalStore(s => s.arbResult);
  const spot = snapshot?.spot ?? 0;

  const rows: RowData[] = useMemo(() => {
    if (!snapshot) return [];
    const slice = snapshot.expiries.find(e => e.expiry === selectedExpiry) ?? snapshot.expiries[0];
    if (!slice) return [];

    const callsMap = new Map(slice.calls.map(c => [c.strike, c]));
    const putsMap = new Map(slice.puts.map(p => [p.strike, p]));
    const allStrikes = [...new Set([...callsMap.keys(), ...putsMap.keys()])].sort((a, b) => b - a);

    return allStrikes.map(strike => {
      const call = callsMap.get(strike);
      const put = putsMap.get(strike);
      const isATM = Math.abs(strike - spot) / spot < ATM_THRESHOLD;
      return {
        strike,
        callIV: call?.iv != null ? fmtPct(call.iv, 1) : '—',
        callDelta: call?.delta != null ? fmtPrice(call.delta, 3) : '—',
        callBid: call?.bid != null ? fmtPrice(call.bid) : '—',
        callAsk: call?.ask != null ? fmtPrice(call.ask) : '—',
        callOI: call?.openInterest != null ? fmtInt(call.openInterest) : '—',
        callVol: call?.volume != null ? fmtInt(call.volume) : '—',
        putIV: put?.iv != null ? fmtPct(put.iv, 1) : '—',
        putDelta: put?.delta != null ? fmtPrice(put.delta, 3) : '—',
        putBid: put?.bid != null ? fmtPrice(put.bid) : '—',
        putAsk: put?.ask != null ? fmtPrice(put.ask) : '—',
        putOI: put?.openInterest != null ? fmtInt(put.openInterest) : '—',
        putVol: put?.volume != null ? fmtInt(put.volume) : '—',
        atm: isATM,
      };
    });
  }, [snapshot, selectedExpiry, spot]);

  if (rows.length === 0) {
    return <div className="flex items-center justify-center h-full text-muted-foreground text-xs font-mono">No chain data</div>;
  }

  return (
    <div className="h-full flex flex-col">
      <HeaderRow />
      <DiagnosticsStrip sviReadout={sviReadout} arbResult={arbResult} data-testid="chain-diagnostics" />
      <div className="flex-1">
        <List
          rowComponent={RowComponent}
          rowCount={rows.length}
          rowHeight={ROW_HEIGHT}
          rowProps={{ data: rows } as any}
          style={{ height: '100%', width: '100%' }}
        />
      </div>
    </div>
  );
}
