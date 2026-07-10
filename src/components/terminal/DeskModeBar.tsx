/**
 * Unified desk mode / section chip grammar.
 * Active: soft bg-primary/20 text-primary (never solid primary fill for section chips).
 * With asSectionButtons, buttons keep registry ids for jumpDeskSection .click().
 */
import { cn } from '../../lib/utils';

export type DeskModeItem = {
  id: string;
  label: string;
  short?: string;
  title?: string;
};

/** Shared active/idle chip classes for desk section + mode buttons. */
export function deskModeChipClass(active: boolean, className?: string): string {
  return cn(
    'shrink-0 rounded px-2 py-0.5 font-mono text-type-xs transition-colors',
    active
      ? 'bg-primary/20 text-primary'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
    className,
  );
}

export function DeskModeBar({
  items,
  activeId,
  onSelect,
  /** Set button id + data-desk-section so [ ] jump can .click() the mode. */
  asSectionButtons = false,
  className,
}: {
  items: DeskModeItem[];
  activeId: string;
  onSelect: (id: string) => void;
  asSectionButtons?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn('flex min-w-0 flex-wrap items-center gap-0.5', className)}
      role="tablist"
      data-desk-mode-bar=""
    >
      {items.map((it) => {
        const active = activeId === it.id;
        return (
          <button
            key={it.id}
            type="button"
            id={asSectionButtons ? it.id : undefined}
            data-desk-section={asSectionButtons ? '1' : undefined}
            data-desk-section-active={asSectionButtons && active ? '1' : undefined}
            role="tab"
            aria-selected={active}
            title={it.title}
            onClick={() => onSelect(it.id)}
            className={deskModeChipClass(active)}
          >
            {it.short != null ? (
              <>
                <span className="sm:hidden">{it.short}</span>
                <span className="hidden sm:inline">{it.label}</span>
              </>
            ) : (
              it.label
            )}
          </button>
        );
      })}
    </div>
  );
}
