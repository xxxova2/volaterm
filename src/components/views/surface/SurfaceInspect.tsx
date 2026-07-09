import { Explain } from '../../common/Explain';

export interface InspectPoint {
  strike: number;
  expiry: string;
  dte: number;
  iv: number;
  delta: number | null;
}

function fmtPct(v: number | null): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return `${(v * 100).toFixed(1)}%`;
}

function fmtNum(v: number | null, digits = 2): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return v.toFixed(digits);
}

export function SurfaceInspect({
  hover,
  selected,
}: {
  hover: InspectPoint | null;
  selected: InspectPoint | null;
}) {
  return (
    <>
      {hover && (
        <div className="pointer-events-none absolute bottom-3 left-3 z-10 bg-card/90 border border-border rounded px-2 py-1 text-type-2xs font-mono text-muted-foreground">
          <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5">
            <span><Explain term="strike">Strike</Explain></span>
            <span className="tabular-nums text-foreground text-right">{fmtNum(hover.strike)}</span>
            <span>Expiry</span>
            <span className="tabular-nums text-foreground text-right">{hover.expiry}</span>
            <span><Explain term="dte">DTE</Explain></span>
            <span className="tabular-nums text-foreground text-right">{hover.dte}</span>
            <span><Explain term="impliedVol">IV</Explain></span>
            <span className="tabular-nums text-cyan text-right">{fmtPct(hover.iv)}</span>
          </div>
        </div>
      )}

      {selected && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 bg-card border border-border rounded px-3 py-2 text-type-xs font-mono text-muted-foreground">
          <div className="text-muted-foreground uppercase tracking-wider mb-1">Selected Point</div>
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            <span><Explain term="strike">Strike</Explain></span>
            <span className="tabular-nums text-foreground text-right">{fmtNum(selected.strike)}</span>
            <span>Expiry</span>
            <span className="tabular-nums text-foreground text-right">{selected.expiry}</span>
            <span><Explain term="dte">DTE</Explain></span>
            <span className="tabular-nums text-foreground text-right">{selected.dte}</span>
            <span><Explain term="impliedVol">IV</Explain></span>
            <span className="tabular-nums text-cyan text-right">{fmtPct(selected.iv)}</span>
            <span><Explain term="delta">Delta</Explain></span>
            <span className="tabular-nums text-foreground text-right">{fmtPct(selected.delta)}</span>
          </div>
        </div>
      )}
    </>
  );
}
