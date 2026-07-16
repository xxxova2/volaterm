import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export function DeskToolShell({
  controls,
  print,
  children,
  className,
  bodyClassName,
}: {
  controls?: ReactNode;
  print?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div className={cn('flex h-full min-h-0 flex-col gap-1', className)}>
      {controls && (
        <div className="flex shrink-0 flex-wrap items-end gap-2 rounded border border-border bg-card/60 px-2 py-1">
          {controls}
        </div>
      )}
      {print && <div className="shrink-0">{print}</div>}
      <div className={cn('min-h-0 flex-1', bodyClassName)}>{children}</div>
    </div>
  );
}
