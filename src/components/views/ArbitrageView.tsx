import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { useTerminalStore } from '../../store/terminalStore';
import { DiagnosticsStrip } from './DiagnosticsStrip';
import { fmtPrice } from '../../lib/format';
import { cn } from '../../lib/utils';
import type { NoArbResult } from '../../lib/options/noarb';
import { Explain } from '../common/Explain';

type ArbMode = 'combined' | 'calendar' | 'butterfly';

const MODES: { id: ArbMode; label: string }[] = [
  { id: 'combined', label: 'Combined' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'butterfly', label: 'Butterfly' },
];

function buildViolationMatrix(
  surface: NonNullable<ReturnType<typeof useTerminalStore.getState>['surface']>,
  arbResult: NoArbResult,
  mode: ArbMode,
): { rows: number; cols: number; viol: boolean[][] } {
  const rows = surface.iv.length;
  const cols = surface.strikes.length;
  const viol: boolean[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < cols; c++) {
      const cal = arbResult.calendar.flags[r]?.[c] ?? false;
      const fly = arbResult.butterfly.flags[r]?.[c] ?? false;
      row.push(mode === 'combined' ? cal || fly : mode === 'calendar' ? cal : fly);
    }
    viol.push(row);
  }
  return { rows, cols, viol };
}

