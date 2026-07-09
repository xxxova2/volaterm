import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

/**
 * Scroll container with sticky header row for terminal boards (Phase E).
 * Put a normal <table> as children; thead th get sticky styles via CSS class.
 */
export function StickyTable({
  children,
  className,
  maxHeight = 'min(50vh, 360px)',
}: {
  children: ReactNode;
  className?: string;
  maxHeight?: string;
}) {
  return (
    <div
      className={cn('overflow-auto rounded border border-border sticky-table-wrap', className)}
      style={{ maxHeight }}
    >
      {children}
    </div>
  );
}
