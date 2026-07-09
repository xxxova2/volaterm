import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export type EmptyKind = 'loading' | 'no-data' | 'api-down' | 'demo' | 'error';

const COPY: Record<EmptyKind, { title: string; body: string }> = {
  loading: {
    title: 'Loading…',
    body: 'Fetching data — not silent zeros.',
  },
  'no-data': {
    title: 'No live data',
    body: 'Upstream returned empty. Check source / session / symbol.',
  },
  'api-down': {
    title: 'API unavailable',
    body: 'Service unreachable. Start MacroVol (:8765) or switch demo for chain tools.',
  },
  demo: {
    title: 'Demo surface',
    body: 'Synthetic SVI — not market prices. Toggle LIVE for real feeds.',
  },
  error: {
    title: 'Load failed',
    body: 'Request error. Retry or check network / keys.',
  },
};

/**
 * Explicit empty / error states — never show silent zeros as if live.
 */
export function EmptyState({
  kind = 'no-data',
  title,
  body,
  action,
  className,
  compact,
}: {
  kind?: EmptyKind;
  title?: string;
  body?: string;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  const c = COPY[kind];
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-muted/20 font-mono text-center',
        compact ? 'px-3 py-4' : 'px-4 py-8',
        className,
      )}
      role="status"
    >
      <div
        className={cn(
          'font-semibold',
          kind === 'api-down' || kind === 'error' ? 'text-red-400' : 'text-muted-foreground',
          compact ? 'text-[11px]' : 'text-xs',
        )}
      >
        {title ?? c.title}
      </div>
      <p className={cn('max-w-sm text-muted-foreground/80', compact ? 'text-[10px]' : 'text-[11px]')}>
        {body ?? c.body}
      </p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** Pulse skeleton for a desk section while loading */
export function SectionSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2 p-2', className)} aria-busy="true" aria-label="Loading section">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-16 animate-pulse rounded-lg border border-border bg-card"
          style={{ opacity: 1 - i * 0.15 }}
        />
      ))}
    </div>
  );
}
