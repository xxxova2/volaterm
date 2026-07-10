import { useCallback, useEffect, useState } from 'react';
import { cn } from '../../lib/utils';
import { useTerminalStore } from '../../store/terminalStore';
import type { DeskNavItem } from '../../config/deskNav';
import { DeskModeBar } from './DeskModeBar';

export type { DeskNavItem };

/**
 * Sticky horizontal jump links for tall desks (Macros & Rates, etc.).
 * Updates desk context bar + marks active section for [ ] keyboard nav.
 * Uses DeskModeBar for unified soft active chip grammar.
 */
export function DeskSubNav({
  items,
  className,
  label = 'Jump',
  /** When true, no outer sticky chrome — embed inside DeskChrome. */
  bare = false,
}: {
  items: DeskNavItem[];
  className?: string;
  label?: string;
  bare?: boolean;
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

  const chips = (
    <>
      {label ? (
        <span className="mr-1 hidden shrink-0 font-mono text-type-2xs uppercase tracking-wider text-muted-foreground/70 sm:inline">
          {label}
        </span>
      ) : null}
      <DeskModeBar
        items={items.map((it) => ({
          id: it.id,
          label: it.label,
          short: it.short,
        }))}
        activeId={active}
        onSelect={scrollTo}
        className="flex-1 overflow-x-auto scrollbar-none"
      />
      <span className="hidden shrink-0 font-mono text-type-2xs text-muted-foreground/50 lg:inline" title="Keyboard">
        [ ]
      </span>
    </>
  );

  if (bare) {
    return (
      <div className={cn('flex min-w-0 flex-1 items-center gap-1', className)} aria-label={`${label || 'Desk'} sections`}>
        {chips}
      </div>
    );
  }

  return (
    <nav
      className={cn(
        'sticky top-0 z-20 flex shrink-0 items-center gap-1 border-b border-border',
        'bg-background/95 px-2 py-1 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80',
        className,
      )}
      aria-label={`${label} sections`}
    >
      {chips}
    </nav>
  );
}
