/**
 * SpotGamma-style session map: GEX by strike (left) + strike × time heat + spot path.
 * Uses browser-local session samples (OI-inferred). Not proprietary MM tape.
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
  type ExposureWeight,
} from '../../lib/options/analytics';
import {
  loadGexSession,
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

const INLINE_H = 220;

function fmtTime(t: number): string {
  const d = new Date(t);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function SessionCanvas({
  series,
  liveProfile,
  spot,
  flip,
}: {
  series: GexSessionSeries | null;
  liveProfile: { strike: number; netGEX: number }[];
  spot: number;
  flip: number | null;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dim, setDim] = useState({ w: 640, h: 280 });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (!r) return;
      const w = Math.max(120, Math.floor(r.width));
      const h = Math.max(120, Math.floor(r.height));
      setDim((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    });
    ro.observe(el);
    // Immediate measure (portal open / first paint)
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) {
      setDim({
        w: Math.max(120, Math.floor(r.width)),
        h: Math.max(120, Math.floor(r.height)),
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
        for (const s of p.profile ?? []) set.add(s.k);
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

    const cols =
      points.length >= 2
        ? points
        : points.length === 1
          ? points
          : [{ t: Date.now(), totalGEX: 0, flip, spot, profile: liveProfile.map((p) => ({ k: p.strike, g: p.netGEX })) }];

    const liveMap = new Map(liveProfile.map((p) => [p.strike, p.netGEX]));
    let min = 0;
    let max = 0;
    let any = false;
    const grid: (number | null)[][] = cols.map((col) => {
      const map = new Map<number, number>();
      if (col.profile?.length) {
        for (const s of col.profile) map.set(s.k, s.g);
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
    const padL = 48;
    const padR = 8;
    const padT = 8;
    const padB = 22;
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

    if (flip != null && strikes.length >= 2) {
      const lo = strikes[0]!;
      const hi = strikes[strikes.length - 1]!;
      if (flip >= lo && flip <= hi) {
        const y = padT + ((hi - flip) / (hi - lo || 1)) * (nR * cellH);
        ctx.strokeStyle = CHART.series.tertiary;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(padL + nC * cellW, y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    if (cols.length >= 1) {
      ctx.strokeStyle = CHART.series.amber;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      let started = false;
      const lo = strikes[0]!;
      const hi = strikes[strikes.length - 1]!;
      for (let ci = 0; ci < cols.length; ci++) {
        const s = cols[ci]!.spot;
        if (!Number.isFinite(s) || s < lo || s > hi) continue;
        const x = padL + (ci + 0.5) * cellW;
        const y = padT + ((hi - s) / (hi - lo || 1)) * (nR * cellH);
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      if (started) ctx.stroke();
      const yNow = padT + ((hi - spot) / (hi - lo || 1)) * (nR * cellH);
      ctx.fillStyle = CHART.series.amber;
      ctx.beginPath();
      ctx.arc(padL + (nC - 0.5) * cellW, yNow, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = colors.label;
    ctx.font = '10px ui-monospace, monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const labelEvery = Math.max(1, Math.floor(nR / 6));
    for (let ri = 0; ri < nR; ri += labelEvery) {
      const strike = strikes[nR - 1 - ri]!;
      const y = padT + (ri + 0.5) * cellH;
      ctx.fillText(fmtPrice(strike, strike >= 1000 ? 0 : 2), padL - 4, y);
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    if (nC >= 1) {
      ctx.fillText(fmtTime(cols[0]!.t), padL + 0.5 * cellW, h - padB + 4);
      if (nC > 1) {
        ctx.fillText(
          fmtTime(cols[nC - 1]!.t),
          padL + (nC - 0.5) * cellW,
          h - padB + 4,
        );
      }
    }

    const lastG = cols[cols.length - 1]?.totalGEX ?? 0;
    if (lastG < 0) {
      ctx.fillStyle = 'rgba(239,68,68,0.12)';
      ctx.fillRect(padL, padT, nC * cellW, nR * cellH);
      ctx.fillStyle = 'rgba(252,165,165,0.95)';
      ctx.font = '11px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Negative γ zone · free to move (OI proxy)', padL + (nC * cellW) / 2, padT + 14);
    }
  }, [dim, series, liveProfile, spot, flip]);

  return (
    <div ref={wrapRef} className="absolute inset-0 min-h-0 min-w-0">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}

function SessionMapBody({
  series,
  liveProfile,
  ladder,
  maxAbs,
  snapshot,
  flip,
}: {
  series: GexSessionSeries | null;
  liveProfile: { strike: number; netGEX: number }[];
  ladder: { strike: number; label: string; gex: number }[];
  maxAbs: number;
  snapshot: VolSnapshot;
  flip: number | null;
}) {
  const { zoomed } = useChartZoom();
  const barH = zoomed ? '100%' : INLINE_H - 28;

  return (
    <div
      className={cn(
        'grid min-h-0 grid-cols-1 gap-1.5 md:grid-cols-[minmax(9rem,0.7fr)_minmax(0,1.6fr)]',
        zoomed ? 'h-full' : '',
      )}
      style={zoomed ? undefined : { height: INLINE_H }}
    >
      <div className="flex min-h-0 flex-col rounded border border-border/60 bg-card/20">
        <div className="shrink-0 border-b border-border/50 px-2 py-0.5 font-mono text-type-2xs text-muted-foreground">
          GEX by strike
        </div>
        <div className="relative min-h-0 flex-1 p-0.5">
          {ladder.length < 2 ? (
            <div className="flex h-full items-center justify-center font-mono text-type-2xs text-muted-foreground">
              No GEX ladder
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={barH}>
              <BarChart
                data={ladder}
                layout="vertical"
                margin={{ top: 2, right: 4, left: 0, bottom: 2 }}
                barCategoryGap={1}
              >
                <XAxis
                  type="number"
                  domain={[-maxAbs * 1.05, maxAbs * 1.05]}
                  tick={{ ...chartAxisTick, fontSize: 8 }}
                  tickFormatter={(v) => fmtCompact(Number(v) * 1e6)}
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
                  formatter={(v: number) => [fmtCompact(v * 1e6), 'net GEX']}
                  labelFormatter={(l) => `K ${l}`}
                />
                <ReferenceLine x={0} stroke={CHART.refLine} />
                <Bar dataKey="gex" isAnimationActive={false} maxBarSize={8}>
                  {ladder.map((d, i) => (
                    <Cell
                      key={i}
                      fill={d.gex >= 0 ? CHART.series.up : CHART.series.down}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
      <div className="relative min-h-0 rounded border border-border/60 bg-card/20">
        <div className="absolute inset-0">
          <SessionCanvas
            series={series}
            liveProfile={liveProfile}
            spot={snapshot.spot}
            flip={flip}
          />
        </div>
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

  useEffect(() => {
    setSeries(loadGexSession(symbol));
    const id = window.setInterval(() => setSeries(loadGexSession(symbol)), 15_000);
    return () => window.clearInterval(id);
  }, [symbol]);

  const exposure = useMemo(
    () => dealerExposure(snapshot, { weight }),
    [snapshot, weight],
  );

  const liveProfile = useMemo(() => {
    const S = snapshot.spot;
    return exposure.points
      .filter((p) => Math.abs(p.strike - S) / S <= 0.12)
      .map((p) => ({ strike: p.strike, netGEX: p.netGEX }));
  }, [exposure, snapshot.spot]);

  const ladder = useMemo(() => {
    const S = snapshot.spot;
    return [...liveProfile]
      .sort((a, b) => Math.abs(a.strike - S) - Math.abs(b.strike - S))
      .slice(0, 24)
      .sort((a, b) => b.strike - a.strike)
      .map((p) => ({
        strike: p.strike,
        label: fmtPrice(p.strike, p.strike >= 1000 ? 0 : 2),
        gex: p.netGEX / 1e6,
      }));
  }, [liveProfile, snapshot.spot]);

  const maxAbs = useMemo(
    () => Math.max(...ladder.map((d) => Math.abs(d.gex)), 0.01),
    [ladder],
  );

  const nPts = series?.points.length ?? 0;
  const subtitle = nPts >= 2
    ? `${nPts} session samples · OI-inferred · not MM inventory`
    : 'Building session samples as you leave the desk open…';

  return (
    <div className={cn('shrink-0 border-t border-border', className)}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 px-2 py-0.5 font-mono text-type-2xs text-muted-foreground">
        <Explain term="gex">
          <span className="font-semibold text-foreground">SESSION GEX MAP</span>
        </Explain>
        <span className="text-muted-foreground/80">strike × time · spot path</span>
        <span className="ml-auto text-muted-foreground/70">{subtitle}</span>
      </div>
      <div className="px-1.5 pb-1.5">
        <ChartZoom
          title={`${symbol} session GEX map`}
          subtitle={subtitle}
          bodyClassName="min-h-0"
          expandedHeightClass="h-[min(90vh,960px)]"
        >
          <SessionMapBody
            series={series}
            liveProfile={liveProfile}
            ladder={ladder}
            maxAbs={maxAbs}
            snapshot={snapshot}
            flip={exposure.gammaFlip}
          />
        </ChartZoom>
      </div>
    </div>
  );
}
