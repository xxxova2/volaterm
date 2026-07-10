/**
 * Shared desk strip shell — left label, center content (modes / tools), trailing badge.
 * Sticky by default for multi-mode desks; light desks can pass sticky={false}.
 *
 * Frosted bg/blur only applies when sticky (or frosted=true). Plain bg-* in className
 * then merges cleanly under twMerge — supports-[backdrop-filter]:bg-* is not forced
 * onto non-sticky / custom surfaces (Rates card strip, MM blotter embed).
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
        // Base size is text-type-xs; override with another text-type-* token (same group)
        // so twMerge drops the default (e.g. className="text-type-sm").
        'mr-1 shrink-0 font-mono text-type-xs font-semibold tracking-wider text-muted-foreground',
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
  /** Frosted translucent strip. Defaults to sticky — non-sticky embeds start transparent. */
  frosted,
  labelClassName,
}: {
  /** Desk name shown on the left. Omit / empty to hide. */
  label?: ReactNode;
  children?: ReactNode;
  trailing?: ReactNode;
  className?: string;
  sticky?: boolean;
  /** Tighter padding (Greeks strip). */
  dense?: boolean;
  frosted?: boolean;
  /** Extra classes on the left label (size / margin). */
  labelClassName?: string;
}) {
  const showLabel = label != null && label !== '';
  const useFrosted = frosted ?? sticky;
  return (
    <div
      className={cn(
        'flex shrink-0 flex-wrap items-center gap-1 border-b border-border',
        sticky && 'sticky top-0 z-20',
        // Frosted stack only when requested — plain bg-* in className must win via twMerge.
        // Do not pair with supports-[backdrop-filter]:bg-* unless frosted; that variant does
        // not conflict with unprefixed bg-* and would survive consumer overrides.
        useFrosted && 'bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80',
        dense ? 'gap-0.5 px-1 py-0.5' : 'px-2 py-1',
        className,
      )}
      data-desk-chrome=""
      data-desk-chrome-frosted={useFrosted ? '1' : undefined}
    >
      {showLabel && (
        <DeskChromeLabel className={cn(dense && 'mr-0.5', labelClassName)}>{label}</DeskChromeLabel>
      )}
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
