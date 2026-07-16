import { useMemo } from 'react';
import type { SurfaceGrid } from '../../../lib/options/types';
import type { NoArbResult } from '../../../lib/options/noarb';
import type { SurfaceWingMode } from '../../../lib/options/synthetic';
import { smileSlice, termSlice, exportSurfaceToCSV, exportSurfaceToJSON, type SVIReadout, type SmileSlice, type TermSlice } from '../../../lib/options/surfaceTools';
import { useTerminalStore } from '../../../store/terminalStore';
import { cn } from '../../../lib/utils';

export type SliceMode = 'none' | 'smile' | 'term';

const WING_MODES: { id: SurfaceWingMode; label: string }[] = [
  { id: 'otm', label: 'OTM' },
  { id: 'itm', label: 'ITM' },
  { id: 'all', label: 'ALL' },
];

function downloadFile(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function useSurfaceExport(surface: SurfaceGrid | null) {
  return useMemo(() => ({
    csv: () => {
      if (!surface) return;
      downloadFile(`surface-${surface.expiries[0] ?? 'export'}.csv`, exportSurfaceToCSV(surface), 'text/csv');
    },
    json: () => {
      if (!surface) return;
      downloadFile(`surface-${surface.expiries[0] ?? 'export'}.json`, JSON.stringify(exportSurfaceToJSON(surface), null, 2), 'application/json');
    },
  }), [surface]);
}

export function SurfaceTools({
  surface,
  sviReadout,
  arbResult,
  sliceMode,
  onSliceMode,
  selectedExpiry,
  selectedStrike,
}: {
  surface: SurfaceGrid | null;
  sviReadout: SVIReadout | null;
  arbResult: NoArbResult | null;
  sliceMode: SliceMode;
  onSliceMode: (mode: SliceMode) => void;
  selectedExpiry: string | null;
  selectedStrike: number | null;
}) {
  const exports = useSurfaceExport(surface);
  const source = useTerminalStore(s => s.source);
  const liveAvailable = useTerminalStore(s => s.liveAvailable);
  const chainAvailable = useTerminalStore(s => s.chainAvailable);
  const surfaceWingMode = useTerminalStore(s => s.surfaceWingMode);
  const setSurfaceWingMode = useTerminalStore(s => s.setSurfaceWingMode);

  // Live only when chain surface is available; quote-only is Spot only.
  const sourceLabel =
    source === 'live' && chainAvailable
      ? 'Live'
      : source === 'live' && liveAvailable
        ? 'Spot only'
        : 'Waiting';
  const sourceDotClass =
    sourceLabel === 'Live' ? 'bg-up' : sourceLabel === 'Spot only' ? 'bg-cyan' : 'bg-amber';

  return (
    <div className="absolute top-3 right-3 flex flex-col gap-2 w-56 text-type-xs font-mono">
      <div className="bg-card border border-border rounded p-2 flex flex-col gap-1">
        <div className="text-muted-foreground uppercase tracking-wider">Source</div>
        <div className="flex items-center gap-1" data-testid="source-badge">
          <span className={cn('inline-block w-1.5 h-1.5 rounded-full', sourceDotClass)} />
          {sourceLabel}
        </div>
      </div>

      <div className="bg-card border border-border rounded p-2 flex flex-col gap-2" data-testid="wing-mode-panel">
        <div className="text-muted-foreground uppercase tracking-wider">Chain side</div>
        <div className="flex gap-1">
          {WING_MODES.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              data-testid={`wing-mode-${id}`}
              onClick={() => setSurfaceWingMode(id)}
              className={cn(
                'flex-1 px-1 py-0.5 rounded border border-border text-type-2xs uppercase',
                surfaceWingMode === id
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:bg-muted',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-type-2xs text-muted-foreground leading-snug">
          {surfaceWingMode === 'otm' && 'Desk default: OTM puts below spot, OTM calls above.'}
          {surfaceWingMode === 'itm' && 'ITM side: deep ITM IVs — often unstable near intrinsic.'}
          {surfaceWingMode === 'all' && 'Average call+put IV when both quote; else whatever the API has.'}
        </p>
      </div>

      <div className="bg-card border border-border rounded p-2 flex flex-col gap-2">
        <div className="text-muted-foreground uppercase tracking-wider">SVI Readout</div>
        {sviReadout ? (
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-foreground">
            <span className="text-muted-foreground">a</span>
            <span className="tabular-nums text-right">{sviReadout.params.a.toFixed(4)}</span>
            <span className="text-muted-foreground">b</span>
            <span className="tabular-nums text-right">{sviReadout.params.b.toFixed(4)}</span>
            <span className="text-muted-foreground">ρ</span>
            <span className="tabular-nums text-right">{sviReadout.params.rho.toFixed(4)}</span>
            <span className="text-muted-foreground">m</span>
            <span className="tabular-nums text-right">{sviReadout.params.m.toFixed(4)}</span>
            <span className="text-muted-foreground">σ</span>
            <span className="tabular-nums text-right">{sviReadout.params.sigma.toFixed(4)}</span>
            <span className="text-muted-foreground">RMSE</span>
            <span className="tabular-nums text-right">{(sviReadout.rmse * 100).toFixed(2)}%</span>
            <span className="text-muted-foreground">n</span>
            <span className="tabular-nums text-right">{sviReadout.samples}</span>
          </div>
        ) : (
          <div className="text-muted-foreground">No fit available</div>
        )}
      </div>

      <div className="bg-card border border-border rounded p-2 flex flex-col gap-2">
        <div className="text-muted-foreground uppercase tracking-wider">Arbitrage</div>
        {arbResult ? (
          <div className="flex flex-col gap-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Calendar</span>
              <span className={arbResult.calendar.violations ? 'text-down' : 'text-up'}>
                {arbResult.calendar.violations}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Butterfly</span>
              <span className={arbResult.butterfly.violations ? 'text-down' : 'text-up'}>
                {arbResult.butterfly.violations}
              </span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-muted-foreground">Status</span>
              <span className={arbResult.clean ? 'text-up' : 'text-down'}>
                {arbResult.clean ? 'Clean' : 'Arb'}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-muted-foreground">No diagnostics</div>
        )}
      </div>

      <div className="bg-card border border-border rounded p-2 flex flex-col gap-2">
        <div className="text-muted-foreground uppercase tracking-wider">Slice</div>
        <div className="flex gap-1">
          {(['none', 'smile', 'term'] as SliceMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => onSliceMode(mode)}
              className={`flex-1 px-1 py-0.5 rounded border border-border text-type-2xs uppercase ${
                sliceMode === mode ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
        {sliceMode !== 'none' && surface && (
          <SliceOverlay
            surface={surface}
            mode={sliceMode}
            selectedExpiry={selectedExpiry}
            selectedStrike={selectedStrike}
          />
        )}
      </div>

      <div className="bg-card border border-border rounded p-2 flex flex-col gap-2">
        <div className="text-muted-foreground uppercase tracking-wider">Export</div>
        <div className="flex gap-2">
          <button
            onClick={exports.csv}
            disabled={!surface}
            className="flex-1 px-2 py-1 rounded border border-border text-muted-foreground hover:bg-muted disabled:opacity-40"
          >
            CSV
          </button>
          <button
            onClick={exports.json}
            disabled={!surface}
            className="flex-1 px-2 py-1 rounded border border-border text-muted-foreground hover:bg-muted disabled:opacity-40"
          >
            JSON
          </button>
        </div>
      </div>
    </div>
  );
}

function SliceOverlay({
  surface,
  mode,
  selectedExpiry,
  selectedStrike,
}: {
  surface: SurfaceGrid;
  mode: SliceMode;
  selectedExpiry: string | null;
  selectedStrike: number | null;
}) {
  const data = useMemo(() => {
    if (mode === 'smile') {
      const expiry = selectedExpiry ?? surface.expiries[0];
      const idx = surface.expiries.indexOf(expiry ?? '');
      if (idx < 0) return null;
      return smileSlice(surface, idx);
    }
    const strike = selectedStrike ?? surface.strikes[Math.floor(surface.strikes.length / 2)]!;
    return termSlice(surface, strike);
  }, [surface, mode, selectedExpiry, selectedStrike]);

  if (!data || data.ivs.length < 2) return <div className="text-muted-foreground text-type-2xs">No slice data</div>;

  const xs: number[] = mode === 'smile' ? (data as SmileSlice).strikes : (data as TermSlice).dtes;
  const label = mode === 'smile' ? 'Strike' : 'DTE';
  const min = Math.min(...xs);
  const max = Math.max(...xs);
  const range = max - min || 1;
  const ivMin = Math.min(...data.ivs);
  const ivMax = Math.max(...data.ivs);
  const ivRange = ivMax - ivMin || 1;

  const points = xs.map((x: number, i: number) => {
    const px = ((x - min) / range) * 100;
    const py = 50 - ((data.ivs[i]! - ivMin) / ivRange) * 40;
    return `${px},${py}`;
  }).join(' ');

  return (
    <div className="flex flex-col gap-1">
      <svg viewBox="0 0 100 55" className="w-full h-16">
        <polyline
          fill="none"
          stroke="var(--cyan, #22d3ee)"
          strokeWidth="1"
          points={points}
        />
        {[0, 50, 100].map(t => (
          <line key={t} x1={t} y1={50} x2={t} y2="52" stroke="var(--muted-foreground)" strokeWidth="0.5" />
        ))}
      </svg>
      <div className="flex justify-between text-type-2xs text-muted-foreground">
        <span>{mode === 'smile' ? label : `${label} ${min}`}</span>
        <span>{mode === 'smile' ? `${max}` : `${max}`}</span>
      </div>
      <div className="text-type-2xs text-muted-foreground text-center">
        IV {(ivMin * 100).toFixed(1)}% – {(ivMax * 100).toFixed(1)}%
      </div>
    </div>
  );
}
