/**
 * VS3D / TRACE session desk:
 *   Positions by Strike ‖ Session Gamma ‖ Session Charm
 *
 * Heat = strike × time from browser-local samples (OI-inferred).
 * Not proprietary MM inventory · not 1-min HIRO.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { VolSnapshot } from '../../lib/options/types';
import {
  dealerExposure,
  impliedMove,
  type ExposureWeight,
} from '../../lib/options/analytics';
import {
  loadGexSession,
  type GexSessionPoint,
  type GexSessionSeries,
} from '../../lib/options/gexSession';
import { fmtCompact, fmtPrice } from '../../lib/format';
import { Explain } from '../common/Explain';
import { ChartZoom, useChartZoom } from '../common/ChartZoom';
import { cn } from '../../lib/utils';
import {
  CHART,
  chartAxisTick,
  chartTooltipStyle,
  canvasCellColor,
  resolveCanvasColors,
} from '../../lib/chartTheme';

type Props = {
  snapshot: VolSnapshot;
  symbol: string;
  weight?: ExposureWeight;
  className?: string;
};

type LadderMode = 'gex' | 'oi';
type FieldMetric = 'gex' | 'charm';

const INLINE_H = 240;

function fmtTime(t: number): string {
  const d = new Date(t);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function profileFromPoint(pt: GexSessionPoint, metric: FieldMetric): { k: number; g: number }[] {
  if (metric === 'charm') {
    return pt.charmProfile ?? [];
  }
  return pt.profile ?? [];
}

function SessionFieldCanvas({
  series,
  liveProfile,
  spot,
  flip,
  callWall,
  putWall,
  straddle,
  metric,
  zoneLabel,
}: {
  series: GexSessionSeries | null;
  liveProfile: { strike: number; value: number }[];
  spot: number;
  flip: number | null;
  callWall: number | null;
  putWall: number | null;
  straddle: number;
  metric: FieldMetric;
  zoneLabel: string | null;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dim, setDim] = useState({ w: 320, h: 220 });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (!r) return;
      const w = Math.max(100, Math.floor(r.width));
      const h = Math.max(100, Math.floor(r.height));
      setDim((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    });
    ro.observe(el);
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) {
      setDim({
        w: Math.max(100, Math.floor(r.width)),
        h: Math.max(100, Math.floor(r.height)),
      });
    }
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const { w, h } = dim;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const points = series?.points ?? [];
    const strikes = (() => {
      const set = new Set<number>();
      for (const p of points) {
        for (const s of profileFromPoint(p, metric)) set.add(s.k);
      }
      for (const p of liveProfile) set.add(p.strike);
      let arr = [...set].sort((a, b) => a - b);
      if (arr.length === 0) {
        for (let i = -8; i <= 8; i++) arr.push(Math.round(spot * (1 + i * 0.01)));
      }
      if (arr.length > 48) {
        arr = arr
          .sort((a, b) => Math.abs(a - spot) - Math.abs(b - spot))
          .slice(0, 48)
          .sort((a, b) => a - b);
      }
      return arr;
    })();

    const cols: GexSessionPoint[] =
      points.length >= 1
        ? points
        : [
            {
              t: Date.now(),
              totalGEX: 0,
              flip,
              spot,
              profile: liveProfile.map((p) => ({ k: p.strike, g: p.value })),
              charmProfile: liveProfile.map((p) => ({ k: p.strike, g: p.value })),
            },
          ];

    const liveMap = new Map(liveProfile.map((p) => [p.strike, p.value]));
    let min = 0;
    let max = 0;
    let any = false;
    const grid: (number | null)[][] = cols.map((col) => {
      const map = new Map<number, number>();
      const prof = profileFromPoint(col, metric);
      if (prof.length) {
        for (const s of prof) map.set(s.k, s.g);
      } else {
        for (const [k, g] of liveMap) map.set(k, g);
      }
      return strikes.map((k) => {
        const v = map.get(k) ?? null;
        if (v != null && Number.isFinite(v)) {
          if (!any) {
            min = max = v;
            any = true;
          } else {
            min = Math.min(min, v);
            max = Math.max(max, v);
          }
        }
        return v;
      });
    });
    if (!any) {
      min = -1;
      max = 1;
    }
    const abs = Math.max(Math.abs(min), Math.abs(max), 1e-9);
    min = -abs;
    max = abs;

    const colors = resolveCanvasColors();
    const padL = 40;
    const padR = 6;
    const padT = 18;
    const padB = 20;
    const nR = strikes.length;
    const nC = cols.length;
    const cellW = Math.max(2, (w - padL - padR) / nC);
    const cellH = Math.max(2, (h - padT - padB) / nR);

    for (let ri = 0; ri < nR; ri++) {
      const strike = strikes[nR - 1 - ri]!;
      for (let ci = 0; ci < nC; ci++) {
        const v = grid[ci]?.[strikes.indexOf(strike)] ?? null;
        const x = padL + ci * cellW;
        const y = padT + ri * cellH;
        if (v != null && Number.isFinite(v)) {
          ctx.fillStyle = canvasCellColor(v, min, max, true, colors);
        } else {
          ctx.fillStyle = colors.empty;
        }
        ctx.fillRect(x, y, cellW + 0.5, cellH + 0.5);
      }
    }

    const lo = strikes[0]!;
    const hi = strikes[strikes.length - 1]!;
    const yFor = (price: number) =>
      padT + ((hi - price) / (hi - lo || 1)) * (nR * cellH);

    // ±1 ATM straddle rails
    if (straddle > 0 && Number.isFinite(straddle)) {
      ctx.strokeStyle = 'rgba(148,163,184,0.55)';
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;
      for (const p of [spot + straddle, spot - straddle]) {
        if (p < lo || p > hi) continue;
        const y = yFor(p);
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(padL + nC * cellW, y);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // Call resistance / put support
    for (const [price, color] of [
      [callWall, CHART.series.up],
      [putWall, CHART.series.down],
    ] as const) {
      if (price == null || price < lo || price > hi) continue;
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.7;
      ctx.setLineDash([6, 3]);
      ctx.beginPath();
      ctx.moveTo(padL, yFor(price));
      ctx.lineTo(padL + nC * cellW, yFor(price));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

    if (flip != null && flip >= lo && flip <= hi) {
      ctx.strokeStyle = CHART.series.tertiary;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(padL, yFor(flip));
      ctx.lineTo(padL + nC * cellW, yFor(flip));
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Spot path
    if (cols.length >= 1) {
      ctx.strokeStyle = CHART.series.amber;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      let started = false;
      for (let ci = 0; ci < cols.length; ci++) {
        const s = cols[ci]!.spot;
        if (!Number.isFinite(s) || s < lo || s > hi) continue;
        const x = padL + (ci + 0.5) * cellW;
        const y = yFor(s);
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      if (started) ctx.stroke();
      const yNow = yFor(spot);
      ctx.fillStyle = CHART.series.amber;
      ctx.beginPath();
      ctx.arc(padL + (nC - 0.5) * cellW, yNow, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Zone label (SpotGamma teaching)
    if (zoneLabel) {
      ctx.fillStyle = 'rgba(15,23,42,0.55)';
      ctx.fillRect(padL + 4, padT + 2, Math.min(w - padL - 12, 220), 14);
      ctx.fillStyle = metric === 'charm' ? 'rgba(250,204,21,0.95)' : 'rgba(252,165,165,0.95)';
      ctx.font = '10px ui-monospace, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(zoneLabel, padL + 8, padT + 4);
    }

    ctx.fillStyle = colors.label;
    ctx.font = '9px ui-monospace, monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const labelEvery = Math.max(1, Math.floor(nR / 5));
    for (let ri = 0; ri < nR; ri += labelEvery) {
      const strike = strikes[nR - 1 - ri]!;
      const y = padT + (ri + 0.5) * cellH;
      ctx.fillText(fmtPrice(strike, strike >= 1000 ? 0 : 2), padL - 3, y);
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    if (nC >= 1) {
      ctx.fillText(fmtTime(cols[0]!.t), padL + 0.5 * cellW, h - padB + 3);
      if (nC > 1) {
        ctx.fillText(fmtTime(cols[nC - 1]!.t), padL + (nC - 0.5) * cellW, h - padB + 3);
      }
    }
  }, [dim, series, liveProfile, spot, flip, callWall, putWall, straddle, metric, zoneLabel]);

  return (
    <div ref={wrapRef} className="absolute inset-0 min-h-0 min-w-0">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}

function LadderPane({
  rows,
  maxAbs,
  mode,
  spot,
  straddle,
  flip,
}: {
  rows: { strike: number; label: string; left: number; right: number; net: number }[];
  maxAbs: number;
  mode: LadderMode;
  spot: number;
  straddle: number;
  flip: number | null;
}) {
  const { zoomed } = useChartZoom();
  const barH = zoomed ? '100%' : INLINE_H - 32;

  if (rows.length < 2) {
    return (
      <div className="flex h-full min-h-[10rem] items-center justify-center font-mono text-type-2xs text-muted-foreground">
        No ladder
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-black">
      <div className="flex flex-wrap items-center gap-x-2 border-b border-border/50 px-2 py-0.5">
        <span className="font-mono text-type-2xs font-semibold text-foreground">
          {mode === 'gex' ? 'GEX BY STRIKE' : 'POS BY STRIKE'}
        </span>
        <span className="font-mono text-type-2xs text-zinc-500">
          {mode === 'gex' ? '−γ ← · +γ →' : 'put ← · call →'}
        </span>
      </div>
      <div className="relative min-h-0 flex-1 bg-black p-0.5">
        <ResponsiveContainer width="100%" height={barH}>
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 2, right: 4, left: 0, bottom: 2 }}
            barCategoryGap={1}
            barGap={0}
          >
            <XAxis
              type="number"
              domain={[-maxAbs * 1.05, maxAbs * 1.05]}
              tick={{ ...chartAxisTick, fontSize: 8 }}
              tickFormatter={(v) =>
                mode === 'gex' ? fmtCompact(Number(v) * 1e6) : fmtCompact(Math.abs(Number(v)))
              }
              height={14}
            />
            <YAxis
              type="category"
              dataKey="label"
              tick={{ ...chartAxisTick, fontSize: 8 }}
              width={36}
              interval={0}
            />
            <Tooltip
              contentStyle={chartTooltipStyle}
              formatter={(v: number, name: string) => {
                if (mode === 'gex') {
                  return [fmtCompact(v * 1e6), name];
                }
                return [Math.abs(v).toLocaleString(), name];
              }}
              labelFormatter={(l) => `K ${l}`}
            />
            <ReferenceLine x={0} stroke={CHART.refLine} />
            {straddle > 0 && (
              <>
                <ReferenceLine
                  y={fmtPrice(spot + straddle, spot >= 1000 ? 0 : 2)}
                  stroke="rgba(148,163,184,0.5)"
                  strokeDasharray="3 3"
                />
                <ReferenceLine
                  y={fmtPrice(spot - straddle, spot >= 1000 ? 0 : 2)}
                  stroke="rgba(148,163,184,0.5)"
                  strokeDasharray="3 3"
                />
              </>
            )}
            {flip != null && (
              <ReferenceLine
                y={fmtPrice(flip, flip >= 1000 ? 0 : 2)}
                stroke={CHART.series.tertiary}
                strokeDasharray="4 3"
              />
            )}
            {mode === 'gex' ? (
              <Bar dataKey="net" isAnimationActive={false} maxBarSize={8}>
                {rows.map((d, i) => (
                  <Cell
                    key={i}
                    fill={d.net >= 0 ? CHART.series.up : CHART.series.down}
                  />
                ))}
              </Bar>
            ) : (
              <>
                <Bar
                  dataKey="left"
                  fill={CHART.series.warn}
                  name="puts"
                  isAnimationActive={false}
                  maxBarSize={7}
                  stackId="a"
                />
                <Bar
                  dataKey="right"
                  fill={CHART.series.info}
                  name="calls"
                  isAnimationActive={false}
                  maxBarSize={7}
                  stackId="a"
                />
              </>
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function FieldPane({
  title,
  term,
  blurb,
  series,
  liveProfile,
  snapshot,
  flip,
  callWall,
  putWall,
  straddle,
  metric,
  zoneLabel,
}: {
  title: string;
  term: string;
  blurb: string;
  series: GexSessionSeries | null;
  liveProfile: { strike: number; value: number }[];
  snapshot: VolSnapshot;
  flip: number | null;
  callWall: number | null;
  putWall: number | null;
  straddle: number;
  metric: FieldMetric;
  zoneLabel: string | null;
}) {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col rounded border border-border bg-black">
      <div className="flex flex-wrap items-center justify-between gap-x-2 border-b border-border/50 px-2 py-0.5">
        <div className="flex flex-wrap items-center gap-x-2">
          <Explain term={term}>
            <span className="font-mono text-type-2xs font-semibold text-foreground">{title}</span>
          </Explain>
          <span className="font-mono text-type-2xs text-zinc-500">{blurb}</span>
        </div>
        <span className="font-mono text-type-2xs text-zinc-500">Strike ↑ · time →</span>
      </div>
      <div className="relative min-h-0 flex-1 bg-black">
        <SessionFieldCanvas
          series={series}
          liveProfile={liveProfile}
          spot={snapshot.spot}
          flip={flip}
          callWall={callWall}
          putWall={putWall}
          straddle={straddle}
          metric={metric}
          zoneLabel={zoneLabel}
        />
      </div>
    </div>
  );
}

function SessionTraceBody({
  series,
  gexLive,
  charmLive,
  ladderRows,
  maxAbs,
  ladderMode,
  snapshot,
  flip,
  callWall,
  putWall,
  straddle,
  gexZone,
  charmZone,
}: {
  series: GexSessionSeries | null;
  gexLive: { strike: number; value: number }[];
  charmLive: { strike: number; value: number }[];
  ladderRows: { strike: number; label: string; left: number; right: number; net: number }[];
  maxAbs: number;
  ladderMode: LadderMode;
  snapshot: VolSnapshot;
  flip: number | null;
  callWall: number | null;
  putWall: number | null;
  straddle: number;
  gexZone: string | null;
  charmZone: string | null;
}) {
  const { zoomed } = useChartZoom();
  return (
    <div
      className={cn(
        'grid min-h-0 grid-cols-1 gap-1.5',
        'md:grid-cols-2',
        'xl:grid-cols-[minmax(10rem,0.85fr)_minmax(0,1.25fr)_minmax(0,1.25fr)]',
        zoomed ? 'h-full' : '',
      )}
      style={zoomed ? undefined : { minHeight: INLINE_H }}
    >
      <div
        className="min-h-[12rem] rounded border border-border bg-black md:row-span-2 xl:row-span-1"
        style={zoomed ? undefined : { height: INLINE_H }}
      >
        <LadderPane
          rows={ladderRows}
          maxAbs={maxAbs}
          mode={ladderMode}
          spot={snapshot.spot}
          straddle={straddle}
          flip={flip}
        />
      </div>
      <div style={zoomed ? undefined : { height: INLINE_H }} className="min-h-[12rem]">
        <FieldPane
          title="SESSION γ"
          term="gex"
          blurb="K × time · dampen / free-to-move"
          series={series}
          liveProfile={gexLive}
          snapshot={snapshot}
          flip={flip}
          callWall={callWall}
          putWall={putWall}
          straddle={straddle}
          metric="gex"
          zoneLabel={gexZone}
        />
      </div>
      <div style={zoomed ? undefined : { height: INLINE_H }} className="min-h-[12rem]">
        <FieldPane
          title="SESSION CHARM"
          term="charmExposure"
          blurb="K × time · MM buy/sell bias"
          series={series}
          liveProfile={charmLive}
          snapshot={snapshot}
          flip={flip}
          callWall={callWall}
          putWall={putWall}
          straddle={straddle}
          metric="charm"
          zoneLabel={charmZone}
        />
      </div>
    </div>
  );
}

export function SessionGexHeatmap({
  snapshot,
  symbol,
  weight = 'oi',
  className,
}: Props) {
  const [series, setSeries] = useState<GexSessionSeries | null>(null);
  const [ladderMode, setLadderMode] = useState<LadderMode>('gex');

  useEffect(() => {
    setSeries(loadGexSession(symbol));
    const id = window.setInterval(() => setSeries(loadGexSession(symbol)), 15_000);
    return () => window.clearInterval(id);
  }, [symbol]);

  const exposure = useMemo(
    () => dealerExposure(snapshot, { weight }),
    [snapshot, weight],
  );

  const move = useMemo(() => impliedMove(snapshot), [snapshot]);
  const straddle = move.straddle > 0 ? move.straddle : 0;

  const S = snapshot.spot;
  const band = 0.12;

  const gexLive = useMemo(
    () =>
      exposure.points
        .filter((p) => Math.abs(p.strike - S) / S <= band)
        .map((p) => ({ strike: p.strike, value: p.netGEX })),
    [exposure, S],
  );

  const charmLive = useMemo(
    () =>
      exposure.points
        .filter((p) => Math.abs(p.strike - S) / S <= band)
        .map((p) => ({ strike: p.strike, value: p.netCharm })),
    [exposure, S],
  );

  const ladderRows = useMemo(() => {
    const near = exposure.points
      .filter((p) => Math.abs(p.strike - S) / S <= band)
      .sort((a, b) => Math.abs(a.strike - S) - Math.abs(b.strike - S))
      .slice(0, 24)
      .sort((a, b) => b.strike - a.strike);

    if (ladderMode === 'gex') {
      return near.map((p) => ({
        strike: p.strike,
        label: fmtPrice(p.strike, p.strike >= 1000 ? 0 : 2),
        left: 0,
        right: 0,
        net: p.netGEX / 1e6,
      }));
    }

    // Net listed OI position proxy (call OI − put OI), not MM book
    const byK = new Map<number, { calls: number; puts: number }>();
    for (const slice of snapshot.expiries) {
      for (const q of slice.calls) {
        if (Math.abs(q.strike - S) / S > band) continue;
        const w = Math.max(0, q.openInterest ?? 0);
        if (w <= 0) continue;
        const cur = byK.get(q.strike) ?? { calls: 0, puts: 0 };
        cur.calls += w;
        byK.set(q.strike, cur);
      }
      for (const q of slice.puts) {
        if (Math.abs(q.strike - S) / S > band) continue;
        const w = Math.max(0, q.openInterest ?? 0);
        if (w <= 0) continue;
        const cur = byK.get(q.strike) ?? { calls: 0, puts: 0 };
        cur.puts += w;
        byK.set(q.strike, cur);
      }
    }
    return [...byK.entries()]
      .map(([strike, v]) => ({
        strike,
        label: fmtPrice(strike, strike >= 1000 ? 0 : 2),
        left: -v.puts,
        right: v.calls,
        net: v.calls - v.puts,
      }))
      .sort((a, b) => Math.abs(a.strike - S) - Math.abs(b.strike - S))
      .slice(0, 24)
      .sort((a, b) => b.strike - a.strike);
  }, [exposure, snapshot, S, ladderMode]);

  const maxAbs = useMemo(() => {
    if (ladderMode === 'gex') {
      return Math.max(...ladderRows.map((d) => Math.abs(d.net)), 0.01);
    }
    return Math.max(...ladderRows.map((d) => Math.max(d.right, -d.left)), 1);
  }, [ladderRows, ladderMode]);

  // SpotGamma zone language from net GEX + flip
  const gexZone = useMemo(() => {
    const tot = exposure.totalGEX;
    if (!Number.isFinite(tot)) return null;
    if (tot < 0) return '−γ free-to-move (OI proxy)';
    if (exposure.gammaFlip != null && S < exposure.gammaFlip) {
      return '+γ below flip · check walls';
    }
    return '+γ resistance / dampen (OI proxy)';
  }, [exposure.totalGEX, exposure.gammaFlip, S]);

  const charmZone = useMemo(() => {
    const tot = exposure.totalCharm;
    if (!Number.isFinite(tot) || Math.abs(tot) < 1e-6) return 'Charm building…';
    // Positive charm under customer-long convention ≈ buy-futures bias as clock runs (education)
    return tot >= 0
      ? 'Charm ≥ 0 · buy-futures bias (OI proxy)'
      : 'Charm < 0 · sell-futures bias (OI proxy)';
  }, [exposure.totalCharm]);

  const nPts = series?.points.length ?? 0;
  const hasCharmSamples = series?.points.some((p) => (p.charmProfile?.length ?? 0) > 0) ?? false;
  const subtitle =
    nPts >= 2
      ? `${nPts} session samples${hasCharmSamples ? ' · γ+charm' : ' · γ'} · OI-inferred · not MM inventory`
      : 'Building session samples while desk stays open…';

  return (
    <div className={cn('shrink-0 border-t border-border', className)}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 px-2 py-0.5 font-mono text-type-2xs text-muted-foreground">
        <span className="font-semibold text-foreground">3-PANE SESSION</span>
        <Explain term="dealerGradient">
          <span className="cursor-help underline decoration-dotted">pos · γ · charm</span>
        </Explain>
        <span className="text-muted-foreground/80">TRACE/VS3D jobs · K×time · not HIRO</span>
        <div className="ml-1 flex gap-0.5">
          {(
            [
              ['gex', 'GEX'],
              ['oi', 'Net OI'],
            ] as const
          ).map(([id, lab]) => (
            <button
              key={id}
              type="button"
              onClick={() => setLadderMode(id)}
              className={cn(
                'rounded border px-1.5 py-0.5 font-mono text-type-2xs',
                ladderMode === id
                  ? 'border-amber bg-amber/10 text-amber'
                  : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {lab}
            </button>
          ))}
        </div>
        {straddle > 0 && (
          <span className="text-muted-foreground/70" title="±1 ATM straddle rails">
            ±1 straddle {fmtPrice(straddle, straddle >= 10 ? 1 : 2)}
          </span>
        )}
        <span className="ml-auto text-muted-foreground/70">{subtitle}</span>
      </div>
      <div className="px-1.5 pb-1.5">
        <ChartZoom
          title={`${symbol} session · pos · γ · charm`}
          subtitle={subtitle}
          bodyClassName="min-h-0"
          expandedHeightClass="h-[min(90vh,960px)]"
        >
          <SessionTraceBody
            series={series}
            gexLive={gexLive}
            charmLive={charmLive}
            ladderRows={ladderRows}
            maxAbs={maxAbs}
            ladderMode={ladderMode}
            snapshot={snapshot}
            flip={exposure.gammaFlip}
            callWall={exposure.callWall}
            putWall={exposure.putWall}
            straddle={straddle}
            gexZone={gexZone}
            charmZone={charmZone}
          />
        </ChartZoom>
      </div>
      <div className="px-2 pb-1 font-mono text-type-2xs leading-snug text-muted-foreground">
        Green/red γ = dampen vs free-to-move · Gold/blue charm = futures buy/sell bias as clock runs
        (education) · dashed rails = CR/PS/flip · grey dashed = ±1 ATM straddle · OI dealer convention.
      </div>
    </div>
  );
}
