/**
 * Hard-core left desk rail — always-visible main desks.
 * Baby sections live only on the red bar to the right of this rail.
 */
import { useTerminalStore } from '../../store/terminalStore';
import { TABS } from './tabs';
import type { ActiveTab } from '../../lib/options/types';
import { cn } from '../../lib/utils';
import { sectionsForTab } from '../../config/deskNav';

/** First baby section when landing on a desk (keeps red bar in sync). */
function defaultSectionFor(tab: ActiveTab): string | null {
  const secs = sectionsForTab(tab);
  return secs[0]?.id ?? null;
}

export function DeskRail() {
  const activeTab = useTerminalStore((s) => s.activeTab);
  const setActiveTab = useTerminalStore((s) => s.setActiveTab);
  const setDeskSection = useTerminalStore((s) => s.setDeskSection);

  const go = (id: ActiveTab) => {
    setActiveTab(id);
    const first = defaultSectionFor(id);
    if (first) {
      // After setActiveTab clears section, re-seed default baby tab.
      queueMicrotask(() => setDeskSection(first));
    }
  };

  return (
    <nav
      className="flex w-11 shrink-0 flex-col border-r border-border bg-[#080c12] sm:w-12"
      aria-label="Main desks"
      role="tablist"
      aria-orientation="vertical"
    >
      {TABS.map((t) => {
        const on = activeTab === t.id;
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={on}
            title={`${t.label} (${t.hotkey})`}
            onClick={() => go(t.id as ActiveTab)}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-0.5 border-b border-border/50 px-0.5 py-1.5 font-mono transition-colors',
              on
                ? 'bg-primary/15 text-primary shadow-[inset_2px_0_0_0_var(--primary)]'
                : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground',
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
            <span className="text-[9px] font-semibold uppercase leading-none tracking-wide">
              {t.label}
            </span>
            <span className="text-[8px] tabular-nums text-muted-foreground/70">{t.hotkey}</span>
          </button>
        );
      })}
    </nav>
  );
}
