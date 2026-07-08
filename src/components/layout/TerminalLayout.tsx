import { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import { useTerminalStore } from '../../store/terminalStore';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { toast } from 'sonner';
import { TerminalHeader } from '../terminal/TerminalHeader';
import { TabNav } from '../terminal/TabNav';
import { PlaybackBar } from '../terminal/PlaybackBar';
import { StatusBar } from '../terminal/StatusBar';
import { ShortcutsOverlay } from '../terminal/ShortcutsOverlay';
import { Panel } from '../terminal/Panel';
import { SidePanel } from './SidePanel';
import { SmileView } from '../views/SmileView';
import { TermView } from '../views/TermView';
import { GexView } from '../views/GexView';
import { OptionChain } from '../views/OptionChain';
import { DashboardView } from '../views/DashboardView';
import { ArbitrageView } from '../views/ArbitrageView';
import { MarketView } from '../views/MarketView';
import { sanitizeSymbol } from '../../lib/validation';

// Heavy 3D / Plotly views are code-split so the initial bundle stays lean.
const SurfaceView = lazy(() =>
  import('../views/surface/SurfaceView').then((m) => ({ default: m.SurfaceView })),
);
const GreeksView = lazy(() =>
  import('../views/GreeksView').then((m) => ({ default: m.GreeksView })),
);

export function TerminalLayout() {
  const { activeTab, setActiveTab, setSymbol, refresh, loading } = useTerminalStore();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  useEffect(() => {
    setSymbol('SPY');
  }, [setSymbol]);

  const handleSymbolSwitch = useCallback(() => {
    const sym = window.prompt('Enter symbol:');
    if (!sym) return;
    
    const sanitized = sanitizeSymbol(sym);
    if (!sanitized) {
      toast.error('Invalid symbol', {
        description: 'Please enter a valid stock symbol (1-5 letters, A-Z only)',
      });
      return;
    }
    
    setSymbol(sanitized);
    toast.success(`Switched to ${sanitized}`);
  }, [setSymbol]);

  const nextTab = useCallback(() => {
    const tabs = ['surface', 'smile', 'term', 'greeks', 'gex', 'chain', 'dashboard', 'arbitrage', 'market'];
    const idx = tabs.indexOf(activeTab);
    setActiveTab(tabs[(idx + 1) % tabs.length] as typeof activeTab);
  }, [activeTab, setActiveTab]);

  useKeyboardShortcuts({
    r: refresh,
    s: handleSymbolSwitch,
    space: () => useTerminalStore.getState().togglePlay(),
    l: () => {
      const s = useTerminalStore.getState();
      s.setSource(s.source === 'demo' ? 'live' : 'demo');
    },
    tab: nextTab,
    '?': () => setShortcutsOpen(o => !o),
    tab1: () => setActiveTab('surface'),
    tab2: () => setActiveTab('smile'),
    tab3: () => setActiveTab('term'),
    tab4: () => setActiveTab('greeks'),
    tab5: () => setActiveTab('gex'),
    tab6: () => setActiveTab('chain'),
    tab7: () => setActiveTab('dashboard'),
    tab8: () => setActiveTab('arbitrage'),
    tab9: () => setActiveTab('market'),
    arrowleft: () => {
      const s = useTerminalStore.getState();
      if (!s.isPlaying) s.setFrameIndex(Math.max(0, s.frameIndex - 1));
    },
    arrowright: () => {
      const s = useTerminalStore.getState();
      if (!s.isPlaying) s.setFrameIndex(Math.min(s.historicalFrames.length - 1, s.frameIndex + 1));
    },
  });

  const renderView = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-muted-foreground font-mono text-xs animate-pulse">LOADING SURFACE DATA...</div>
        </div>
      );
    }

    const viewFallback = (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground font-mono text-xs animate-pulse">LOADING VIEW...</div>
      </div>
    );

    const view = (() => {
      switch (activeTab) {
        case 'surface':
          return <SurfaceView />;
        case 'smile':
          return <SmileView />;
        case 'term':
          return <TermView />;
        case 'greeks':
          return <GreeksView />;
        case 'gex':
          return <GexView />;
        case 'chain':
          return (
            <Panel title="Option Chain" className="h-full">
              <div className="h-full"><OptionChain /></div>
            </Panel>
          );
        case 'dashboard':
          return <DashboardView />;
        case 'arbitrage':
          return <ArbitrageView />;
        case 'market':
          return <MarketView />;
        default:
          return <SurfaceView />;
      }
    })();

    return <Suspense fallback={viewFallback}>{view}</Suspense>;
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <TerminalHeader />
      <TabNav />
      <div className="flex flex-1 overflow-hidden">
        <SidePanel />
        <main 
          className="flex-1 overflow-hidden p-1"
          role="main"
          aria-label="Terminal content area"
          id={`panel-${activeTab}`}
        >
          {renderView()}
        </main>
      </div>
      <PlaybackBar />
      <StatusBar />
      {shortcutsOpen && <ShortcutsOverlay onClose={() => setShortcutsOpen(false)} />}
    </div>
  );
}
