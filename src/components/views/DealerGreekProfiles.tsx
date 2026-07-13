/**
 * VS3D-style Gamma + Charm profiles by strike (OI-inferred dealer convention).
 * Teaching zones: +γ dampens / −γ amplifies; charm = futures buy/sell bias as clock runs.
 * Straddle rails = front ATM straddle ±1σ (not price targets).
 *
 * Heights are fixed when inline (avoids Recharts ResponsiveContainer infinite growth).
 * When ChartZoom is open, panels fill the overlay.
 */
import { useMemo, type ReactNode } from 'react';
import {
  Bar, CartesianGrid, Cell, ComposedChart, Line, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { VolSnapshot } from '../../lib/options/types';
import {
  dealerExposure,
  dealerProfiles,
  impliedMove,
  type ExposureWeight,
} from '../../lib/options/analytics';
import { fmtCompact, fmtPrice } from '../../lib/format';
import { Explain } from '../common/Explain';
import { ChartZoom, useChartZoom } from '../common/ChartZoom';
import {
  CHART,
  chartAxisTick,
  chartGridProps,
  chartTooltipStyle,
} from '../../lib/chartTheme';
import { cn } from '../../lib/utils';

type Props = {
  snapshot: VolSnapshot;
  weight?: ExposureWeight;
  /** Optional expiry ISO to isolate one book. */
  expiry?: string | null;
  /** e.g. 0 for 0DTE book. */
  maxDte?: number | null;
  className?: string;
};

/** Fixed desk height for profile charts (px). Zoom uses 100% of overlay instead. */
const PROFILE_H = 200;

function ProfilePane({
  title,
  hint,
  footer,
  children,
}: {
  title: string;
  hint: string;
  footer: string;
  children: ReactNode;
}) {
  const { zoomed } = useChartZoom();
  return (
    <div
      className={cn(
        'flex min-h-0 flex-col rounded border border-border bg-card/40',
        zoomed ? 'h-full min-h-0' : '',
      )}
    >
      <div className="shrink-0 border-b border-border px-2 py-1 font-mono text-type-2xs text-foreground">
        {title}
        <span className="ml-2 text-muted-foreground">{hint}</span>
      </div>
      <div
        className={cn('min-h-0 p-1', zoomed ? 'flex-1' : '')}
        style={zoomed ? undefined : { height: PROFILE_H }}
      >
        {children}
      </div>
      <p className="shrink-0 border-t border-border px-2 py-1 font-mono text-type-2xs leading-snug text-muted-foreground">
        {footer}
      </p>
    </div>
  );
}

function ProfilesBody({
  data,
  spotL,
  flipL,
  crL,
  psL,
  stUpL,
  stDnL,
  railUpL,
  railDnL,
}: {
  data: {
    strike: number;
    label: string;
    gex: number;
    gexCum: number;
    charm: number;
    charmCum: number;
  }[];
  spotL: string | null;
  flipL: string | null;
  crL: string | null;
  psL: string | null;
  stUpL: string | null;
  stDnL: string | null;
  railUpL: string | null;
  railDnL: string | null;
}) {
  const { zoomed } = useChartZoom();
  const chartH = zoomed ? '100%' : PROFILE_H;

  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-2 lg:grid-cols-2',
        zoomed ? 'h-full min-h-0' : '',
      )}
    >
      <ProfilePane
        title="Gamma · net GEX $M by strike"
        hint="+γ dampens · −γ amplifies path"
        footer="Amber dash = spot · purple = γ flip · green/red = CR/PS · pink = ATM straddle rails · violet = 1σ (straddle/0.8)."
      >
        <ResponsiveContainer width="100%" height={chartH}>
          <ComposedChart data={data} margin={{ top: 6, right: 8, bottom: 4, left: 0 }}>
            <CartesianGrid {...chartGridProps} />
            <XAxis
              dataKey="label"
              tick={chartAxisTick}
              stroke={CHART.axisLine}
              interval="preserveStartEnd"
              minTickGap={28}
            />
            <YAxis
              yAxisId="bar"
              tick={chartAxisTick}
              stroke={CHART.axisLine}
              width={40}
              tickFormatter={(v) => fmtCompact(Number(v) * 1e6)}
            />
            <YAxis
              yAxisId="cum"
              orientation="right"
              tick={chartAxisTick}
              stroke={CHART.axisLine}
              width={36}
              tickFormatter={(v) => fmtCompact(Number(v) * 1e6)}
            />
            <ReferenceLine yAxisId="bar" y={0} stroke={CHART.refLine} />
            {spotL && (
              <ReferenceLine
                yAxisId="bar"
                x={spotL}
                stroke={CHART.series.amber}
                strokeDasharray="3 3"
                strokeOpacity={0.85}
              />
            )}
            {flipL && (
              <ReferenceLine
                yAxisId="bar"
                x={flipL}
                stroke={CHART.series.tertiary}
                strokeDasharray="2 2"
                strokeOpacity={0.7}
              />
            )}
            {crL && (
              <ReferenceLine
                yAxisId="bar"
                x={crL}
                stroke={CHART.series.up}
                strokeOpacity={0.45}
              />
            )}
            {psL && (
              <ReferenceLine
                yAxisId="bar"
                x={psL}
                stroke={CHART.series.down}
                strokeOpacity={0.45}
              />
            )}
            {stUpL && (
              <ReferenceLine
                yAxisId="bar"
                x={stUpL}
                stroke="#f472b6"
                strokeDasharray="4 2"
                strokeOpacity={0.75}
                label={{ value: 'str↑', fill: '#f472b6', fontSize: 9, position: 'insideTopRight' }}
              />
            )}
            {stDnL && (
              <ReferenceLine
                yAxisId="bar"
                x={stDnL}
                stroke="#f472b6"
                strokeDasharray="4 2"
                strokeOpacity={0.75}
                label={{ value: 'str↓', fill: '#f472b6', fontSize: 9, position: 'insideTopLeft' }}
              />
            )}
            {railUpL && (
              <ReferenceLine
                yAxisId="bar"
                x={railUpL}
                stroke="#a78bfa"
                strokeDasharray="6 3"
                strokeOpacity={0.55}
                label={{ value: '1σ', fill: '#a78bfa', fontSize: 9, position: 'insideTopRight' }}
              />
            )}
            {railDnL && (
              <ReferenceLine
                yAxisId="bar"
                x={railDnL}
                stroke="#a78bfa"
                strokeDasharray="6 3"
                strokeOpacity={0.55}
                label={{ value: '1σ', fill: '#a78bfa', fontSize: 9, position: 'insideTopLeft' }}
              />
            )}
            <Tooltip
              contentStyle={chartTooltipStyle}
              formatter={(value: number | string, name: string) => [
                typeof value === 'number' ? fmtCompact(value * 1e6) : value,
                name === 'gexCum' ? 'cum GEX' : 'net GEX',
              ]}
              labelFormatter={(l) => `K ${l}`}
            />
            <Bar yAxisId="bar" dataKey="gex" isAnimationActive={false} name="gex">
              {data.map((d, i) => (
                <Cell
                  key={i}
                  fill={d.gex >= 0 ? CHART.series.up : CHART.series.down}
                  fillOpacity={0.88}
                />
              ))}
            </Bar>
            <Line
              yAxisId="cum"
              type="monotone"
              dataKey="gexCum"
              stroke={CHART.series.amber}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
              name="gexCum"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ProfilePane>

      <ProfilePane
        title="Charm · $ Δ / day by strike"
        hint="sign = hedge buy/sell bias as time passes"
        footer="Gold = +charm (buy futures bias as clock runs) · sky = −charm. Pink = straddle rails."
      >
        <ResponsiveContainer width="100%" height={chartH}>
          <ComposedChart data={data} margin={{ top: 6, right: 8, bottom: 4, left: 0 }}>
            <CartesianGrid {...chartGridProps} />
            <XAxis
              dataKey="label"
              tick={chartAxisTick}
              stroke={CHART.axisLine}
              interval="preserveStartEnd"
              minTickGap={28}
            />
            <YAxis
              yAxisId="bar"
              tick={chartAxisTick}
              stroke={CHART.axisLine}
              width={40}
              tickFormatter={(v) => fmtCompact(Number(v) * 1e6)}
            />
            <YAxis
              yAxisId="cum"
              orientation="right"
              tick={chartAxisTick}
              stroke={CHART.axisLine}
              width={36}
              tickFormatter={(v) => fmtCompact(Number(v) * 1e6)}
            />
            <ReferenceLine yAxisId="bar" y={0} stroke={CHART.refLine} />
            {spotL && (
              <ReferenceLine
                yAxisId="bar"
                x={spotL}
                stroke={CHART.series.amber}
                strokeDasharray="3 3"
                strokeOpacity={0.85}
              />
            )}
            {stUpL && (
              <ReferenceLine
                yAxisId="bar"
                x={stUpL}
                stroke="#f472b6"
                strokeDasharray="4 2"
                strokeOpacity={0.7}
              />
            )}
            {stDnL && (
              <ReferenceLine
                yAxisId="bar"
                x={stDnL}
                stroke="#f472b6"
                strokeDasharray="4 2"
                strokeOpacity={0.7}
              />
            )}
            <Tooltip
              contentStyle={chartTooltipStyle}
              formatter={(value: number | string, name: string) => [
                typeof value === 'number' ? fmtCompact(value * 1e6) : value,
                name === 'charmCum' ? 'cum charm' : 'net charm',
              ]}
              labelFormatter={(l) => `K ${l}`}
            />
            <Bar yAxisId="bar" dataKey="charm" isAnimationActive={false} name="charm">
              {data.map((d, i) => (
                <Cell
                  key={i}
                  fill={d.charm >= 0 ? '#eab308' : '#38bdf8'}
                  fillOpacity={0.9}
                />
              ))}
            </Bar>
            <Line
              yAxisId="cum"
              type="monotone"
              dataKey="charmCum"
              stroke="#a78bfa"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
              name="charmCum"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ProfilePane>
    </div>
  );
}

