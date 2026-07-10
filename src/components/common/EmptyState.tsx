import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { SectionSkeleton } from './Skeleton';

export type EmptyKind = 'loading' | 'no-data' | 'api-down' | 'demo' | 'error';

const COPY: Record<EmptyKind, { title: string; body: string }> = {
  loading: {
    title: 'Working…',
    body: 'Named work in progress — not silent zeros.',
  },
  'no-data': {
    title: 'No live data',
    body: 'Upstream returned empty. Check source / session / symbol.',
  },
  'api-down': {
    title: 'API unavailable',
    body: 'Service unreachable. Start MacroVol (:8765) or check network / keys.',
  },
  demo: {
    title: 'Demo surface',
    body: 'Synthetic fallback — not market prices. Refresh LIVE feeds.',
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
  if (kind === 'loading') {
    return (
      <div className={cn('w-full', className)} role="status">
        <SectionSkeleton rows={compact ? 2 : 3} label={title ?? 'Loading…'} />
        {(title || body) && (
          <p className="mt-2 text-center font-mono text-type-xs text-muted-foreground">
            {title ?? COPY.loading.title}
            {body ? ` — ${body}` : ''}
          </p>
        )}
        {action && <div className="mt-2 flex justify-center">{action}</div>}
      </div>
    );
  }

  const c = COPY[kind];
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-muted/20 font-mono text-center term-fade-in',
        compact ? 'px-3 py-4' : 'px-4 py-8',
        className,
      )}
      role="status"
    >
      <div
        className={cn(
          'font-semibold',
          kind === 'api-down' || kind === 'error' ? 'text-down' : 'text-muted-foreground',
          compact ? 'text-type-sm' : 'text-type-base',
        )}
      >
        {title ?? c.title}
      </div>
      <p className={cn('max-w-sm text-muted-foreground/80', compact ? 'text-type-xs' : 'text-type-sm')}>
        {body ?? c.body}
      </p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** @deprecated use SectionSkeleton from Skeleton.tsx */
export { SectionSkeleton } from './Skeleton';
