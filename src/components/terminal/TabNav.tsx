import { useTerminalStore } from '../../store/terminalStore';
import { TABS } from './tabs';
import { cn } from '../../lib/utils';

export function TabNav() {
  const activeTab = useTerminalStore(s => s.activeTab);
  const setActiveTab = useTerminalStore(s => s.setActiveTab);

  return (
    <nav 
      className="flex h-7 shrink-0 items-center border-b border-border bg-background px-1.5"
      role="tablist"
      aria-label="Terminal view tabs"
    >
      <div className="flex gap-0.5 overflow-x-auto scrollbar-none">
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
                'flex items-center gap-1 rounded-t px-2 py-0.5 font-mono text-[11px] transition-colors sm:px-2.5',
                isActive
                  ? 'border-b-2 border-primary bg-card text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
              <span className="whitespace-nowrap">{tab.label}</span>
              <span className="hidden text-[9px] text-muted-foreground/50 sm:inline" aria-hidden="true">{tab.hotkey}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
