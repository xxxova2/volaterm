import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useTerminalStore } from '../../store/terminalStore';
import { fmtPrice, fmtSigned } from '../../lib/format';
import { cn } from '../../lib/utils';
import { portfolioGreeks, impliedMove } from '../../lib/options/analytics';
import { GreeksProfileView } from './GreeksProfileView';
import { GreeksSensitivityView } from './GreeksSensitivityView';
import { GreeksExpiryView } from './GreeksExpiryView';
import { GreeksSurface3D } from './GreeksSurface3D';
import { DiagnosticsStrip } from './DiagnosticsStrip';
import { GREEK_META, type GreekKey, type HeatmapCell } from './greeksTypes';
import { computeHeatmapAggregates } from './greeksUtils';

type SubView = 'heatmap' | 'profile' | 'sensitivity' | 'byexpiry' | 'surface3d';
type MoneynessRange = 'all' | 'atm10' | 'atm20';

const MONEYNESS_OPTIONS: { id: MoneynessRange; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'atm10', label: 'ATM ±10%' },
  { id: 'atm20', label: 'ATM ±20%' },
];

const SUB_VIEWS: { id: SubView; label: string }[] = [
  { id: 'heatmap', label: 'Heatmap' },
  { id: 'profile', label: 'Profile' },
  { id: 'sensitivity', label: 'Sensitivity' },
  { id: 'byexpiry', label: 'By Expiry' },
  { id: 'surface3d', label: '3D Surface' },
];

