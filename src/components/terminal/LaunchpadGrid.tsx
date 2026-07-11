/**
 * Home launchpad — registry-driven function codes.
 */
import { useMemo } from 'react';
import {
  LAUNCHPAD_CODES,
  openFunction,
  resolveFunctionId,
} from '../../config/functionRegistry';
import { cn } from '../../lib/utils';

export function LaunchpadGrid({ className }: { className?: string }) {
  const items = useMemo(() => {
    return LAUNCHPAD_CODES.map((code) => {
      const d = resolveFunctionId(code);
      return {
        code,
        label: d?.label ?? code,
        ok: !!d,
      };
    }).filter((x) => x.ok);
  }, []);

  return (
    <div className={cn('rounded border border-border bg-card/50 px-2 py-1.5', className)}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="font-mono text-type-2xs font-semibold tracking-wide text-muted-foreground">
          LAUNCHPAD · function codes
        </div>
        <span className="font-mono text-type-2xs text-muted-foreground">Ctrl/Cmd+K</span>
      </div>
      <div className="grid grid-cols-3 gap-1 sm:grid-cols-4 md:grid-cols-7">
        {items.map((it) => (
          <button
            key={it.code}
            type="button"
            onClick={() => openFunction(it.code)}
            title={it.label}
            className="rounded border border-border bg-background/60 px-1.5 py-1.5 text-left font-mono transition-colors hover:border-primary/40 hover:bg-secondary/40"
          >
            <div className="text-type-xs font-semibold text-foreground">{it.code}</div>
            <div className="truncate text-type-2xs text-muted-foreground">{it.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
