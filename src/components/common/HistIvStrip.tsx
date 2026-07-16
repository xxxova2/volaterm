/**
 * HIVG-lite — always-visible front-month ATM IV history strip.
 * Prop-driven; no store/math/API. Never a dummy spark.
 * W5: denser print layout + DeskSpark.
 */
import { fmtPct } from '../../lib/format';
import { cn } from '../../lib/utils';
import { PrintStrip } from '../desk/PrintStrip';
import { DeskSpark } from '../desk/DeskSpark';
import { DESK_SERIES } from '../desk/seriesGrammar';

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
    : current != null && Number.isFinite(current)
      ? current
      : null;

  const high = hasSpark ? Math.max(...useSeries.map((p) => p.atmIv)) : null;
  const low = hasSpark ? Math.min(...useSeries.map((p) => p.atmIv)) : null;
  const sparkVals = hasSpark ? useSeries.map((p) => p.atmIv) : [];

  return (
    <div
      data-testid="hist-iv-strip"
      className={cn(
        'mb-2 flex flex-wrap items-end gap-x-2 gap-y-1 rounded border border-border bg-black/40 px-2 py-1 font-mono text-type-xs',
        className,
      )}
      aria-label="Historical ATM IV"
    >
      <span className="rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 font-bold tracking-wider text-amber-500/90">
        HIVG
      </span>
      <span className="font-bold tracking-wider text-foreground">{symbol ?? '—'}</span>

      <PrintStrip
        className="min-w-0 flex-1 border-0 bg-transparent p-0"
        items={[
          {
            label: 'hist ATM IV',
            value: now != null && Number.isFinite(now) ? fmtPct(now) : '—',
          },
          ...(high != null
            ? [{ label: 'H', value: fmtPct(high), tone: 'up' as const }]
            : []),
          ...(low != null
            ? [{ label: 'L', value: fmtPct(low), tone: 'down' as const }]
            : []),
          ...(ivRankPct != null && Number.isFinite(ivRankPct)
            ? [
                {
                  label: 'rank',
                  value: `${ivRankPct.toFixed(0)}%`,
                },
              ]
            : []),
        ]}
      />

      {hasSpark ? (
        <span className="flex items-center" title="front ATM IV history">
          <DeskSpark values={sparkVals} color={DESK_SERIES.spot} width={88} height={18} />
        </span>
      ) : (
        <span className="text-muted-foreground">
          {now != null ? 'live ring buffering…' : 'awaiting live chain'}
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
  );
}
