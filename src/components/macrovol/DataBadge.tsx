import { FreshnessFromAsOf, formatRelative, classifyFreshness } from '../common/Freshness';

interface DataBadgeProps {
  asOf?: string | null;
  source?: string | null;
  note?: string | null;
  staleThresholdMin?: number;
  delayedThresholdMin?: number;
  demo?: boolean;
  down?: boolean;
  className?: string;
}

/**
 * Provenance + freshness for any widget (Phase D).
 * Shows LIVE / DELAYED / STALE / EXPIRED chip + relative age + source.
 */
export function DataBadge({
  asOf,
  source,
  note,
  staleThresholdMin = 30,
  delayedThresholdMin = 15,
  demo,
  down,
  className = '',
}: DataBadgeProps) {
  if (!asOf && !source && !down && !demo) return null;

  const kind = classifyFreshness(asOf, {
    staleMin: staleThresholdMin,
    delayedMin: delayedThresholdMin,
    demo,
    down,
  });

  return (
    <div
      className={`flex flex-wrap items-center gap-2 text-[10px] font-mono text-muted-foreground ${className}`}
      title={note || (asOf ? `As of: ${new Date(asOf).toLocaleString()}` : undefined)}
      data-freshness={kind}
    >
      <FreshnessFromAsOf
        asOf={asOf}
        staleMin={staleThresholdMin}
        delayedMin={delayedThresholdMin}
        demo={demo}
        down={down}
      />
      {source && <span className="text-muted-foreground/90">{source}</span>}
      {source && asOf && <span className="opacity-50">·</span>}
      {asOf && <span className="tabular-nums">{formatRelative(asOf)}</span>}
      {note && <span className="opacity-60">· {note}</span>}
    </div>
  );
}
