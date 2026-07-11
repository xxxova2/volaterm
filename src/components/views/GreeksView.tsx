import { useEffect, useMemo, useRef, useState, useCallback, lazy, Suspense } from 'react';
import { useTerminalStore } from '../../store/terminalStore';
import { fmtPrice, fmtSigned } from '../../lib/format';
import { cn } from '../../lib/utils';
import {
  canvasCellColor,
  colorWithAlpha,
  resolveCanvasColors,
} from '../../lib/chartTheme';
import { portfolioGreeks, impliedMove } from '../../lib/options/analytics';
import { GreeksProfileView } from './GreeksProfileView';
import { GreeksSensitivityView } from './GreeksSensitivityView';
import { GreeksExpiryView } from './GreeksExpiryView';
import { GreeksSurface3D } from './GreeksSurface3D';
import { DiagnosticsStrip } from './DiagnosticsStrip';
import { GREEK_META, type GreekKey, type HeatmapCell } from './greeksTypes';
import { computeHeatmapAggregates } from './greeksUtils';
import { Explain } from '../common/Explain';
import { DeskLoading } from '../common/Skeleton';
import { SectionErrorBoundary } from '../common/SectionErrorBoundary';
import { EmptyState } from '../common/EmptyState';
import { UI_COPY } from '../../config/uiCopy';
import { DeskChrome } from '../terminal/DeskChrome';
import { DeskModeBar } from '../terminal/DeskModeBar';
import type { OptionQuote } from '../../lib/options/types';
import { consumeDeskJumpOnMount } from '../../lib/market/deskJump';

const Greeks10View = lazy(() =>
  import('./Greeks10View').then((m) => ({ default: m.Greeks10View })),
);

type GreeksEdition = 'terminal' | 'greeks10';
type SubView = 'heatmap' | 'profile' | 'sensitivity' | 'byexpiry' | 'surface3d';
type MoneynessRange = 'all' | 'atm10' | 'atm20';
/** Which side's greeks to plot. OTM = market convention (put K<S, call K≥S). */
type QuoteSide = 'otm' | 'calls' | 'puts';

const MONEYNESS_OPTIONS: { id: MoneynessRange; label: string }[] = [
  { id: 'atm10', label: 'ATM ±10%' },
  { id: 'atm20', label: 'ATM ±20%' },
  { id: 'all', label: 'All' },
];

const QUOTE_SIDE_OPTIONS: { id: QuoteSide; label: string }[] = [
  { id: 'otm', label: 'OTM' },
  { id: 'calls', label: 'Calls' },
  { id: 'puts', label: 'Puts' },
];

const SUB_VIEWS: { id: SubView; label: string; domId: string }[] = [
  { id: 'heatmap', label: 'Heatmap', domId: 'greeks-sub-heatmap' },
  { id: 'profile', label: 'Profile', domId: 'greeks-sub-profile' },
  { id: 'sensitivity', label: 'Sensitivity', domId: 'greeks-sub-sensitivity' },
  { id: 'byexpiry', label: 'By Expiry', domId: 'greeks-sub-byexpiry' },
  { id: 'surface3d', label: '3D Surface', domId: 'greeks-sub-surface3d' },
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

/**
 * Build a dense strike axis near ATM by snapping a uniform moneyness grid
 * onto real listed strikes. Avoids the sparse "union of all expiries" grid
 * that left most heatmap cells empty on equity chains.
 */
function buildStrikeAxis(
  allStrikes: number[],
  spot: number,
  range: MoneynessRange,
  targetCols = 21,
): number[] {
  if (allStrikes.length === 0 || !(spot > 0)) return [];
  const thr = moneynessThreshold(range);
  const band = allStrikes.filter((k) => thr === Infinity || Math.abs(k - spot) / spot <= thr);
  const pool = band.length >= 3 ? band : allStrikes;

  // Uniform moneyness targets, then nearest listed strike (deduped).
  const lo = thr === Infinity ? pool[0]! / spot : Math.max(pool[0]! / spot, 1 - thr);
  const hi = thr === Infinity ? pool[pool.length - 1]! / spot : Math.min(pool[pool.length - 1]! / spot, 1 + thr);
  const n = Math.min(targetCols, pool.length);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const m = n === 1 ? 1 : lo + (hi - lo) * (i / (n - 1));
    const target = spot * m;
    let best = pool[0]!;
    let bestD = Math.abs(best - target);
    for (const k of pool) {
      const d = Math.abs(k - target);
      if (d < bestD) {
        best = k;
        bestD = d;
      }
    }
    if (out.length === 0 || out[out.length - 1] !== best) out.push(best);
  }
  return out;
}