export function DealerGreekProfiles({
  snapshot,
  weight = 'oi',
  expiry = null,
  maxDte = null,
  className,
}: Props) {
  const exposure = useMemo(
    () =>
      dealerExposure(snapshot, {
        weight,
        ...(expiry ? { expiry } : {}),
        ...(maxDte != null ? { maxDte } : {}),
      }),
    [snapshot, weight, expiry, maxDte],
  );

  const profiles = useMemo(() => dealerProfiles(exposure), [exposure]);
  const move = useMemo(() => impliedMove(snapshot), [snapshot]);

  const data = useMemo(() => {
    const S = snapshot.spot;
    const band = 0.12;
    return profiles
      .filter((p) => Math.abs(p.strike - S) / S <= band)
      .map((p) => ({
        strike: p.strike,
        label: fmtPrice(p.strike, p.strike >= 1000 ? 0 : 2),
        gex: p.netGEX / 1e6,
        gexCum: p.gexCum / 1e6,
        charm: p.netCharm / 1e6,
        charmCum: p.charmCum / 1e6,
      }));
  }, [profiles, snapshot.spot]);

  const spot = snapshot.spot;
  const flip = exposure.gammaFlip;
  const callW = exposure.callWall;
  const putW = exposure.putWall;

  const railUp = move.move > 0 ? spot + move.move : null;
  const railDn = move.move > 0 ? spot - move.move : null;
  const straddleUp = move.straddle > 0 ? spot + move.straddle : null;
  const straddleDn = move.straddle > 0 ? spot - move.straddle : null;

  const nearestLabel = (px: number | null | undefined): string | null => {
    if (px == null || data.length === 0) return null;
    let best = data[0]!;
    let bestAbs = Math.abs(best.strike - px);
    for (const d of data) {
      const a = Math.abs(d.strike - px);
      if (a < bestAbs) {
        bestAbs = a;
        best = d;
      }
    }
    return best.label;
  };

  const spotL = nearestLabel(spot);
  const flipL = nearestLabel(flip);
  const crL = nearestLabel(callW);
  const psL = nearestLabel(putW);
  const railUpL = nearestLabel(railUp);
  const railDnL = nearestLabel(railDn);
  const stUpL = nearestLabel(straddleUp);
  const stDnL = nearestLabel(straddleDn);

  if (data.length === 0) {
    return (
      <div className={className}>
        <p className="px-2 py-3 font-mono text-type-2xs text-muted-foreground">
          No OI-weighted gamma/charm profile in range — check chain.
        </p>
      </div>
    );
  }

  const moveNote =
    move.straddle > 0
      ? `ATM straddle ${fmtPrice(move.straddle)} · 1σ ≈ ${fmtPrice(move.move)}`
      : 'No liquid ATM straddle — rails omitted';

  return (
    <div className={cn('min-w-0', className)}>
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2 px-1">
        <div className="font-mono text-type-2xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Explain term="gex">Gamma profile</Explain>
          {' · '}
          <Explain term="charmExposure">Charm profile</Explain>
          <span className="ml-2 font-normal normal-case tracking-normal text-muted-foreground/80">
            OI-inferred · ±12% spot · not MM inventory
          </span>
        </div>
        <div className="font-mono text-type-2xs text-muted-foreground">
          Σγ {fmtCompact(exposure.totalGEX)} · Σcharm/d {fmtCompact(exposure.totalCharm)}
          {move.straddle > 0 && (
            <span className="ml-2 text-muted-foreground/80">· {moveNote}</span>
          )}
        </div>
      </div>

      <ChartZoom
        title="Gamma · Charm profiles"
        subtitle={`${moveNote} · OI-inferred dealer convention`}
        bodyClassName="min-h-0"
        expandedHeightClass="h-[min(90vh,960px)]"
      >
        <ProfilesBody
          data={data}
          spotL={spotL}
          flipL={flipL}
          crL={crL}
          psL={psL}
          stUpL={stUpL}
          stDnL={stDnL}
          railUpL={railUpL}
          railDnL={railDnL}
        />
      </ChartZoom>
    </div>
  );
}
