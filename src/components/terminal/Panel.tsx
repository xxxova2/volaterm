import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { ApiSources } from '../macrovol/ApiSources';

interface PanelProps {
  title?: ReactNode;
  subtitle?: string;
  /** API provenance chips (Phase B panel chrome). */
  apis?: string[];
  /** Optional as-of / freshness string shown after title. */
  asOf?: string;
  actions?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Standard terminal panel chrome: title · API · as-of · badge · actions.
 */
export function Panel({
  title,
  subtitle,
  apis,
  asOf,
  actions,
  badge,
  children,
  className,
}: PanelProps) {
  const showHead = title || actions || (apis && apis.length) || asOf || badge;
  return (
    <div className={cn('term-panel flex flex-col overflow-hidden', className)}>
      {showHead && (
        <div className="flex items-center justify-between gap-2 border-b border-border px-2.5 py-1 sm:px-3 sm:py-1.5">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
            {title && (
              <h3 className="text-panel-title font-semibold text-foreground">{title}</h3>
            )}
            {apis && apis.length > 0 && <ApiSources apis={apis} />}
            {asOf && (
              <span className="font-mono text-type-2xs text-muted-foreground/80 tabular-nums" title="As of">
                {asOf}
              </span>
            )}
            {subtitle && <span className="text-type-xs text-muted-foreground">{subtitle}</span>}
            {badge}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
