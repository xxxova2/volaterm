import { useTerminalStore } from '../../store/terminalStore';
import { TABS } from './tabs';
import { cn } from '../../lib/utils';

export function TabNav() {
  const activeTab = useTerminalStore(s => s.activeTab);
  const setActiveTab = useTerminalStore(s => s.setActiveTab);

  return (
    <nav 
      className="flex h-8 items-center border-b border-border bg-background px-2"
      role="tablist"
      aria-label="Terminal view tabs"
    >
      <div className="flex gap-0.5">
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
                'flex items-center gap-1.5 px-3 py-1 text-xs font-mono rounded-t transition-colors',
                isActive
                  ? 'bg-card text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted',
              )}
            >
              <Icon className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{tab.label}</span>
              <span className="text-muted-foreground/50 text-[10px]" aria-hidden="true">{tab.hotkey}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
