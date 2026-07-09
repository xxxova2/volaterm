import { useCallback, useEffect, useState } from 'react';
import { cn } from '../../lib/utils';
import { useTerminalStore } from '../../store/terminalStore';
import type { DeskNavItem } from '../../config/deskNav';

export type { DeskNavItem };

/**
 * Sticky horizontal jump links for tall desks (Macros & Rates, etc.).
 * Updates desk context bar + marks active section for [ ] keyboard nav.
 */
export function DeskSubNav({
  items,
  className,
  label = 'Jump',
}: {
  items: DeskNavItem[];
  className?: string;
  label?: string;
}) {
  const setDeskContext = useTerminalStore((s) => s.setDeskContext);
  const [active, setActive] = useState(items[0]?.id ?? '');

  const applyActive = useCallback(
    (id: string) => {
      setActive(id);
      const meta = items.find((it) => it.id === id);
      setDeskContext({
        id,
        label: meta?.label ?? id,
        apis: meta?.apis,
      });
    },
    [items, setDeskContext],
  );

  const scrollTo = useCallback(
    (id: string) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      applyActive(id);
    },
    [applyActive],
  );

  // Seed context on mount
  useEffect(() => {
    if (items[0]) {
      applyActive(items[0].id);
    }
    return () => {
      setDeskContext({ id: null, label: null, apis: [] });
    };
  }, [items, applyActive, setDeskContext]);

  // Track which section is in view while scrolling the desk
  useEffect(() => {
    if (!items.length) return;
    const els = items
      .map((it) => document.getElementById(it.id))
      .filter((n): n is HTMLElement => !!n);
    if (!els.length) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const id = visible[0]?.target?.id;
        if (id) applyActive(id);
      },
      { root: null, rootMargin: '-80px 0px -55% 0px', threshold: [0, 0.15, 0.4] },
    );
    els.forEach((el) => {
      el.setAttribute('data-desk-section', '1');
      obs.observe(el);
    });
    return () => obs.disconnect();
  }, [items, applyActive]);

  return (
    <nav
      className={cn(
        'sticky top-0 z-20 flex shrink-0 items-center gap-1 border-b border-border',
        'bg-background/95 px-2 py-1 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80',
        className,
      )}
      aria-label={`${label} sections`}
    >
      <span className="mr-1 hidden shrink-0 font-mono text-[9px] uppercase tracking-wider text-muted-foreground/70 sm:inline">
        {label}
      </span>
      <div className="flex min-w-0 flex-1 gap-0.5 overflow-x-auto scrollbar-none">
        {items.map((it) => (
          <button
            key={it.id}
            type="button"
            onClick={() => scrollTo(it.id)}
            className={cn(
              'shrink-0 rounded px-2 py-0.5 font-mono text-[10px] transition-colors',
              active === it.id
                ? 'bg-primary/20 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <span className="sm:hidden">{it.short ?? it.label}</span>
            <span className="hidden sm:inline">{it.label}</span>
          </button>
        ))}
      </div>
      <span className="hidden shrink-0 font-mono text-[9px] text-muted-foreground/50 lg:inline" title="Keyboard">
        [ ]
      </span>
    </nav>
  );
}