function moneynessThreshold(range: MoneynessRange): number {
  switch (range) {
    case 'atm10': return 0.10;
    case 'atm20': return 0.20;
    case 'all':
    default:
      return Infinity;
  }
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

export function GreeksView() {
  const snapshot = useTerminalStore(s => s.snapshot);
  const sviReadout = useTerminalStore(s => s.sviReadout);
  const arbResult = useTerminalStore(s => s.arbResult);
  const [subView, setSubView] = useState<SubView>('heatmap');
  const [selectedGreek, setSelectedGreek] = useState<GreekKey>('delta');
  const [showPuts, setShowPuts] = useState(true);
  const [moneynessRange, setMoneynessRange] = useState<MoneynessRange>('all');
  const [sortMode, setSortMode] = useState<'strike' | 'delta'>('strike');
  const [hoverCell, setHoverCell] = useState<HeatmapCell | null>(null);
  const [selectedCell, setSelectedCell] = useState<HeatmapCell | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dim, setDim] = useState({ w: 600, h: 400 });

  const portfolio = useMemo(() => snapshot ? portfolioGreeks(snapshot) : null, [snapshot]);
  const move = useMemo(() => snapshot ? impliedMove(snapshot) : null, [snapshot]);

  const diverging = GREEK_META.find(g => g.key === selectedGreek)?.diverging ?? false;

  const { rows, cols, cellMatrix, min, max } = useMemo<{
    rows: { expiry: string; dte: number }[];
    cols: number[];
    cellMatrix: HeatmapCell[][];
    min: number;
    max: number;
  }>(() => {
    if (!snapshot) return { rows: [], cols: [], cellMatrix: [], min: 0, max: 0 };
    const slices = snapshot.expiries.slice(0, 8);
    const allStrikes = [...new Set(slices.flatMap(s => [...s.calls, ...s.puts].map(q => q.strike)))].sort((a, b) => a - b);

    const threshold = moneynessThreshold(moneynessRange);
    const moneynessFiltered = threshold === Infinity
      ? allStrikes
      : allStrikes.filter(k => Math.abs(k - snapshot.spot) / snapshot.spot <= threshold);

    const step = Math.max(1, Math.floor(moneynessFiltered.length / 25));
    const filteredStrikes = moneynessFiltered.filter((_, i) => i % step === 0 || i === moneynessFiltered.length - 1);

    let minVal = Infinity, maxVal = -Infinity;
    const rows: { expiry: string; dte: number }[] = [];
    const cellMatrix: HeatmapCell[][] = [];

    for (const slice of slices) {
      rows.push({ expiry: slice.expiry, dte: slice.dte });
      const cellRow: HeatmapCell[] = filteredStrikes.map(strike => {
        const qs = [...(showPuts ? slice.puts : []), ...slice.calls];
        const q = qs.find(x => x.strike === strike);
        const v = q?.[selectedGreek] ?? null;
        if (v != null && isFinite(v)) {
          if (v < minVal) minVal = v;
          if (v > maxVal) maxVal = v;
        }
        const callQuote = slice.calls.find(x => x.strike === strike) ?? null;
        const putQuote = slice.puts.find(x => x.strike === strike) ?? null;
        const quoteRef = callQuote ?? putQuote;
        return {
          strike,
          dte: slice.dte,
          expiry: slice.expiry,
          value: v,
          quote: quoteRef
            ? { type: quoteRef.type, mid: quoteRef.mid, iv: quoteRef.iv, delta: quoteRef.delta }
            : undefined,
        };
      });
      cellMatrix.push(cellRow);
    }

    if (sortMode === 'delta' && filteredStrikes.length > 0) {
      const deltaByStrike = new Map<number, number>();
      for (const slice of slices) {
        for (const strike of filteredStrikes) {
          const q = [...slice.calls, ...slice.puts]
            .filter(x => x.strike === strike && x.delta != null)
            .sort((a, b) => Math.abs(b.delta!) - Math.abs(a.delta!))[0];
          if (q?.delta != null) {
            const existing = deltaByStrike.get(strike) ?? 0;
            deltaByStrike.set(strike, existing + Math.abs(q.delta));
          }
        }
      }
      const sortedStrikes = [...filteredStrikes].sort((a, b) =>
        (deltaByStrike.get(b) ?? 0) - (deltaByStrike.get(a) ?? 0)
      );
      const reorderedMatrix: HeatmapCell[][] = cellMatrix.map(row => {
        return sortedStrikes.map(s => row[filteredStrikes.indexOf(s)]!);
      });
      return { rows, cols: sortedStrikes, cellMatrix: reorderedMatrix, min: minVal, max: maxVal };
    }

    return { rows, cols: filteredStrikes, cellMatrix, min: minVal, max: maxVal };
  }, [snapshot, selectedGreek, showPuts, moneynessRange, sortMode]);

  const aggregates = useMemo(() => computeHeatmapAggregates(cellMatrix), [cellMatrix]);

  // Click outside clears selection.
  useEffect(() => {
    if (!selectedCell) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('[data-arb-canvas]') || t.closest('[data-heatmap-inspector]')) return;
      setSelectedCell(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [selectedCell]);

  // Canvas rendering.
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || rows.length === 0 || cols.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = dim.w;
    const h = dim.h;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const nRows = rows.length;
    const nCols = cols.length;
    const labelW = 48;
    const headerH = 14;
    const aggW = 30;
    const cellW = Math.max(10, (w - labelW - aggW) / nCols);
    const cellH = Math.max(6, (h - headerH) / nRows);
    const x0 = labelW;
    const y0 = headerH;

    // Draw cells.
    for (let r = 0; r < nRows; r++) {
      for (let c = 0; c < nCols; c++) {
        const cell = cellMatrix[r]?.[c];
        const v = cell?.value;
        const x = x0 + c * cellW;
        const y = y0 + r * cellH;

        if (v != null && isFinite(v)) {
          ctx.fillStyle = cellColor(v, min, max, diverging);
        } else {
          ctx.fillStyle = 'rgba(0,0,0,0.04)';
        }
        ctx.fillRect(x, y, cellW - 1, cellH - 1);

        if (selectedCell && cell && cell.strike === selectedCell.strike && cell.dte === selectedCell.dte) {
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2;
          ctx.strokeRect(x - 0.5, y - 0.5, cellW, cellH);
        }
      }
    }

    // Y-axis labels (strikes).
    ctx.fillStyle = 'rgba(156, 163, 175, 0.9)';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let c = 0; c < nCols; c++) {
      const x = x0 + c * cellW + cellW / 2;
      ctx.fillText(String(cols[c]!), x, y0 + nRows * cellH + 1);
    }

    // X-axis labels (DTE).
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(156, 163, 175, 0.7)';
    ctx.font = '8px "JetBrains Mono", monospace';
    for (let r = 0; r < nRows; r++) {
      const y = y0 + r * cellH + cellH / 2;
      ctx.fillText(`${rows[r]!.dte}d`, x0 - 3, y);
    }

    // Column aggregate stats (right edge).
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = '7px "JetBrains Mono", monospace';
    for (let c = 0; c < nCols; c++) {
      const x = x0 + c * cellW;
      const agg = aggregates.byExpiry[c];
      if (agg) {
        ctx.fillStyle = 'rgba(156, 163, 175, 0.4)';
        const txt = `${agg.min?.toFixed(2) ?? '-'}/${agg.mean?.toFixed(2) ?? '-'}`;
        ctx.fillText(txt, x, y0 + nRows * cellH + 11);
      }
    }

    // Row aggregate stats (top of column).
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    for (let r = 0; r < nRows; r++) {
      const y = y0 + r * cellH;
      const agg = aggregates.byExpiry[r];
      if (agg) {
        ctx.fillStyle = 'rgba(156, 163, 175, 0.4)';
        const mean = agg.mean;
        const txt = mean != null ? fmtAggShort(mean, selectedGreek) : '-';
        ctx.fillText(txt, x0 - 22, y + 10);
      }
    }

    // Title.
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(156, 163, 175, 0.5)';
    ctx.font = '8px "JetBrains Mono", monospace';
    const greekLabel = GREEK_META.find(g => g.key === selectedGreek)?.label ?? selectedGreek;
    ctx.fillText(`${greekLabel} — ${fmtAggShort(min, selectedGreek)} to ${fmtAggShort(max, selectedGreek)}`, x0, 1);
  }, [rows, cols, cellMatrix, min, max, diverging, selectedCell, dim, selectedGreek, aggregates]);

  useEffect(() => { draw(); }, [draw]);

  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDim({ w: Math.max(200, width), h: Math.max(100, height) });
      }
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const posToCell = useCallback((clientX: number, clientY: number): { ri: number; ci: number; cell: HeatmapCell } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;
    const nRows = rows.length;
    const nCols = cols.length;
    if (nRows === 0 || nCols === 0) return null;
    const labelW = 48;
    const headerH = 14;
    const aggW = 30;
    const cellW = Math.max(10, (dim.w - labelW - aggW) / nCols);
    const cellH = Math.max(6, (dim.h - headerH) / nRows);
    const x0 = labelW;
    const y0 = headerH;
    const c = Math.floor((mx - x0) / cellW);
    const r = Math.floor((my - y0) / cellH);
    if (c < 0 || c >= nCols || r < 0 || r >= nRows) return null;
    const cell = cellMatrix[r]?.[c];
    if (!cell) return null;
    return { ri: r, ci: c, cell };
  }, [rows, cols, cellMatrix, dim]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const hit = posToCell(e.clientX, e.clientY);
    setHoverCell(hit?.cell ?? null);
  }, [posToCell]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const hit = posToCell(e.clientX, e.clientY);
    if (!hit) return;
    if (selectedCell && selectedCell.strike === hit.cell.strike && selectedCell.dte === hit.cell.dte && selectedCell.expiry === hit.cell.expiry) {
      setSelectedCell(null);
    } else {
      setSelectedCell(hit.cell);
    }
  }, [posToCell, selectedCell]);

  if (!snapshot) {
    return <div className="flex items-center justify-center h-full text-muted-foreground text-xs font-mono">No data</div>;
  }

  const greekRow1 = GREEK_META.slice(0, 7);
  const greekRow2 = GREEK_META.slice(7);

  return (
    <div className="flex flex-col h-full">
      {/* Compact sub-view tabs */}
      <div className="flex items-center gap-0.5 px-1 py-0.5 border-b border-border">
        {SUB_VIEWS.map(sv => (
          <button
            key={sv.id}
            onClick={() => setSubView(sv.id)}
            className={cn('px-2 py-0.5 text-[10px] font-mono rounded transition-colors',
              subView === sv.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {sv.label}
          </button>
        ))}
        <div className="flex-1" />
        <DiagnosticsStrip sviReadout={sviReadout} arbResult={arbResult} data-testid="greeks-diagnostics" />
      </div>

      {subView !== 'heatmap' ? (
        <div className="flex-1 p-1 overflow-hidden">
          {subView === 'profile' && <GreeksProfileView />}
          {subView === 'sensitivity' && <GreeksSensitivityView />}
          {subView === 'byexpiry' && <GreeksExpiryView />}
          {subView === 'surface3d' && <GreeksSurface3D />}
        </div>
      ) : (
        <>
          {/* Compact tool bar */}
          <div className="flex items-center gap-1 px-1 py-0.5 border-b border-border text-[10px] font-mono flex-shrink-0">
            <div className="flex gap-0.5">
              <button
                onClick={() => setShowPuts(p => !p)}
                className={cn('px-1.5 py-0.5 rounded text-[9px]', showPuts ? 'bg-down/20 text-down' : 'bg-muted text-muted-foreground')}
              >
                Puts {showPuts ? 'ON' : 'OFF'}
              </button>
            </div>
            <div className="flex gap-0.5">
              {MONEYNESS_OPTIONS.map(m => (
                <button
                  key={m.id}
                  onClick={() => setMoneynessRange(m.id)}
                  className={cn('px-1.5 py-0.5 rounded text-[9px]',
                    moneynessRange === m.id ? 'bg-amber/20 text-amber' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <div className="w-px h-4 bg-border mx-1" />
            <button
              onClick={() => setSortMode(s => s === 'delta' ? 'strike' : 'delta')}
              className={cn('px-1.5 py-0.5 rounded text-[9px]',
                sortMode === 'delta' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Sort: {sortMode === 'delta' ? 'Δ' : 'K'}
            </button>
            <div className="flex-1" />
            <div className="flex gap-0.5">
              {greekRow1.map(g => (
                <button
                  key={g.key}
                  onClick={() => setSelectedGreek(g.key)}
                  className={cn('px-1.5 py-0.5 rounded text-[9px]',
                    selectedGreek === g.key ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-0.5 px-1 py-0.5 border-b border-border text-[10px] font-mono flex-shrink-0">
            <div className="flex gap-0.5">
              {greekRow2.map(g => (
                <button
                  key={g.key}
                  onClick={() => setSelectedGreek(g.key)}
                  className={cn('px-1.5 py-0.5 rounded text-[9px]',
                    selectedGreek === g.key ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {g.label}
                </button>
              ))}
            </div>
            <div className="flex-1" />
            <span className="text-[9px] text-muted-foreground">
              {hoverCell ? (
                <span>K {fmtPrice(hoverCell.strike, 0)} · {hoverCell.dte}d · {fmtAggShort(hoverCell.value ?? 0, selectedGreek)}</span>
              ) : (
                <span>{cols.length}K × {rows.length}T</span>
              )}
            </span>
          </div>

          {/* Canvas heatmap — takes remaining space */}
          <div className="flex-1 min-h-0 relative" ref={containerRef}>
            <canvas
              ref={canvasRef}
              data-arb-canvas=""
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHoverCell(null)}
              onMouseDown={handleClick}
              className="cursor-crosshair absolute inset-0"
              style={{ width: dim.w, height: dim.h }}
            />
          </div>

          {/* Floating inspector */}
          {selectedCell && (
            <div data-heatmap-inspector="" className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-amber/40 bg-card px-3 py-1.5 text-[11px] font-mono flex-shrink-0">
              <span className="flex items-center gap-1.5">
                <span className="text-muted-foreground">K</span>
                <span className="text-amber font-semibold tabular-nums">{fmtPrice(selectedCell.strike, 0)}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-foreground tabular-nums">{selectedCell.dte}d</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-muted-foreground">{GREEK_META.find(g => g.key === selectedGreek)?.label ?? selectedGreek}</span>
                <span className="text-foreground tabular-nums">{selectedCell.value != null ? fmtAggShort(selectedCell.value, selectedGreek) : '—'}</span>
              </span>
              {selectedCell.quote ? (
                <>
                  <span className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">{selectedCell.quote.type}</span>
                    <span className={cn('uppercase', selectedCell.quote.type === 'call' ? 'text-up' : 'text-down')}>
                      {selectedCell.quote.type === 'call' ? 'C' : 'P'}
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">mid</span>
                    <span className="text-foreground tabular-nums">{fmtPrice(selectedCell.quote.mid)}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">IV</span>
                    <span className="text-foreground tabular-nums">
                      {selectedCell.quote.iv != null ? `${(selectedCell.quote.iv * 100).toFixed(1)}%` : '—'}
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Δ</span>
                    <span className="text-foreground tabular-nums">
                      {selectedCell.quote.delta != null ? selectedCell.quote.delta.toFixed(3) : '—'}
                    </span>
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">no quote</span>
              )}
              {portfolio && (
                <span className="ml-auto flex items-center gap-3 text-[10px]">
                  <span>Δ <span className="tabular-nums text-cyan">{fmtSigned(portfolio.delta, 2)}</span></span>
                  <span>Γ <span className="tabular-nums text-up">{fmtSigned(portfolio.gamma, 4)}</span></span>
                  <span>Θ <span className="tabular-nums text-down">{fmtSigned(portfolio.theta, 2)}</span></span>
                  <span>ν <span className="tabular-nums text-amber">{fmtSigned(portfolio.vega, 2)}</span></span>
                  {move && <span>EM <span className="tabular-nums">{fmtPrice(move.move)}</span></span>}
                </span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function fmtAggShort(v: number, g: string): string {
  if (!isFinite(v)) return '—';
  if (g === 'gamma' || g === 'speed' || g === 'color' || g === 'zomma' || g === 'ultima') return v.toFixed(4);
  return v.toFixed(3);
}
