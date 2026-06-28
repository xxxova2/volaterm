import { useMemo, useState } from 'react';
import { useTerminalStore } from '../../store/terminalStore';
import { Panel } from '../terminal/Panel';
import { fmtPrice, fmtSigned } from '../../lib/format';
import { cn } from '../../lib/utils';
import { portfolioGreeks, impliedMove } from '../../lib/options/analytics';
import { GreeksProfileView } from './GreeksProfileView';
import { GreeksSensitivityView } from './GreeksSensitivityView';
import { GreeksExpiryView } from './GreeksExpiryView';

type GreekKey = 'delta' | 'gamma' | 'theta' | 'vega' | 'rho' | 'vanna' | 'charm' | 'volga' | 'speed' | 'veta' | 'color' | 'zomma' | 'ultima';
type SubView = 'heatmap' | 'profile' | 'sensitivity' | 'byexpiry';

const GREEK_KEYS: { key: GreekKey; label: string; diverging: boolean }[] = [
  { key: 'delta', label: 'Delta', diverging: true },
  { key: 'gamma', label: 'Gamma', diverging: false },
  { key: 'theta', label: 'Theta', diverging: false },
  { key: 'vega', label: 'Vega', diverging: false },
  { key: 'rho', label: 'Rho', diverging: true },
  { key: 'vanna', label: 'Vanna', diverging: true },
  { key: 'charm', label: 'Charm', diverging: true },
  { key: 'volga', label: 'Volga', diverging: false },
  { key: 'speed', label: 'Speed', diverging: false },
  { key: 'veta', label: 'Veta', diverging: true },
  { key: 'color', label: 'Color', diverging: false },
  { key: 'zomma', label: 'Zomma', diverging: false },
  { key: 'ultima', label: 'Ultima', diverging: false },
];

const SUB_VIEWS: { id: SubView; label: string }[] = [
  { id: 'heatmap', label: 'Heatmap' },
  { id: 'profile', label: 'Profile' },
  { id: 'sensitivity', label: 'Sensitivity' },
  { id: 'byexpiry', label: 'By Expiry' },
];