/** OTM convention: put below spot, call at/above. Then nearest strike within tol. */
function pickHeatmapQuote(
  calls: OptionQuote[],
  puts: OptionQuote[],
  strike: number,
  spot: number,
  side: QuoteSide,
  tol: number,
): OptionQuote | null {
  const preferPuts = side === 'puts' || (side === 'otm' && strike < spot);
  const primary = preferPuts ? puts : calls;
  const secondary = preferPuts ? calls : puts;

  const nearest = (qs: OptionQuote[]): OptionQuote | null => {
    let best: OptionQuote | null = null;
    let bestD = Infinity;
    for (const q of qs) {
      const d = Math.abs(q.strike - strike);
      if (d < bestD) {
        bestD = d;
        best = q;
      }
    }
    return best != null && bestD <= tol ? best : null;
  };

  return nearest(primary) ?? nearest(secondary);
}

function greekValue(q: OptionQuote | null, key: GreekKey): number | null {
  if (!q) return null;
  const v = q[key];
  return v != null && isFinite(v) ? v : null;
}

export function GreeksView() {
  const snapshot = useTerminalStore(s => s.snapshot);
  const sviReadout = useTerminalStore(s => s.sviReadout);
  const arbResult = useTerminalStore(s => s.arbResult);
  // Default Terminal edition — in-process chain/snapshot Greeks (tests + desk keyboard path).
  // Users can switch to MacroVol Greeks 1.0 from the edition toggle.
  const [edition, setEdition] = useState<GreeksEdition>('terminal');
  const [subView, setSubView] = useState<SubView>('heatmap');
  const [selectedGreek, setSelectedGreek] = useState<GreekKey>('delta');
  const [quoteSide, setQuoteSide] = useState<QuoteSide>('otm');
  const [moneynessRange, setMoneynessRange] = useState<MoneynessRange>('atm20');
  const [sortMode, setSortMode] = useState<'strike' | 'delta'>('strike');
  const [hoverCell, setHoverCell] = useState<HeatmapCell | null>(null);
  const [selectedCell, setSelectedCell] = useState<HeatmapCell | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dim, setDim] = useState({ w: 600, h: 400 });
  const setDeskContext = useTerminalStore((s) => s.setDeskContext);

  useEffect(() => consumeDeskJumpOnMount(), []);

  useEffect(() => {
    const meta = SUB_VIEWS.find((s) => s.id === subView);
    setDeskContext({ id: meta?.domId ?? null, label: meta?.label ?? 'Heatmap', apis: [] });
    return () => setDeskContext({ id: null, label: null, apis: [] });
  }, [subView, setDeskContext]);

  const portfolio = useMemo(() => snapshot ? portfolioGreeks(snapshot) : null, [snapshot]);
  const move = useMemo(() => snapshot ? impliedMove(snapshot) : null, [snapshot]);

  const diverging = GREEK_META.find(g => g.key === selectedGreek)?.diverging ?? false;

  const { rows, cols, cellMatrix, min, max, fillPct } = useMemo<{
    rows: { expiry: string; dte: number }[];
    cols: number[];
    cellMatrix: HeatmapCell[][];
    min: number;
    max: number;
    fillPct: number;
  }>(() => {
    if (!snapshot) return { rows: [], cols: [], cellMatrix: [], min: 0, max: 0, fillPct: 0 };
    const slices = snapshot.expiries.slice(0, 10);
    const allStrikes = [...new Set(
      slices.flatMap(s => [...s.calls, ...s.puts].map(q => q.strike)),
    )].sort((a, b) => a - b);

    const filteredStrikes = buildStrikeAxis(allStrikes, snapshot.spot, moneynessRange, 21);
    // Match tolerance: half the median strike spacing (or 0.75% of spot).
    let medGap = snapshot.spot * 0.0075;
    if (allStrikes.length >= 2) {
      const gaps: number[] = [];
      for (let i = 1; i < allStrikes.length; i++) {
        gaps.push(allStrikes[i]! - allStrikes[i - 1]!);
      }
      gaps.sort((a, b) => a - b);
      medGap = Math.max(gaps[Math.floor(gaps.length / 2)]! * 0.6, snapshot.spot * 0.002);
    }

    let minVal = Infinity, maxVal = -Infinity;
    let filled = 0;
    let total = 0;
    const rows: { expiry: string; dte: number }[] = [];
    const cellMatrix: HeatmapCell[][] = [];

    for (const slice of slices) {
      rows.push({ expiry: slice.expiry, dte: slice.dte });
      const cellRow: HeatmapCell[] = filteredStrikes.map(strike => {
        const q = pickHeatmapQuote(
          slice.calls,
          slice.puts,
          strike,
          snapshot.spot,
          quoteSide,
          medGap,
        );
        total += 1;
        const v = greekValue(q, selectedGreek);
        if (v != null) {
          filled += 1;
          if (v < minVal) minVal = v;
          if (v > maxVal) maxVal = v;
        }
        return {
          strike,
          dte: slice.dte,
          expiry: slice.expiry,
          value: v,
          quote: q
            ? { type: q.type, mid: q.mid, iv: q.iv, delta: q.delta }
            : undefined,
        };
      });
      cellMatrix.push(cellRow);
    }

    if (!isFinite(minVal) || !isFinite(maxVal)) {
      minVal = 0;
      maxVal = 0;
    }
    // Winsorize color scale to p5–p95 so a few wing outliers don't flatten the map.
    const vals: number[] = [];
    for (const row of cellMatrix) {
      for (const c of row) {
        if (c.value != null && isFinite(c.value)) vals.push(c.value);
      }
    }
    if (vals.length >= 8) {
      vals.sort((a, b) => a - b);
      const p = (q: number) => vals[Math.min(vals.length - 1, Math.floor(q * (vals.length - 1)))]!;
      minVal = p(0.05);
      maxVal = p(0.95);
      if (minVal === maxVal) {
        minVal = vals[0]!;
        maxVal = vals[vals.length - 1]!;
      }
    }

    if (sortMode === 'delta' && filteredStrikes.length > 0) {
      const deltaByStrike = new Map<number, number>();
      for (const row of cellMatrix) {
        for (const cell of row) {
          const d = cell.quote?.delta;
          if (d != null) {
            deltaByStrike.set(cell.strike, (deltaByStrike.get(cell.strike) ?? 0) + Math.abs(d));
          }
        }
      }
      const sortedStrikes = [...filteredStrikes].sort((a, b) =>
        (deltaByStrike.get(b) ?? 0) - (deltaByStrike.get(a) ?? 0),
      );
      const reorderedMatrix: HeatmapCell[][] = cellMatrix.map(row =>
        sortedStrikes.map(s => row[filteredStrikes.indexOf(s)]!),
      );
      return {
        rows,
        cols: sortedStrikes,
        cellMatrix: reorderedMatrix,
        min: minVal,
        max: maxVal,
        fillPct: total > 0 ? filled / total : 0,
      };
    }

    return {
      rows,
      cols: filteredStrikes,
      cellMatrix,
      min: minVal,
      max: maxVal,
      fillPct: total > 0 ? filled / total : 0,
    };
  }, [snapshot, selectedGreek, quoteSide, moneynessRange, sortMode]);

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

    const colors = resolveCanvasColors();
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
          ctx.fillStyle = canvasCellColor(v, min, max, diverging, colors);
        } else {
          ctx.fillStyle = colors.empty;
        }
        ctx.fillRect(x, y, cellW - 1, cellH - 1);

        if (selectedCell && cell && cell.strike === selectedCell.strike && cell.dte === selectedCell.dte) {
          ctx.strokeStyle = colors.brand;
          ctx.lineWidth = 2;
          ctx.strokeRect(x - 0.5, y - 0.5, cellW, cellH);
        }
      }
    }

    // Y-axis labels (strikes).
    ctx.fillStyle = colorWithAlpha(colors.label, 0.9);
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
    ctx.fillStyle = colorWithAlpha(colors.label, 0.7);
    ctx.font = '8px "JetBrains Mono", monospace';
    for (let r = 0; r < nRows; r++) {
      const y = y0 + r * cellH + cellH / 2;
      ctx.fillText(`${rows[r]!.dte}d`, x0 - 3, y);
    }

    // Row mean (left gutter under DTE labels) — by expiry.
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.font = '7px "JetBrains Mono", monospace';
    for (let r = 0; r < nRows; r++) {
      const y = y0 + r * cellH + cellH / 2;
      const agg = aggregates.byExpiry[r];
      if (agg?.mean != null) {
        ctx.fillStyle = colorWithAlpha(colors.label, 0.55);
        // Already showing DTE at this x — skip extra if cramped.
        if (cellH >= 14) {
          ctx.fillText(fmtAggShort(agg.mean, selectedGreek), x0 - 3, y + 8);
        }
      }
    }

    // Title + fill quality.
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = colorWithAlpha(colors.label, 0.65);
    ctx.font = '8px "JetBrains Mono", monospace';
    const greekLabel = GREEK_META.find(g => g.key === selectedGreek)?.label ?? selectedGreek;
    ctx.fillText(
      `${greekLabel} (${quoteSide.toUpperCase()})  ${fmtAggShort(min, selectedGreek)}…${fmtAggShort(max, selectedGreek)}  fill ${(fillPct * 100).toFixed(0)}%`,
      x0,
      1,
    );
  }, [rows, cols, cellMatrix, min, max, diverging, selectedCell, dim, selectedGreek, aggregates, quoteSide, fillPct]);

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

  // MacroVol Greeks 1.0 — independent of terminal snapshot (uses MacroVol API)
  if (edition === 'greeks10') {
    return (
      <div className="flex h-full flex-col">
        <DeskChrome
          dense
          sticky={false}
          trailing={
            <span className="font-mono text-type-2xs text-muted-foreground">
              MacroVol yfinance · OTM · θ/charm per day · same units as Terminal 3D
            </span>
          }
        >
          {/* Edition toggle: solid primary CTA allowed */}
          <button
            type="button"
            onClick={() => setEdition('greeks10')}
            className="rounded bg-primary px-2 py-0.5 font-mono text-type-xs text-primary-foreground"
          >
            Greeks 1.0
          </button>
          <button
            type="button"
            onClick={() => setEdition('terminal')}
            className="rounded px-2 py-0.5 font-mono text-type-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Terminal Greeks
          </button>
        </DeskChrome>
        <div className="min-h-0 flex-1">
          <SectionErrorBoundary name="Greeks 1.0">
            <Suspense fallback={<DeskLoading message={UI_COPY.load.greeks} />}>
              <Greeks10View />
            </Suspense>
          </SectionErrorBoundary>
        </div>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-4">
        <EmptyState
          kind="no-data"
          title="No terminal chain data"
          body={UI_COPY.empty.chain}
          action={
            <button
              type="button"
              onClick={() => setEdition('greeks10')}
              className="rounded bg-primary px-3 py-1.5 font-mono text-type-xs text-primary-foreground"
            >
              Open Greeks 1.0 (MacroVol API)
            </button>
          }
        />
      </div>
    );
  }

  const greekRow1 = GREEK_META.slice(0, 7);
  const greekRow2 = GREEK_META.slice(7);
  const activeDomId = SUB_VIEWS.find((s) => s.id === subView)?.domId ?? 'greeks-sub-heatmap';

  return (
    <div className="flex flex-col h-full">
      {/* Edition + sub-view tabs — sticky for tall greek boards */}
      <DeskChrome
        dense
        trailing={
          <div className="flex flex-wrap items-center gap-2">
            <span className="hidden font-mono text-type-2xs text-muted-foreground lg:inline" title="Unit convention">
              Same units as Greeks 1.0 · source may differ (desk chain vs MacroVol)
            </span>
            <DiagnosticsStrip sviReadout={sviReadout} arbResult={arbResult} data-testid="greeks-diagnostics" />
          </div>
        }
      >
        <button
          type="button"
          onClick={() => setEdition('greeks10')}
          className="mr-1 rounded px-2 py-0.5 font-mono text-type-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          title="MacroVol Greeks desk with IV surface"
        >
          Greeks 1.0
        </button>
        <span className="mx-0.5 text-border">|</span>
        <DeskModeBar
          items={SUB_VIEWS.map((sv) => ({
            id: sv.domId,
            label: sv.label,
          }))}
          activeId={activeDomId}
          onSelect={(domId) => {
            const m = SUB_VIEWS.find((s) => s.domId === domId);
            if (m) setSubView(m.id);
          }}
          asSectionButtons
        />
      </DeskChrome>

      {subView !== 'heatmap' ? (
        <div className="flex-1 p-1 overflow-hidden">
          {subView === 'profile' && (
            <SectionErrorBoundary name="Profile">
              <GreeksProfileView />
            </SectionErrorBoundary>
          )}
          {subView === 'sensitivity' && (
            <SectionErrorBoundary name="Sensitivity">
              <GreeksSensitivityView />
            </SectionErrorBoundary>
          )}
          {subView === 'byexpiry' && (
            <SectionErrorBoundary name="By Expiry">
              <GreeksExpiryView />
            </SectionErrorBoundary>
          )}
          {subView === 'surface3d' && (
            <SectionErrorBoundary name="3D">
              <div className="flex h-full flex-col">
                <div className="border-b border-border px-3 py-1 font-mono text-type-2xs text-muted-foreground">
                  3D mesh = OTM-wing greeks (put K&lt;S, call K≥S), height-scaled min→max for visualization only —
                  not OI-weighted exposure. Prefer Greeks 1.0 surfaces / heatmap for desk work.
                </div>
                <div className="min-h-0 flex-1">
                  <GreeksSurface3D />
                </div>
              </div>
            </SectionErrorBoundary>
          )}
        </div>
      ) : (
        <SectionErrorBoundary name="Heatmap">
          <>
          {/* Compact tool bar */}
          <div className="flex items-center gap-1 px-1 py-0.5 border-b border-border text-type-xs font-mono flex-shrink-0">
            <div className="flex gap-0.5" title="Which option side feeds the greek value">
              {QUOTE_SIDE_OPTIONS.map(s => (
                <button
                  key={s.id}
                  onClick={() => setQuoteSide(s.id)}
                  className={cn(
                    'px-1.5 py-0.5 rounded text-type-2xs',
                    quoteSide === s.id
                      ? s.id === 'puts'
                        ? 'bg-down/20 text-down'
                        : s.id === 'calls'
                          ? 'bg-up/20 text-up'
                          : 'bg-secondary text-foreground ring-1 ring-border'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="flex gap-0.5">
              {MONEYNESS_OPTIONS.map(m => (
                <button
                  key={m.id}
                  onClick={() => setMoneynessRange(m.id)}
                  className={cn('px-1.5 py-0.5 rounded text-type-2xs',
                    moneynessRange === m.id ? 'bg-secondary text-foreground ring-1 ring-border' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <div className="w-px h-4 bg-border mx-1" />
            <button
              onClick={() => setSortMode(s => s === 'delta' ? 'strike' : 'delta')}
              className={cn('px-1.5 py-0.5 rounded text-type-2xs',
                sortMode === 'delta' ? 'bg-secondary text-foreground ring-1 ring-border' : 'text-muted-foreground hover:text-foreground'
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
                  className={cn('px-1.5 py-0.5 rounded text-type-2xs',
                    selectedGreek === g.key ? 'bg-secondary text-foreground ring-1 ring-border' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Explain term={g.key}>{g.label}</Explain>
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-0.5 px-1 py-0.5 border-b border-border text-type-xs font-mono flex-shrink-0">
            <div className="flex gap-0.5">
              {greekRow2.map(g => (
                <button
                  key={g.key}
                  onClick={() => setSelectedGreek(g.key)}
                  className={cn('px-1.5 py-0.5 rounded text-type-2xs',
                    selectedGreek === g.key ? 'bg-secondary text-foreground ring-1 ring-border' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Explain term={g.key}>{g.label}</Explain>
                </button>
              ))}
            </div>
            <div className="flex-1" />
            <span className="text-type-2xs text-muted-foreground">
              {hoverCell ? (
                <span>
                  K {fmtPrice(hoverCell.strike, 0)} · {hoverCell.dte}d · {fmtAggShort(hoverCell.value ?? 0, selectedGreek)}
                  {hoverCell.quote ? ` · ${hoverCell.quote.type} mid ${fmtPrice(hoverCell.quote.mid)}` : ''}
                </span>
              ) : (
                <span>
                  {cols.length}K × {rows.length}T · {(fillPct * 100).toFixed(0)}% filled
                  {snapshot ? ` · spot ${fmtPrice(snapshot.spot)}` : ''}
                </span>
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
            <div data-heatmap-inspector="" className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-amber/40 bg-card px-3 py-1.5 text-type-sm font-mono flex-shrink-0">
              <span className="flex items-center gap-1.5">
                <span className="text-muted-foreground">K</span>
                <span className="text-foreground font-semibold tabular-nums">{fmtPrice(selectedCell.strike, 0)}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-foreground tabular-nums">{selectedCell.dte}d</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-muted-foreground"><Explain term={selectedGreek}>{GREEK_META.find(g => g.key === selectedGreek)?.label ?? selectedGreek}</Explain></span>
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
                    <span className="text-muted-foreground"><Explain term="mid">mid</Explain></span>
                    <span className="text-foreground tabular-nums">{fmtPrice(selectedCell.quote.mid)}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-muted-foreground"><Explain term="impliedVol">IV</Explain></span>
                    <span className="text-foreground tabular-nums">
                      {selectedCell.quote.iv != null ? `${(selectedCell.quote.iv * 100).toFixed(1)}%` : '—'}
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-muted-foreground"><Explain term="delta">Δ</Explain></span>
                    <span className="text-foreground tabular-nums">
                      {selectedCell.quote.delta != null ? selectedCell.quote.delta.toFixed(3) : '—'}
                    </span>
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">no quote</span>
              )}
              {portfolio && (
                <span className="ml-auto flex items-center gap-3 text-type-xs" title="Sum of all listed option greeks — not a position book">
                  <span className="text-muted-foreground">chain Σ</span>
                  <span><Explain term="delta">Δ</Explain> <span className="tabular-nums text-cyan">{fmtSigned(portfolio.delta, 2)}</span></span>
                  <span><Explain term="gamma">Γ</Explain> <span className="tabular-nums text-up">{fmtSigned(portfolio.gamma, 4)}</span></span>
                  <span><Explain term="theta">Θ</Explain> <span className="tabular-nums text-down">{fmtSigned(portfolio.theta, 2)}</span></span>
                  <span><Explain term="vega">ν</Explain> <span className="tabular-nums text-foreground">{fmtSigned(portfolio.vega, 2)}</span></span>
                  {move && <span><Explain term="expectedMove">EM</Explain> <span className="tabular-nums">{fmtPrice(move.move)}</span></span>}
                </span>
              )}
            </div>
          )}
          </>
        </SectionErrorBoundary>
      )}
    </div>
  );
}

function fmtAggShort(v: number, g: string): string {
  if (!isFinite(v)) return '—';
  if (g === 'gamma' || g === 'speed' || g === 'color' || g === 'zomma' || g === 'ultima') return v.toFixed(4);
  return v.toFixed(3);
}
