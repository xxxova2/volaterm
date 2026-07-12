/**
 * Deep-red in-function menu bar (Bloomberg function chrome).
 * Section shortcuts for the active desk + peer desk codes on the right.
 * Evidence: student-guide red title/menu bar under command line.
 */
import { useTerminalStore } from '../../store/terminalStore';
import {
  functionMenuSections,
  primaryCodeForTab,
  relatedFunctions,
} from '../../config/relatedFunctions';
import { openFunction } from '../../config/functionRegistry';
import { tabLabel } from '../../config/deskNav';
import { setDeskJump } from '../../lib/market/deskJump';
import { findSectionMeta } from '../../config/deskNav';
import { cn } from '../../lib/utils';
import type { ActiveTab } from '../../lib/options/types';
import { TABS } from './tabs';

export function FunctionMenuBar() {
  const activeTab = useTerminalStore((s) => s.activeTab);
  const sectionId = useTerminalStore((s) => s.deskSectionId);
  const setActiveTab = useTerminalStore((s) => s.setActiveTab);
  const setDeskContext = useTerminalStore((s) => s.setDeskContext);

  const sections = functionMenuSections(activeTab);
  const code = primaryCodeForTab(activeTab);
  const deskName = tabLabel(activeTab);
  const peers = relatedFunctions(activeTab, sectionId, 8).filter(
    (d) => d.tab !== activeTab && !d.sectionId,
  );

  const goSection = (id: string) => {
    setDeskJump(id);
    const meta = findSectionMeta(id, activeTab);
    setDeskContext({
      id,
      label: meta?.label ?? id,
      apis: meta?.apis,
    });
    // Drive the single store value desks subscribe to (no DOM .click()).
    useTerminalStore.getState().setDeskSection(id);
    requestAnimationFrame(() => {
      if (!id.startsWith('vol-sub-') && !id.startsWith('greeks-sub-') && !id.startsWith('pos-sub-')) {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  };

  return (
    <div
      className="term-fn-bar-red flex h-6 shrink-0 items-center gap-0.5 overflow-x-auto scrollbar-none"
      role="menubar"
      aria-label="Function menu"
    >
      {/* Yellow-key style amber code chip */}
      <span className="mr-1 shrink-0 bg-primary px-1.5 py-0.5 font-bold text-primary-foreground">
        {code}
      </span>
      <span className="mr-2 hidden shrink-0 font-semibold tracking-wide text-white/95 sm:inline">
        {deskName}
      </span>

      {sections.length > 0 ? (
        sections.map((s) => {
          const active = sectionId === s.id;
          return (
            <button
              key={s.id}
              type="button"
              role="menuitem"
              onClick={() => goSection(s.id)}
              className={cn(
                'shrink-0 border-r border-white/10 px-2 py-0.5 uppercase tracking-wide transition-colors',
                active
                  ? 'bg-black/35 text-white'
                  : 'text-white/80 hover:bg-black/25 hover:text-white',
              )}
              title={s.code ? `${s.label} (${s.code})` : s.label}
            >
              {s.label}
            </button>
          );
        })
      ) : (
        /* Desk tops without sections — peer desk switchers as menu items */
        TABS.filter((t) => t.id !== 'home').map((t) => {
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="menuitem"
              onClick={() => setActiveTab(t.id as ActiveTab)}
              className={cn(
                'shrink-0 border-r border-white/10 px-2 py-0.5 uppercase tracking-wide',
                active
                  ? 'bg-black/35 text-white'
                  : 'text-white/80 hover:bg-black/25 hover:text-white',
              )}
            >
              {t.label}
            </button>
          );
        })
      )}

      {peers.length > 0 && sections.length > 0 && (
        <>
          <span className="mx-1 shrink-0 text-white/30" aria-hidden>
            |
          </span>
          {peers.slice(0, 5).map((d) => (
            <button
              key={d.functionId}
              type="button"
              role="menuitem"
              onClick={() => openFunction(d.codes[0] ?? d.functionId)}
              className="shrink-0 px-1.5 py-0.5 text-white/65 hover:bg-black/25 hover:text-white"
              title={d.label}
            >
              {d.codes[0] ?? d.functionId}
            </button>
          ))}
        </>
      )}
    </div>
  );
}
