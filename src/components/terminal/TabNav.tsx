import { useTerminalStore } from '../../store/terminalStore';
import { TABS } from './tabs';
import { cn } from '../../lib/utils';

export function TabNav() {
  const activeTab = useTerminalStore(s => s.activeTab);
  const setActiveTab = useTerminalStore(s => s.setActiveTab);

  return (
    <nav
      className="flex h-6 shrink-0 items-center border-b border-border bg-background px-0.5"
      role="tablist"
      aria-label="Terminal view tabs"
    >
      <div className="flex gap-0 overflow-x-auto scrollbar-none">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              aria-label={`${tab.label} (Press ${tab.hotkey})`}
              className={cn(
                'flex items-center gap-1 border-b-2 px-2 py-0.5 font-mono text-type-xs uppercase tracking-wide transition-colors sm:px-2.5 sm:text-type-sm',
                isActive
                  ? 'border-primary bg-card text-primary'
                  : 'border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground',
              )}
            >
              <Icon className="h-3 w-3 shrink-0 opacity-70 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
              <span className="whitespace-nowrap">{tab.label}</span>
              <span
                className={cn(
                  'hidden text-type-2xs sm:inline',
                  isActive ? 'text-primary/70' : 'text-muted-foreground/50',
                )}
                aria-hidden="true"
              >
                {tab.hotkey}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
