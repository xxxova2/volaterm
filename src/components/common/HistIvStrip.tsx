/**
 * HIVG-lite — always-visible front-month ATM IV history strip.
 * Reads a precomputed per-frame series (front/min-DTE atmIV) so it stays
 * prop-driven and testable. Inline SVG spark (no recharts). No store/math/API.
 * When the live ring buffer has < 2 frames, shows current ATM (if provided)
 * or a one-line hint — never a dummy spark.
 */
import { fmtPct } from '../../lib/format';
import { cn } from '../../lib/utils';

export type HistIvPoint = {
  /** front (min-DTE) atmIV as a fraction */
  atmIv: number;
  timestamp: number;
};

export type HistIvStripProps = {
  symbol?: string;
  /** Per-frame front ATM IV series from historicalFrames */
  series: HistIvPoint[];
  /** Current front ATM IV (fallback when series is short) */
  current?: number | null;
  /** IV rank percentile 0–100 */
  ivRankPct?: number | null;
  /** Optional control — open TERM section */
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

export function HistIvStrip({
  symbol,
  series,
  current,
  ivRankPct,
  onOpenTerm,
  className,
}: HistIvStripProps) {
  const useSeries = series.filter((p) => Number.isFinite(p.atmIv));
  const hasSpark = useSeries.length >= 2;

  const now = hasSpark
    ? useSeries[useSeries.length - 1]!.atmIv
    : (current != null && Number.isFinite(current) ? current : null);

  const high = hasSpark ? Math.max(...useSeries.map((p) => p.atmIv)) : null;
  const low = hasSpark ? Math.min(...useSeries.map((p) => p.atmIv)) : null;

  const sparkVals = hasSpark ? useSeries.map((p) => p.atmIv) : [];

  return (
    <div
      data-testid="hist-iv-strip"
      className={cn(
        'mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded border border-border bg-card/60 px-3 py-1.5 font-mono text-type-xs',
        className,
      )}
      aria-label="Historical ATM IV"
    >
      <span className="rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 font-bold tracking-wider text-primary">
        HIVG
      </span>
      <span className="font-bold tracking-wider text-foreground">{symbol ?? '—'}</span>
      <span className="text-muted-foreground">hist ATM IV</span>
      {now != null && Number.isFinite(now) && (
        <span className="font-semibold tabular-nums text-foreground">{fmtPct(now)}</span>
      )}
      {high != null && (
        <span className="flex items-baseline gap-1">
          <span className="text-muted-foreground">H</span>
          <span className="text-up tabular-nums">{fmtPct(high)}</span>
        </span>
      )}
      {low != null && (
        <span className="flex items-baseline gap-1">
          <span className="text-muted-foreground">L</span>
          <span className="text-down tabular-nums">{fmtPct(low)}</span>
        </span>
      )}
      {ivRankPct != null && Number.isFinite(ivRankPct) && (
        <span className="flex items-baseline gap-1">
          <span className="text-muted-foreground">rank</span>
          <span className="tabular-nums text-foreground">{ivRankPct.toFixed(0)}%</span>
        </span>
      )}
      {hasSpark ? (
        <span className="ml-auto flex items-center gap-1.5" title="front ATM IV history">
          <IvSpark values={sparkVals} />
        </span>
      ) : (
        <span className="ml-auto text-muted-foreground">
          {now != null ? 'live ring buffering…' : 'awaiting live chain'}
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
  );
}
