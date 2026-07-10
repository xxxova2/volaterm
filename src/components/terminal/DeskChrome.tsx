/**
 * Shared desk strip shell — left label, center content (modes / tools), trailing badge.
 * Sticky by default for multi-mode desks; light desks can pass sticky={false}.
 */
import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

/** Left desk label (VOL STRUCTURE, POSITIONING, RATES, …). */
export function DeskChromeLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'mr-1 shrink-0 font-mono text-type-xs font-bold tracking-wider text-primary',
        className,
      )}
      data-desk-chrome-label=""
    >
      {children}
    </span>
  );
}

export function DeskChrome({
  label,
  children,
  trailing,
  className,
  sticky = true,
  dense = false,
}: {
  /** Desk name shown on the left. Omit / empty to hide. */
  label?: ReactNode;
  children?: ReactNode;
  trailing?: ReactNode;
  className?: string;
  sticky?: boolean;
  /** Tighter padding (Greeks strip). */
  dense?: boolean;
}) {
  const showLabel = label != null && label !== '';
  return (
    <div
      className={cn(
        'flex shrink-0 flex-wrap items-center gap-1 border-b border-border',
        'bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80',
        sticky && 'sticky top-0 z-20',
        dense ? 'gap-0.5 px-1 py-0.5' : 'px-2 py-1',
        className,
      )}
      data-desk-chrome=""
    >
      {showLabel && <DeskChromeLabel className={dense ? 'mr-0.5' : undefined}>{label}</DeskChromeLabel>}
      {children != null && (
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-0.5">{children}</div>
      )}
      {trailing != null && (
        <div className="ml-auto flex shrink-0 items-center gap-1" data-desk-chrome-trailing="">
          {trailing}
        </div>
      )}
    </div>
  );
}
