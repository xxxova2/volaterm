import { cn } from '../../lib/utils';

export type PrintItem = {
  label: string;
  value: string;
  tone?: 'up' | 'down' | 'muted' | 'default';
  title?: string;
};

const toneClass: Record<NonNullable<PrintItem['tone']>, string> = {
  up: 'text-up',
  down: 'text-down',
  muted: 'text-muted-foreground',
  default: 'text-foreground',
};

export function PrintStrip({ items, className }: { items: PrintItem[]; className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-end gap-x-3 gap-y-1 rounded border border-border bg-black/40 px-2 py-1 font-mono',
        className,
      )}
    >
      {items.map((it) => (
        <div key={it.label} className="flex flex-col" title={it.title}>
          <span className="text-type-2xs uppercase tracking-wider text-muted-foreground">{it.label}</span>
          <span
            className={cn(
              'text-xs font-semibold tabular-nums',
              toneClass[it.tone ?? 'default'],
            )}
          >
            {it.value}
          </span>
        </div>
      ))}
    </div>
  );
}
