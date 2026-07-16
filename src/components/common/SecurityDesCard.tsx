/**
 * Security DES card — compact always-visible summary so Home feels complete
 * without opening Analytics. Pairs with the regime band (which owns term /
 * VRP / STIR / fit) rather than duplicating it. All data is passed in; no
 * store/math/API here. Honesty only — chain label is the real source.
 *
 * W5: denser print strip + DeskSpark (GP close path, HIVG ATM path).
 */
import { fmtPct, fmtPrice, fmtSignedPct } from '../../lib/format';
import { cn } from '../../lib/utils';
import { PrintStrip } from '../desk/PrintStrip';
import { DeskSpark } from '../desk/DeskSpark';
import { DESK_SERIES } from '../desk/seriesGrammar';

type Tone = 'up' | 'down' | 'warn' | 'neutral';

export type HistIvPoint = {
  atmIv: number;
  timestamp: number;
};

export type SecurityDesCardProps = {
  symbol: string;
  spot?: number | null;
  dayChgPct?: number | null;
  /** Front-month ATM IV as a fraction (0.18 = 18%) */
  atmIv?: number | null;
  /** IV rank percentile 0–100 */
  ivRankPct?: number | null;
  gexShort?: string;
  gexRegimeLabel?: string;
  gexRegimeTone?: Tone;
  /** Nearest expiry days-to-expiry */
  nearestDte?: number | null;
  /** Real chain source label (yfinance / fmp / synthetic) — honesty */
  chainLabel?: string;
  /** 60d close path for the optional GP-lite spark; omit when no history */
  quotePath?: { t: string; close: number }[];
  /** Optional HIVG-lite second row: front ATM IV per live frame */
  histIvSeries?: HistIvPoint[];
  /** Current front ATM IV (HIVG fallback when series short) */
  histIvCurrent?: number | null;
  /** Optional HIVG control — open TERM section */
  onOpenTerm?: () => void;
  className?: string;
};

export function SecurityDesCard({
  symbol,
  spot,
  dayChgPct,
  atmIv,
  ivRankPct,
  gexShort,
  gexRegimeLabel,
  gexRegimeTone = 'neutral',
  nearestDte,
  chainLabel,
  quotePath,
  histIvSeries,
  histIvCurrent,
  onOpenTerm,
  className,
}: SecurityDesCardProps) {
  const gexTone: 'up' | 'down' | 'muted' | 'default' =
    gexRegimeTone === 'up'
      ? 'up'
      : gexRegimeTone === 'down'
        ? 'down'
        : gexRegimeTone === 'warn'
          ? 'default'
          : 'muted';

  const sparkVals = quotePath && quotePath.length > 1 ? quotePath.map((p) => p.close) : [];

  const useSeries = (histIvSeries ?? []).filter((p) => Number.isFinite(p.atmIv));
  const hasSpark = useSeries.length >= 2;
  const nowIv = hasSpark
    ? useSeries[useSeries.length - 1]!.atmIv
    : histIvCurrent != null && Number.isFinite(histIvCurrent)
      ? histIvCurrent
      : null;
  const highIv = hasSpark ? Math.max(...useSeries.map((p) => p.atmIv)) : null;
  const lowIv = hasSpark ? Math.min(...useSeries.map((p) => p.atmIv)) : null;
  const histSparkVals = hasSpark ? useSeries.map((p) => p.atmIv) : [];

  return (
    <div
      data-testid="security-des-card"
      className={cn(
        'mb-2 rounded border border-border bg-black/40 font-mono text-type-xs',
        className,
      )}
      aria-label="Security description"
    >
      {/* Identity row */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 border-b border-border/50 px-2 py-1">
        <span className="rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 font-bold tracking-wider text-amber-500/90">
          DES
        </span>
        <span className="font-bold tracking-wider text-foreground">{symbol}</span>
        {spot != null && Number.isFinite(spot) && (
          <span className="font-semibold tabular-nums text-foreground">{fmtPrice(spot)}</span>
        )}
        {dayChgPct != null && Number.isFinite(dayChgPct) && (
          <span className={cn('tabular-nums', dayChgPct >= 0 ? 'text-up' : 'text-down')}>
            {fmtSignedPct(dayChgPct)}
          </span>
        )}
        {sparkVals.length >= 2 && (
          <span className="ml-auto flex items-center gap-1.5" title="60d close path">
            <span className="text-type-2xs text-muted-foreground">GP</span>
            <DeskSpark values={sparkVals} color={DESK_SERIES.long} width={88} height={18} />
          </span>
        )}
      </div>

      {/* Dense prints */}
      <PrintStrip
        className="rounded-none border-0 border-b border-border/50 bg-transparent px-2 py-1"
        items={[
          {
            label: 'ATM IV',
            value: atmIv != null && Number.isFinite(atmIv) ? fmtPct(atmIv) : '—',
          },
          {
            label: 'IV rank',
            value:
              ivRankPct != null && Number.isFinite(ivRankPct)
                ? `${ivRankPct.toFixed(0)}%`
                : '—',
          },
          {
            label: 'Nearest',
            value:
              nearestDte != null && Number.isFinite(nearestDte) ? `${nearestDte}d` : '—',
          },
          {
            label: 'GEX',
            value: gexShort
              ? `${gexShort} · ${gexRegimeLabel ?? ''}`
              : (gexRegimeLabel ?? '—'),
            tone: gexTone,
            title: gexRegimeLabel,
          },
          ...(chainLabel && chainLabel !== 'none'
            ? [{ label: 'chain', value: chainLabel, tone: 'default' as const }]
            : []),
        ]}
      />

      {histIvSeries !== undefined && (
        <div
          data-testid="hist-iv-strip"
          className="flex flex-wrap items-end gap-x-3 gap-y-1 px-2 py-1 text-type-xs"
          aria-label="Historical ATM IV"
        >
          <span className="rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 font-bold tracking-wider text-amber-500/90">
            HIVG
          </span>
          <span className="flex flex-col">
            <span className="text-type-2xs uppercase tracking-wider text-muted-foreground">
              hist ATM IV
            </span>
            <span className="text-xs font-semibold tabular-nums text-foreground">
              {nowIv != null && Number.isFinite(nowIv) ? fmtPct(nowIv) : '—'}
            </span>
          </span>
          {highIv != null && (
            <span className="flex flex-col">
              <span className="text-type-2xs uppercase tracking-wider text-muted-foreground">H</span>
              <span className="text-xs font-semibold tabular-nums text-up">{fmtPct(highIv)}</span>
            </span>
          )}
          {lowIv != null && (
            <span className="flex flex-col">
              <span className="text-type-2xs uppercase tracking-wider text-muted-foreground">L</span>
              <span className="text-xs font-semibold tabular-nums text-down">{fmtPct(lowIv)}</span>
            </span>
          )}
          {hasSpark ? (
            <span className="ml-auto flex items-center gap-1.5" title="front ATM IV history">
              <DeskSpark values={histSparkVals} color={DESK_SERIES.spot} width={88} height={18} />
            </span>
          ) : (
            <span className="ml-auto text-muted-foreground">
              {nowIv != null ? 'live ring buffering…' : 'awaiting live chain'}
            </span>
          )}
          {onOpenTerm && (
            <button
              type="button"
              onClick={onOpenTerm}
              className="rounded border border-amber-500/30 px-1.5 py-0.5 text-type-2xs text-amber-500/90 hover:border-amber-400 hover:text-foreground"
              title="Open Term structure (Vol · TERM)"
            >
              TERM →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
