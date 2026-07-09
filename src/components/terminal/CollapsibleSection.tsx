import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { usePersistedBool } from '../../hooks/usePersistedBool';
import { ApiSources } from '../macrovol/ApiSources';

export interface CollapsibleSectionProps {
  /** Anchor id for desk sub-nav (scroll-margin applied). */
  id: string;
  title: string;
  /** Optional short blurb under title when open. */
  subtitle?: string;
  /** API provenance chips next to title. */
  apis?: string[];
  /** Default open state when no localStorage entry. */
  defaultOpen?: boolean;
  /** localStorage key — defaults to `desk.section.${id}`. */
  storageKey?: string;
  /** Extra classes on outer shell (e.g. flex order-*). */
  className?: string;
  /** Right-side header slot (badges, imply chips). */
  badge?: ReactNode;
  /** Skip layout work when off-screen (Phase G). */
  belowFold?: boolean;
  children: ReactNode;
}

/**
 * Dense collapsible desk section with remembered open/closed state.
 * Use for tall desks so low-priority tools (DV01, corr) stay out of the way.
 */
export function CollapsibleSection({
  id,
  title,
  subtitle,
  apis,
  defaultOpen = true,
  storageKey,
  className,
  badge,
  belowFold = false,
  children,
}: CollapsibleSectionProps) {
  const key = storageKey ?? `desk.section.${id}`;
  const [open, setOpen] = usePersistedBool(key, defaultOpen);

  return (
    <section
      id={id}
      data-desk-section="1"
      className={cn(
        'scroll-mt-10 rounded-xl border border-border bg-card',
        belowFold && 'below-fold',
        className,
      )}
      aria-labelledby={`${id}-title`}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex w-full items-center gap-2 px-3 py-2 text-left font-mono transition-colors',
          'hover:bg-muted/40 focus-visible:outline-none',
          open && 'border-b border-border/60',
        )}
        aria-expanded={open}
        aria-controls={`${id}-body`}
      >
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-150',
            !open && '-rotate-90',
          )}
          aria-hidden
        />
        <h3 id={`${id}-title`} className="text-xs font-semibold text-foreground">
          {title}
        </h3>
        {apis && apis.length > 0 && (
          <span className="hidden sm:inline" onClick={(e) => e.stopPropagation()}>
            <ApiSources apis={apis} />
          </span>
        )}
        {badge && (
          <span className="flex min-w-0 flex-wrap items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {badge}
          </span>
        )}
        <span className="ml-auto shrink-0 text-type-2xs uppercase tracking-wider text-muted-foreground/60">
          {open ? 'hide' : 'show'}
        </span>
      </button>
      {open && (
        <div id={`${id}-body`} className="px-3 pb-3 pt-2 font-mono">
          {subtitle && (
            <p className="mb-2 text-type-xs text-muted-foreground">{subtitle}</p>
          )}
          {children}
        </div>
      )}
    </section>
  );
}
