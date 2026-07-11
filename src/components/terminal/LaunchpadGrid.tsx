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
    <div className={cn('border border-border bg-card/60', className)}>
      <div className="term-fn-bar justify-between">
        <span>
          <span className="term-code">LPAD</span>
          <span className="ml-1.5 text-muted-foreground">function codes</span>
        </span>
        <span className="normal-case tracking-normal text-muted-foreground">Ctrl/Cmd+K</span>
      </div>
      <div className="grid grid-cols-3 gap-px bg-border sm:grid-cols-4 md:grid-cols-7">
        {items.map((it) => (
          <button
            key={it.code}
            type="button"
            onClick={() => openFunction(it.code)}
            title={it.label}
            className="bg-card px-1.5 py-1 text-left font-mono transition-colors hover:bg-secondary"
          >
            <div className="term-code text-type-xs">{it.code}</div>
            <div className="truncate text-type-2xs text-muted-foreground">{it.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
