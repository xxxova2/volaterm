/**
 * Security DES card — compact always-visible summary so Home feels complete
 * without opening Analytics. Pairs with the regime band (which owns term /
 * VRP / STIR / fit) rather than duplicating it. All data is passed in; no
 * store/math/API here. Honesty only — chain label is the real source.
 *
 * Optionally composes the HIVG-lite second row (hist front ATM IV spark +
 * H/L/now + TERM control) into a single bordered card to keep the landing
 * stack dense. The second row keeps data-testid="hist-iv-strip".
 */
import { fmtPct, fmtPrice, fmtSignedPct } from '../../lib/format';
import { cn } from '../../lib/utils';

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

function IvSpark({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const w = 96;
  const h = 22;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / span) * (h - 2) - 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg width={w} height={h} className="shrink-0 opacity-90" aria-hidden>
      <polyline fill="none" stroke="var(--info)" strokeWidth="1.4" points={pts} />
    </svg>
  );
}

function DesSpark({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const w = 96;
  const h = 22;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / span) * (h - 2) - 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg width={w} height={h} className="shrink-0 opacity-90" aria-hidden>
      <polyline fill="none" stroke="var(--info)" strokeWidth="1.4" points={pts} />
    </svg>
  );
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <span className="flex items-baseline gap-1">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('font-semibold tabular-nums text-foreground', className)}>{value}</span>
    </span>
  );
}

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
  const toneCls =
    gexRegimeTone === 'up'
      ? 'text-up'
      : gexRegimeTone === 'down'
        ? 'text-down'
        : gexRegimeTone === 'warn'
          ? 'text-warn'
          : 'text-muted-foreground';

  const sparkVals = quotePath && quotePath.length > 1 ? quotePath.map((p) => p.close) : [];

  const useSeries = (histIvSeries ?? []).filter((p) => Number.isFinite(p.atmIv));
  const hasSpark = useSeries.length >= 2;
  const nowIv = hasSpark
    ? useSeries[useSeries.length - 1]!.atmIv
    : (histIvCurrent != null && Number.isFinite(histIvCurrent) ? histIvCurrent : null);
  const highIv = hasSpark ? Math.max(...useSeries.map((p) => p.atmIv)) : null;
  const lowIv = hasSpark ? Math.min(...useSeries.map((p) => p.atmIv)) : null;
  const histSparkVals = hasSpark ? useSeries.map((p) => p.atmIv) : [];

  return (
    <div
      data-testid="security-des-card"
      className={cn(
        'mb-2 rounded border border-border bg-card/60 font-mono text-type-xs',
        className,
      )}
      aria-label="Security description"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1.5">
        <span className="rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 font-bold tracking-wider text-primary">
          DES
        </span>
        <span className="font-bold tracking-wider text-foreground">{symbol}</span>
        {spot != null && Number.isFinite(spot) && (
          <span className="font-semibold tabular-nums text-foreground">{fmtPrice(spot)}</span>
        )}
        {dayChgPct != null && Number.isFinite(dayChgPct) && (
          <span className={dayChgPct >= 0 ? 'text-up' : 'text-down'}>{fmtSignedPct(dayChgPct)}</span>
        )}
        <span className="text-border">·</span>
        <Stat label="ATM IV" value={atmIv != null && Number.isFinite(atmIv) ? fmtPct(atmIv) : '—'} />
        <Stat label="IV rank" value={ivRankPct != null && Number.isFinite(ivRankPct) ? `${ivRankPct.toFixed(0)}%` : '—'} />
        <Stat label="Nearest" value={nearestDte != null && Number.isFinite(nearestDte) ? `${nearestDte}d` : '—'} />
        <span className="flex items-baseline gap-1">
          <span className="text-muted-foreground">GEX</span>
          <span className={cn('font-semibold', toneCls)} title={gexRegimeLabel}>
            {gexShort ? `${gexShort} · ${gexRegimeLabel ?? ''}` : (gexRegimeLabel ?? '—')}
          </span>
        </span>
        {chainLabel && chainLabel !== 'none' && (
          <span className="flex items-baseline gap-1">
            <span className="text-muted-foreground">chain</span>
            <span className="text-info">{chainLabel}</span>
          </span>
        )}
        {sparkVals.length >= 2 && (
          <span className="ml-auto flex items-center gap-1.5" title="60d close path">
            <span className="text-type-2xs text-muted-foreground">GP</span>
            <DesSpark values={sparkVals} />
          </span>
        )}
      </div>

      {histIvSeries !== undefined && (
        <div
          data-testid="hist-iv-strip"
          className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/50 px-3 py-1.5 text-type-xs"
          aria-label="Historical ATM IV"
        >
          <span className="rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 font-bold tracking-wider text-primary">
            HIVG
          </span>
          <span className="text-muted-foreground">hist ATM IV</span>
          {nowIv != null && Number.isFinite(nowIv) && (
            <span className="font-semibold tabular-nums text-foreground">{fmtPct(nowIv)}</span>
          )}
          {highIv != null && (
            <span className="flex items-baseline gap-1">
              <span className="text-muted-foreground">H</span>
              <span className="text-up tabular-nums">{fmtPct(highIv)}</span>
            </span>
          )}
          {lowIv != null && (
            <span className="flex items-baseline gap-1">
              <span className="text-muted-foreground">L</span>
              <span className="text-down tabular-nums">{fmtPct(lowIv)}</span>
            </span>
          )}
          {hasSpark ? (
            <span className="ml-auto flex items-center gap-1.5" title="front ATM IV history">
              <IvSpark values={histSparkVals} />
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
              className="rounded border border-border px-1.5 py-0.5 text-type-2xs text-muted-foreground hover:border-primary hover:text-foreground"
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

