import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface PanelProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Panel({ title, subtitle, actions, children, className }: PanelProps) {
  return (
    <div className={cn('term-panel flex flex-col overflow-hidden', className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
          <div className="flex items-center gap-2">
            {title && <h3 className="text-xs font-semibold text-foreground">{title}</h3>}
            {subtitle && <span className="text-[10px] text-muted-foreground">{subtitle}</span>}
          </div>
          {actions && <div className="flex items-center gap-1">{actions}</div>}
        </div>
      )}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
