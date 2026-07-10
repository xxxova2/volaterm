import { useRef, useEffect, useCallback, useState } from 'react';
import type { HeatmapCell } from './greeksTypes';
import { cn } from '../../lib/utils';
import {
  canvasCellColor,
  colorWithAlpha,
  resolveCanvasColors,
} from '../../lib/chartTheme';

interface CanvasHeatmapProps {
  rows: { expiry: string; dte: number }[];
  cols: number[];
  cellMatrix: HeatmapCell[][];
  min: number;
  max: number;
  diverging: boolean;
  onCellHover: (cell: HeatmapCell | null) => void;
  onCellClick: (cell: HeatmapCell | null) => void;
  selectedCell: HeatmapCell | null;
  sortMode?: 'strike' | 'delta';
  onSortModeChange?: (mode: 'strike' | 'delta') => void;
}

interface CellPos {
  strike: number;
  dte: number;
  ri: number;
  ci: number;
}

export function CanvasHeatmap({
  rows, cols, cellMatrix, min, max, diverging,
  onCellHover, onCellClick, selectedCell,
  sortMode, onSortModeChange,
}: CanvasHeatmapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dim, setDim] = useState({ w: 600, h: 400 });
  const [hoverCell, setHoverCell] = useState<{ strike: number; dte: number; ri: number; ci: number } | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
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
    if (nRows === 0 || nCols === 0) return;

    const colors = resolveCanvasColors();
    const cellW = Math.max(12, (w - 80) / nCols);
    const cellH = Math.max(8, (h - 30) / nRows);
    const x0 = 70;
    const y0 = 5;

    // Draw cells.
    for (let r = 0; r < nRows; r++) {
      for (let c = 0; c < nCols; c++) {
        const cell = cellMatrix[r]?.[c];
        const v = cell?.value;
        const x = x0 + c * cellW;
        const y = y0 + r * cellH;

        if (v != null && isFinite(v)) {
          ctx.fillStyle = canvasCellColor(v, min, max, diverging, colors);
        } else {
          ctx.fillStyle = colors.empty;
        }
        ctx.fillRect(x, y, cellW - 1, cellH - 1);

        // Selected cell ring — brand.
        if (
          selectedCell &&
          cell &&
          cell.strike === selectedCell.strike &&
          cell.dte === selectedCell.dte
        ) {
          ctx.strokeStyle = colors.brand;
          ctx.lineWidth = 2;
          ctx.strokeRect(x - 0.5, y - 0.5, cellW, cellH);
        }
      }
    }

    // Y-axis labels (strikes).
    ctx.fillStyle = colorWithAlpha(colors.label, 0.9);
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let c = 0; c < nCols; c++) {
      const x = x0 + c * cellW + cellW / 2;
      ctx.fillText(String(cols[c]!), x, y0 + nRows * cellH + 12);
    }

    // X-axis labels (DTE) + aggregate row label.
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText('K \\ DTE', x0 - 6, y0 + nRows * cellH + 12);

    ctx.textAlign = 'center';
    for (let r = 0; r < nRows; r++) {
      const y = y0 + r * cellH + cellH / 2;
      ctx.fillText(`${rows[r]!.dte}d`, 62, y);
    }

    // Sort mode indicator.
    if (sortMode) {
      ctx.textAlign = 'left';
      ctx.font = '8px "JetBrains Mono", monospace';
      ctx.fillStyle = colorWithAlpha(colors.label, 0.6);
      ctx.fillText(`Sort: ${sortMode}`, x0 + nCols * cellW + 6, y0 + nRows * cellH + 12);
    }

    // Draw hover highlight.
    if (hoverCell) {
      const hx = x0 + hoverCell.ci * cellW;
      const hy = y0 + hoverCell.ri * cellH;
      ctx.strokeStyle = colorWithAlpha(colors.brand, 0.3);
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.strokeRect(hx + 0.5, hy + 0.5, cellW - 2, cellH - 2);
      ctx.setLineDash([]);
    }
  }, [rows, cols, cellMatrix, min, max, diverging, selectedCell, dim, hoverCell, sortMode]);

  useEffect(() => { draw(); }, [draw]);

  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDim({ w: Math.max(200, width - 10), h: Math.max(100, height - 10) });
      }
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const posToCell = useCallback((clientX: number, clientY: number): CellPos | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;

    const nRows = rows.length;
    const nCols = cols.length;
    if (nRows === 0 || nCols === 0) return null;

    const cellW = Math.max(12, (dim.w - 80) / nCols);
    const cellH = Math.max(8, (dim.h - 30) / nRows);
    const x0 = 70;
    const y0 = 5;

    const c = Math.floor((mx - x0) / cellW);
    const r = Math.floor((my - y0) / cellH);
    if (c < 0 || c >= nCols || r < 0 || r >= nRows) return null;

    return { strike: cols[c]!, dte: rows[r]!.dte, ri: r, ci: c };
  }, [rows, cols, dim]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = posToCell(e.clientX, e.clientY);
    if (pos) {
      setHoverCell(pos);
      const cell = cellMatrix[pos.ri]?.[pos.ci] ?? null;
      onCellHover(cell);
    } else {
      setHoverCell(null);
      onCellHover(null);
    }
  }, [posToCell, cellMatrix, onCellHover]);

  const handleMouseLeave = useCallback(() => {
    setHoverCell(null);
    onCellHover(null);
  }, [onCellHover]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = posToCell(e.clientX, e.clientY);
    if (!pos) return;
    const cell = cellMatrix[pos.ri]?.[pos.ci] ?? null;
    if (!cell || cell.value == null) return;
    onCellClick(cell);
  }, [posToCell, cellMatrix, onCellClick]);

  const txt = `${diverging ? (min < 0 ? formatShort(min) : '0') : formatShort(min)}`;
  const txtMax = formatShort(max);
  // Legend gradient from theme roles (static CANVAS fallbacks; DOM may refine on paint).
  const legend = resolveCanvasColors();
  const legendBg = diverging
    ? `linear-gradient(90deg, ${colorWithAlpha(legend.down, 0.95)} 0%, ${colorWithAlpha(legend.down, 0.35)} 25%, ${colorWithAlpha(legend.foreground, 0.15)} 50%, ${colorWithAlpha(legend.up, 0.35)} 75%, ${colorWithAlpha(legend.up, 0.95)} 100%)`
    : `linear-gradient(90deg, ${colorWithAlpha(legend.info, 0.08)} 0%, ${colorWithAlpha(legend.info, 0.55)} 50%, ${colorWithAlpha(legend.info, 0.93)} 100%)`;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex-1 overflow-hidden" ref={containerRef}>
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onMouseDown={handleClick}
          className="cursor-crosshair"
          style={{ width: dim.w, height: dim.h }}
        />
      </div>

      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <span className="text-type-2xs font-mono text-muted-foreground min-w-[4ch] text-right">{txt}</span>
          <div
            className="h-2 w-28 rounded-sm"
            style={{ background: legendBg }}
            data-legend=""
            data-legend-mode={diverging ? 'diverging' : 'sequential'}
          />
          <span className="text-type-2xs font-mono text-muted-foreground">{txtMax}</span>
          {onSortModeChange && (
            <button
              onClick={() => onSortModeChange(sortMode === 'delta' ? 'strike' : 'delta')}
              className={cn('ml-2 px-1.5 py-0.5 text-type-2xs font-mono rounded',
                sortMode === 'delta' ? 'bg-secondary text-foreground ring-1 ring-border' : 'bg-muted text-muted-foreground hover:text-foreground'
              )}
            >
              {sortMode === 'delta' ? 'Sort: Δ' : 'Sort: K'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function formatShort(v: number): string {
  if (Math.abs(v) < 0.01) return v.toFixed(3);
  if (Math.abs(v) < 1) return v.toFixed(3);
  return v.toFixed(2);
}