export function ArbitrageView() {
  const surface = useTerminalStore(s => s.surface);
  const arbResult = useTerminalStore(s => s.arbResult);
  const sviReadout = useTerminalStore(s => s.sviReadout);
  const [mode, setMode] = useState<ArbMode>('combined');
  const [selectedCell, setSelectedCell] = useState<{ strike: number; dte: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverCell, setHoverCell] = useState<{ strike: number; dte: number } | null>(null);
  const [dim, setDim] = useState({ w: 600, h: 400 });

  const violationMatrix = useMemo(() => {
    if (!surface || !arbResult) return null;
    return buildViolationMatrix(surface, arbResult, mode);
  }, [surface, arbResult, mode]);

  const violCount = useMemo(() => {
    if (!violationMatrix) return { calendar: 0, butterfly: 0 };
    return {
      calendar: arbResult?.calendar.violations ?? 0,
      butterfly: arbResult?.butterfly.violations ?? 0,
    };
  }, [violationMatrix, arbResult]);

  // Click outside clears selection.
  useEffect(() => {
    if (!selectedCell) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('[data-arb-canvas]') || t.closest('[data-arb-inspector]')) return;
      setSelectedCell(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [selectedCell]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !surface || !violationMatrix) return;
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

    const rows = violationMatrix.rows;
    const cols = violationMatrix.cols;
    const labelW = 60;
    const headerH = 16;
    const cellW = Math.max(12, (w - labelW) / cols);
    const cellH = Math.max(8, (h - headerH) / rows);
    const x0 = labelW;
    const y0 = headerH;

    // Draw cells.
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const v = violationMatrix.viol[r]![c]!;
        const x = x0 + c * cellW;
        const y = y0 + r * cellH;

        ctx.fillStyle = v ? 'rgba(220, 60, 60, 0.7)' : 'rgba(63, 185, 80, 0.12)';
        ctx.fillRect(x, y, cellW - 1, cellH - 1);

        if (selectedCell && surface.strikes[c] === selectedCell.strike && surface.dtes[r] === selectedCell.dte) {
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, cellW - 1, cellH - 1);
        }
      }
    }

    // Y-axis labels (strikes).
    ctx.fillStyle = 'rgba(156, 163, 175, 0.9)';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let c = 0; c < cols; c++) {
      const x = x0 + c * cellW + cellW / 2;
      ctx.fillText(String(surface.strikes[c]!), x, y0 + rows * cellH + 2);
    }

    // X-axis labels (DTE).
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(156, 163, 175, 0.7)';
    ctx.font = '9px "JetBrains Mono", monospace';
    for (let r = 0; r < rows; r++) {
      const y = y0 + r * cellH + cellH / 2;
      ctx.fillText(`${surface.dtes[r]}d`, x0 - 4, y);
    }

    // Title + mode + counts in top area.
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(156, 163, 175, 0.6)';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillText(`Arbitrage Violations — ${mode.toUpperCase()}`, x0, 2);
    ctx.fillStyle = violCount.calendar > 0 ? '#ef4444' : '#22c55e';
    ctx.fillText(`Calendar: ${violCount.calendar}`, x0 + cols * cellW - 160, 2);
    ctx.fillStyle = violCount.butterfly > 0 ? '#ef4444' : '#22c55e';
    ctx.fillText(`Butterfly: ${violCount.butterfly}`, x0 + cols * cellW - 80, 2);
  }, [surface, violationMatrix, dim, selectedCell, mode, violCount]);

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

  const posToCell = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !surface || !violationMatrix) return null;
    const rect = canvas.getBoundingClientRect();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;
    const rows = violationMatrix.rows;
    const cols = violationMatrix.cols;
    const labelW = 60;
    const headerH = 16;
    const cellW = Math.max(12, (dim.w - labelW) / cols);
    const cellH = Math.max(8, (dim.h - headerH) / rows);
    const x0 = labelW;
    const y0 = headerH;
    const c = Math.floor((mx - x0) / cellW);
    const r = Math.floor((my - y0) / cellH);
    if (c < 0 || c >= cols || r < 0 || r >= rows) return null;
    return { strike: surface.strikes[c]!, dte: surface.dtes[r]!, r, c };
  }, [surface, violationMatrix, dim]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const cell = posToCell(e.clientX, e.clientY);
    if (cell && (hoverCell?.strike !== cell.strike || hoverCell?.dte !== cell.dte)) {
      setHoverCell(cell);
    } else if (!cell) {
      setHoverCell(null);
    }
  }, [posToCell, hoverCell]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const cell = posToCell(e.clientX, e.clientY);
    if (!cell) return;
    if (selectedCell?.strike === cell.strike && selectedCell?.dte === cell.dte) {
      setSelectedCell(null);
    } else {
      setSelectedCell(cell);
    }
  }, [posToCell, selectedCell]);

  if (!surface || !arbResult) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-xs font-mono">No arbitrage data</div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <DiagnosticsStrip sviReadout={sviReadout} arbResult={arbResult} />

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

      {/* Floating toolbar over canvas */}
      <div className="absolute top-1 right-2 z-10 flex gap-1">
        {MODES.map(m => (
          <button
            key={m.id}
            onClick={() => { setMode(m.id); setSelectedCell(null); }}
            className={cn('px-2 py-0.5 text-type-xs font-mono rounded bg-card/80 backdrop-blur-sm border border-border',
              mode === m.id ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Explain term={m.id === 'combined' ? 'arbitrage' : m.id === 'calendar' ? 'calendarArb' : 'butterflyArb'}>{m.label}</Explain>
          </button>
        ))}
      </div>

      {/* Hover tooltip */}
      {hoverCell && (
        <div className="absolute bottom-1 left-2 text-type-xs font-mono text-muted-foreground z-10 bg-card/80 backdrop-blur-sm px-2 py-1 rounded border border-border">
          K {fmtPrice(hoverCell.strike, 0)} · {hoverCell.dte}d
        </div>
      )}

      {/* Inspector */}
      {selectedCell && (
        <div data-arb-inspector="" className="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-x-4 gap-y-1 rounded border border-amber/40 bg-card/95 backdrop-blur-sm px-3 py-2 text-type-sm font-mono shadow-sm z-20">
          <span className="flex items-center gap-1.5">
            <span className="text-muted-foreground">K</span>
            <span className="text-amber font-semibold tabular-nums">{fmtPrice(selectedCell.strike, 0)}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-foreground tabular-nums">{selectedCell.dte}d</span>
          </span>
          {(() => {
            const ci = surface.strikes.indexOf(selectedCell.strike);
            const ri = surface.dtes.indexOf(selectedCell.dte);
            if (ci < 0 || ri < 0) return null;
            const cal = arbResult.calendar.flags[ri]?.[ci] ?? false;
            const fly = arbResult.butterfly.flags[ri]?.[ci] ?? false;
            return (
              <>
                <span className={cn('flex items-center gap-1.5', cal ? 'text-down' : 'text-up')}>
                  <span className="text-muted-foreground"><Explain term="calendarArb">Calendar</Explain></span>
                  {cal ? '✗' : '✓'}
                </span>
                <span className={cn('flex items-center gap-1.5', fly ? 'text-down' : 'text-up')}>
                  <span className="text-muted-foreground"><Explain term="butterflyArb">Butterfly</Explain></span>
                  {fly ? '✗' : '✓'}
                </span>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
