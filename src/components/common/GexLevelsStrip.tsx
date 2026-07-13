/**
 * Sticky GEX levels + regime chip + optional session spark.
 * Reused on Positioning, Vol surface, Home.
 */
import { useEffect, useMemo, useState } from 'react';
import { dealerExposure } from '../../lib/options/analytics';
import {
  buildGexLevels,
  loadGexSession,
  recordGexSession,
  type GexSessionSeries,
} from '../../lib/options/gexSession';
import { interpretHedgeFlow } from '../../lib/options/hedgeFlow';
import { useTerminalStore } from '../../store/terminalStore';
import { fmtCompact, fmtPrice } from '../../lib/format';
import { cn } from '../../lib/utils';
import { Explain } from './Explain';

function MiniSpark({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) {
    return <span className="font-mono text-type-2xs text-muted-foreground">session…</span>;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const w = 72;
  const h = 18;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / span) * (h - 2) - 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg width={w} height={h} className="shrink-0 opacity-90" aria-hidden>
      <polyline fill="none" stroke={color} strokeWidth="1.4" points={pts} />
    </svg>
  );
}

export function GexLevelsStrip({
  className,
  compact = false,
  showSpark = true,
}: {
  className?: string;
  compact?: boolean;
  showSpark?: boolean;
}) {
  const snapshot = useTerminalStore((s) => s.snapshot);
  const symbol = useTerminalStore((s) => s.symbol);
  const [series, setSeries] = useState<GexSessionSeries | null>(null);

  const dealer = useMemo(
    () => (snapshot ? dealerExposure(snapshot) : null),
    [snapshot],
  );
  const levels = useMemo(
    () => (snapshot && dealer ? buildGexLevels(symbol, snapshot.spot, dealer) : null),
    [snapshot, dealer, symbol],
  );
  const flow = useMemo(() => {
    if (!snapshot || !dealer) return null;
    return interpretHedgeFlow({
      totalGEX: dealer.totalGEX,
      totalVEX: dealer.totalVEX,
      totalCharm: dealer.totalCharm,
      spot: snapshot.spot,
      gammaFlip: dealer.gammaFlip,
    });
  }, [snapshot, dealer]);

  useEffect(() => {
    if (!levels || !snapshot || !dealer) return;
    const band = 0.12;
    const S = snapshot.spot;
    const near = dealer.points.filter((p) => Math.abs(p.strike - S) / S <= band);
    const profile = near.map((p) => ({ k: p.strike, g: p.netGEX }));
    const charmProfile = near.map((p) => ({ k: p.strike, g: p.netCharm }));
    const s = recordGexSession(symbol, snapshot.spot, levels.totalGEX, levels.gammaFlip, {
      minGapMs: 25_000,
      profile,
      charmProfile,
      totalCharm: dealer.totalCharm,
    });
    setSeries(s);
  }, [levels?.totalGEX, levels?.gammaFlip, snapshot?.spot, symbol, dealer]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setSeries(loadGexSession(symbol));
  }, [symbol]);

  if (!levels || !snapshot) return null;

  const toneCls =
    levels.regime.tone === 'up'
      ? 'border-up/40 bg-up/10 text-up'
      : levels.regime.tone === 'down'
        ? 'border-down/40 bg-down/10 text-down'
        : levels.regime.tone === 'warn'
          ? 'border-warn/40 bg-warn/10 text-warn'
          : 'border-border bg-card/60 text-muted-foreground';

  const sparkVals = series?.points.map((p) => p.totalGEX) ?? [];
  const sparkColor =
    levels.regime.tone === 'down' ? 'var(--down)' : levels.regime.tone === 'up' ? 'var(--up)' : 'var(--cyan)';

  return (
    <div
      className={cn('border-b border-border font-mono text-type-xs', className)}
      role="status"
      aria-label="GEX sticky levels"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-2 py-1">
        <span
          className={cn('rounded border px-1.5 py-0.5 text-type-2xs font-bold tracking-wide', toneCls)}
          title={levels.regime.note}
        >
          <Explain term="gex">{levels.regime.short}</Explain>
          {!compact && <span className="ml-1 font-normal opacity-90">{levels.regime.label}</span>}
        </span>

        <span>
          <span className="text-muted-foreground">Spot </span>
          <span className="font-semibold tabular-nums text-foreground">{fmtPrice(levels.spot)}</span>
        </span>
        <span>
          <span className="text-muted-foreground">
            <Explain term="gammaFlip">Flip</Explain>{' '}
          </span>
          <span className="tabular-nums text-foreground">
            {levels.gammaFlip != null ? fmtPrice(levels.gammaFlip, 0) : '—'}
          </span>
        </span>
        <span>
          <span className="text-muted-foreground">
            <Explain term="callWall">CR</Explain>{' '}
          </span>
          <span className="tabular-nums text-up">
            {levels.callWall != null ? fmtPrice(levels.callWall, 0) : '—'}
          </span>
        </span>
        <span>
          <span className="text-muted-foreground">
            <Explain term="putWall">PS</Explain>{' '}
          </span>
          <span className="tabular-nums text-down">
            {levels.putWall != null ? fmtPrice(levels.putWall, 0) : '—'}
          </span>
        </span>
        <span>
          <span className="text-muted-foreground">
            <Explain term="highVolLevel">HVL</Explain>{' '}
          </span>
          <span className="tabular-nums text-amber">
            {levels.highVolLevel != null ? fmtPrice(levels.highVolLevel, 0) : '—'}
          </span>
        </span>
        <span>
          <span className="text-muted-foreground">Net </span>
          <span className={cn('tabular-nums font-semibold', levels.totalGEX >= 0 ? 'text-up' : 'text-down')}>
            {fmtCompact(levels.totalGEX)}
          </span>
        </span>
        {dealer && (
          <span title="Net DEX (OI-inferred)">
            <span className="text-muted-foreground">DEX </span>
            <span className={cn('tabular-nums', dealer.totalDEX >= 0 ? 'text-up' : 'text-down')}>
              {fmtCompact(dealer.totalDEX)}
            </span>
          </span>
        )}

        {showSpark && sparkVals.length >= 2 && (
          <span className="ml-auto flex items-center gap-1.5" title="Session net GEX path (this browser)">
            <span className="text-type-2xs text-muted-foreground">GEX path</span>
            <MiniSpark values={sparkVals} color={sparkColor} />
          </span>
        )}
      </div>
      {!compact && flow && (
        <div className="border-t border-border/50 px-2 py-1 text-type-2xs leading-snug text-muted-foreground">
          <Explain term="hedgeFlow">
            <span
              className={cn(
                'font-semibold',
                flow.tone === 'up' ? 'text-up' : flow.tone === 'down' ? 'text-down' : flow.tone === 'warn' ? 'text-warn' : 'text-foreground',
              )}
            >
              {flow.headline}
            </span>
          </Explain>
          <span className="text-muted-foreground"> — {flow.bias}</span>
          {flow.interaction && (
            <span className="mt-0.5 block text-warn/90">{flow.interaction}</span>
          )}
        </div>
      )}
    </div>
  );
}
