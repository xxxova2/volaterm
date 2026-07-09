import { useEffect, useState } from 'react';
import { cn } from '../../lib/utils';
import {
  classifyDomainFreshness,
  classifyFreshnessFromIso,
  type FreshnessDomain,
  type FreshnessKind,
} from '../../lib/data/freshness';

export type { FreshnessKind, FreshnessDomain };
export { classifyDomainFreshness, classifyFreshnessFromIso };

/** @deprecated Prefer classifyFreshnessFromIso / classifyDomainFreshness; kept for call sites. */
export function classifyFreshness(
  asOf: string | null | undefined,
  opts?: {
    staleMin?: number;
    delayedMin?: number;
    demo?: boolean;
    down?: boolean;
  },
): FreshnessKind {
  return classifyFreshnessFromIso(asOf, opts);
}

const STYLE: Record<FreshnessKind, { label: string; className: string; dot: string }> = {
  live: { label: 'LIVE', className: 'text-up border-up/30 bg-up/10', dot: 'bg-up' },
  delayed: { label: 'DELAYED', className: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10', dot: 'bg-cyan-400' },
  stale: { label: 'STALE', className: 'text-amber border-amber/40 bg-amber/10', dot: 'bg-amber' },
  expired: { label: 'EXPIRED', className: 'text-down border-down/30 bg-down/10', dot: 'bg-down' },
  demo: { label: 'DEMO', className: 'text-amber border-amber/40 bg-amber/10', dot: 'bg-amber' },
  down: { label: 'API DOWN', className: 'text-down border-down/30 bg-down/10', dot: 'bg-down' },
  unknown: { label: '—', className: 'text-muted-foreground border-border bg-muted/40', dot: 'bg-muted-foreground' },
};

export function formatRelative(isoString: string): string {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return 'unknown';
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

/** Compact LIVE / STALE / DELAYED chip */
export function FreshnessChip({
  kind,
  className,
}: {
  kind: FreshnessKind;
  className?: string;
}) {
  const s = STYLE[kind];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-type-2xs font-bold uppercase tracking-wider',
        s.className,
        className,
      )}
      title={s.label}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />
      {s.label}
    </span>
  );
}

/** Auto-refreshing freshness from as-of timestamp (minute thresholds; macro default). */
export function FreshnessFromAsOf({
  asOf,
  staleMin = 30,
  delayedMin = 15,
  demo,
  down,
  className,
}: {
  asOf?: string | null;
  staleMin?: number;
  delayedMin?: number;
  demo?: boolean;
  down?: boolean;
  className?: string;
}) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 15_000);
    return () => clearInterval(t);
  }, []);
  const kind = classifyFreshnessFromIso(asOf, { staleMin, delayedMin, demo, down });
  return <FreshnessChip kind={kind} className={className} />;
}

/** Domain-ms freshness chip (spot / chain / crypto / stream). */
export function FreshnessFromDomain({
  asOfMs,
  domain,
  demo,
  down,
  previousKind,
  className,
}: {
  asOfMs?: number | null;
  domain: FreshnessDomain;
  demo?: boolean;
  down?: boolean;
  previousKind?: FreshnessKind;
  className?: string;
}) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 5_000);
    return () => clearInterval(t);
  }, []);
  const kind = classifyDomainFreshness(asOfMs, domain, { demo, down, previousKind });
  return <FreshnessChip kind={kind} className={className} />;
}