export function GreeksView() {
  const snapshot = useTerminalStore(s => s.snapshot);
  const [subView, setSubView] = useState<SubView>('heatmap');
  const [selectedGreek, setSelectedGreek] = useState<GreekKey>('delta');
  const [showPuts, setShowPuts] = useState(true);
  const [hover, setHover] = useState<{ strike: number; dte: number; v: number } | null>(null);

  const portfolio = useMemo(() => snapshot ? portfolioGreeks(snapshot) : null, [snapshot]);
  const move = useMemo(() => snapshot ? impliedMove(snapshot) : null, [snapshot]);

  const diverging = GREEK_KEYS.find(g => g.key === selectedGreek)?.diverging ?? false;

  const { rows, cols, min, max } = useMemo(() => {
    if (!snapshot) return { rows: [], cols: [], min: 0, max: 0 };
    const slices = snapshot.expiries.slice(0, 8);
    const strikes = [...new Set(slices.flatMap(s => [...s.calls, ...s.puts].map(q => q.strike)))].sort((a, b) => a - b);
    const step = Math.max(1, Math.floor(strikes.length / 25));
    const filteredStrikes = strikes.filter((_, i) => i % step === 0 || i === strikes.length - 1);

    let minVal = Infinity, maxVal = -Infinity;
    const rows = slices.map(slice => {
      const cells = filteredStrikes.map(strike => {
        const qs = [...(showPuts ? slice.puts : []), ...slice.calls];
        const q = qs.find(x => x.strike === strike);
        const v = q?.[selectedGreek] ?? null;
        if (v != null && isFinite(v)) {
          if (v < minVal) minVal = v;
          if (v > maxVal) maxVal = v;
        }
        return v;
      });
      return { expiry: slice.expiry, dte: slice.dte, cells };
    });

    return { rows, cols: filteredStrikes, min: minVal, max: maxVal };
  }, [snapshot, selectedGreek, showPuts]);

  if (!snapshot) {
    return <Panel title="Greeks" className="h-full"><div className="flex items-center justify-center h-full text-muted-foreground text-xs font-mono">No data</div></Panel>;
  }

  return (
    <div className="flex flex-col h-full gap-2 p-2">
      <div className="flex items-center gap-1">
        {SUB_VIEWS.map(sv => (
          <button
            key={sv.id}
            onClick={() => setSubView(sv.id)}
            className={cn('px-2.5 py-1 text-[10px] font-mono rounded transition-colors',
              subView === sv.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {sv.label}
          </button>
        ))}
      </div>

      {subView === 'heatmap' && (
        <>
          <Panel
            title="Greeks Heatmap"
            subtitle="expiry (cols) × strike (rows)"
            className="flex-1"
            actions={
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <button
                    onClick={() => setShowPuts(p => !p)}
                    className={cn('px-2 py-0.5 text-[10px] font-mono rounded', showPuts ? 'bg-down/20 text-down' : 'bg-muted text-muted-foreground')}
                  >
                    Puts
                  </button>
                </div>
                <div className="flex gap-1">
                  {GREEK_KEYS.slice(0, 8).map(g => (
                    <button
                      key={g.key}
                      onClick={() => setSelectedGreek(g.key)}
                      className={cn('px-2 py-0.5 text-[10px] font-mono rounded',
                        selectedGreek === g.key ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
            }
          >
            <div className="flex-1 overflow-auto p-2">
              <table className="w-full border-separate border-spacing-0.5">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 bg-card px-1 py-1 text-right text-[9px] font-mono text-muted-foreground">K \\ DTE</th>
                    {rows.map(row => (
                      <th key={row.expiry} className="px-1 py-1 text-center text-[9px] font-mono text-muted-foreground">{row.dte}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cols.map((strike, ci) => (
                    <tr key={strike}>
                      <td className={cn('sticky left-0 z-10 bg-card px-1 py-0.5 text-right text-[10px] font-mono tabular-nums',
                        Math.abs(strike - snapshot.spot) / snapshot.spot < 0.006 ? 'font-semibold text-amber' : 'text-muted-foreground'
                      )}>
                        {fmtPrice(strike, 0)}
                      </td>
                      {rows.map(row => {
                        const v = row.cells[ci];
                        const bg = v != null && isFinite(v) ? cellColor(v, min, max, diverging) : 'transparent';
                        return (
                          <td
                            key={row.expiry}
                            onMouseEnter={() => setHover({ strike, dte: row.dte, v: v ?? 0 })}
                            onMouseLeave={() => setHover(null)}
                            className="h-6 cursor-default rounded-sm text-center align-middle text-[9px] font-mono transition-transform hover:scale-110"
                            style={{ background: bg, minWidth: 26 }}
                            title={v != null ? `K ${strike} · ${row.dte}d · ${formatVal(v, selectedGreek)}` : undefined}
                          />
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <div className="flex items-center justify-between rounded border border-border bg-card px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-muted-foreground">{formatVal(min, selectedGreek)}</span>
              <div
                className="h-2 w-40 rounded-sm"
                style={{ background: `linear-gradient(90deg, ${diverging ? 'rgba(240,136,62,0.9), rgba(240,136,62,0.1), rgba(63,185,80,0.1), rgba(63,185,80,0.9)' : 'rgba(77,143,240,0.08), rgba(77,143,240,0.93)'})` }}
              />
              <span className="text-[10px] font-mono text-muted-foreground">{formatVal(max, selectedGreek)}</span>
            </div>
            <div className="text-[11px] font-mono">
              {hover ? (
                <span className="text-muted-foreground">
                  K <span className="text-foreground">{fmtPrice(hover.strike, 0)}</span> · {hover.dte}d · <span className="text-foreground">{formatVal(hover.v, selectedGreek)}</span>
                </span>
              ) : (
                <span className="text-muted-foreground">hover a cell</span>
              )}
            </div>
          </div>

          {portfolio && (
            <div className="flex gap-3 px-3 py-1 border-t border-border text-[10px] font-mono">
              <span>Δ <span className="tabular-nums text-cyan">{fmtSigned(portfolio.delta, 2)}</span></span>
              <span>Γ <span className="tabular-nums text-up">{fmtSigned(portfolio.gamma, 4)}</span></span>
              <span>Θ <span className="tabular-nums text-down">{fmtSigned(portfolio.theta, 2)}</span></span>
              <span>ν <span className="tabular-nums text-amber">{fmtSigned(portfolio.vega, 2)}</span></span>
              {move && <span>EM <span className="tabular-nums">{fmtPrice(move.move)}</span></span>}
            </div>
          )}
        </>
      )}

      {subView === 'profile' && <GreeksProfileView />}
      {subView === 'sensitivity' && <GreeksSensitivityView />}
      {subView === 'byexpiry' && <GreeksExpiryView />}
    </div>
  );
}

function formatVal(v: number, g: string): string {
  if (!isFinite(v)) return '\u2014';
  if (g === 'gamma' || g === 'speed' || g === 'color' || g === 'zomma' || g === 'ultima') return v.toFixed(4);
  return v.toFixed(3);
}

function cellColor(v: number, min: number, max: number, diverging: boolean): string {
  if (diverging) {
    const m = Math.max(Math.abs(min), Math.abs(max)) || 1;
    const t = v / m;
    if (t >= 0) return `rgba(63, 185, 80, ${0.12 + Math.min(1, t) * 0.78})`;
    return `rgba(240, 136, 62, ${0.12 + Math.min(1, -t) * 0.78})`;
  }
  const t = max > min ? (v - min) / (max - min) : 0.5;
  return `rgba(77, 143, 240, ${0.08 + t * 0.85})`;
}
