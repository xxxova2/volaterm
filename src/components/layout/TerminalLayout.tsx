import { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import { useTerminalStore } from '../../store/terminalStore';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import {
  clearBoardFocus,
  copyFocusedCell,
  moveBoardFocus,
} from '../../hooks/useBoardFocus';
import { useSpotStream } from '../../hooks/useSpotStream';
import { toast } from 'sonner';
import { perfMark } from '../../config/perfBudget';
import { TerminalHeader } from '../terminal/TerminalHeader';
import { TabNav } from '../terminal/TabNav';
import { DeskContextBar } from '../terminal/DeskContextBar';
import { StatusBar } from '../terminal/StatusBar';
import { ShortcutsOverlay } from '../terminal/ShortcutsOverlay';
import { SidePanel } from './SidePanel';
import { DashboardView } from '../views/DashboardView';
import { VolStructureView } from '../views/VolStructureView';
import { PositioningView } from '../views/PositioningView';
import { DeskView } from '../views/DeskView';
import { BtcView } from '../views/BtcView';
import { RatesView } from '../views/RatesView';
import { sanitizeSymbol } from '../../lib/validation';
import { TABS } from '../terminal/tabs';
import { findSectionMeta, jumpDeskSection } from '../../config/deskNav';
import type { ActiveTab } from '../../lib/options/types';
import { cn } from '../../lib/utils';
import { DeskLoading } from '../common/Skeleton';

// Heavy 3D / Plotly views are code-split so the initial bundle stays lean.
const GreeksView = lazy(() =>
  import('../views/GreeksView').then((m) => ({ default: m.GreeksView })),
);

export function TerminalLayout() {
  const {
    activeTab, setActiveTab, setSymbol, refresh, loading, source, symbol, uiDensity, setDeskContext,
  } = useTerminalStore();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const jumpSection = useCallback((dir: 1 | -1) => {
    const tab = useTerminalStore.getState().activeTab;
    const id = jumpDeskSection(tab, dir);
    if (!id) return;
    const meta = findSectionMeta(id, tab);
    setDeskContext({
      id,
      label: meta?.label ?? id,
      apis: meta?.apis,
    });
  }, [setDeskContext]);

  // SSE spot ticks in live mode (Node/Docker server). No-ops if stream unavailable.
  useSpotStream(symbol, source === 'live');

  useEffect(() => {
    setSymbol('SPY');
  }, [setSymbol]);

  // Migrate stale tab ids (e.g. old "macro" tab merged into rates)
  useEffect(() => {
    const id = activeTab as string;
    if (id === 'macro' || !TABS.some((t) => t.id === activeTab)) {
      setActiveTab('rates');
    }
  }, [activeTab, setActiveTab]);

  const handleSymbolSwitch = useCallback(() => {
    const sym = window.prompt('Enter symbol:');
    if (!sym) return;

    const sanitized = sanitizeSymbol(sym);
    if (!sanitized) {
      toast.error('Invalid symbol', {
        description: 'Enter a ticker (e.g. SPY, AAPL, BTC, ETH)',
      });
      return;
    }

    setSymbol(sanitized);
    toast.success(`Switched to ${sanitized}`);
  }, [setSymbol]);

  const nextTab = useCallback(() => {
    const tabs = TABS.map((t) => t.id);
    const idx = tabs.indexOf(activeTab);
    setActiveTab(tabs[(idx + 1) % tabs.length] as ActiveTab);
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
    '?': () => setShortcutsOpen((o) => !o),
    tab1: () => setActiveTab('home'),
    tab2: () => setActiveTab('vol'),
    tab3: () => setActiveTab('positioning'),
    tab4: () => setActiveTab('greeks'),
    tab5: () => setActiveTab('desk'),
    tab6: () => setActiveTab('crypto'),
    tab7: () => setActiveTab('rates'),
    // Letter aliases for desks
    b: () => setActiveTab('crypto'),
    m: () => setActiveTab('desk'),
    v: () => setActiveTab('vol'),
    // Phase C — section jump within desk
    '[': () => jumpSection(-1),
    ']': () => jumpSection(1),
    d: () => useTerminalStore.getState().toggleUiDensity(),
    // Board focus: j/k / arrows when a board is focused
    j: () => { if (!moveBoardFocus(1)) { /* no board */ } },
    k: () => { if (!moveBoardFocus(-1)) { /* no board */ } },
    y: () => { copyFocusedCell(); },
    c: () => {
      const s = useTerminalStore.getState();
      if (s.activeTab === 'positioning' && s.keyboardBoardFocusEnabled) {
        s.setBoardFocus({ boardId: 'chain', rowIndex: 0, colKey: 'strike' });
      }
    },
    escape: () => {
      // Priority: ShortcutsOverlay → ImplyDrawer (own listeners) → board focus
      if (shortcutsOpen) {
        setShortcutsOpen(false);
        return;
      }
      clearBoardFocus();
    },
    arrowleft: () => {
      const s = useTerminalStore.getState();
      if (s.boardFocus.boardId) return;
      if (!s.isPlaying) s.setFrameIndex(Math.max(0, s.frameIndex - 1));
    },
    arrowright: () => {
      const s = useTerminalStore.getState();
      if (s.boardFocus.boardId) return;
      if (!s.isPlaying) s.setFrameIndex(Math.min(s.historicalFrames.length - 1, s.frameIndex + 1));
    },
    arrowup: () => { moveBoardFocus(-1); },
    arrowdown: () => { moveBoardFocus(1); },
  });

  useEffect(() => {
    perfMark(`desk.${activeTab}`);
  }, [activeTab]);

  const renderView = () => {
    // Desks that paint without waiting on equity chain load.
    const independentTab =
      activeTab === 'rates'
      || activeTab === 'greeks'
      || activeTab === 'home'
      || activeTab === 'crypto'
      || activeTab === 'desk';

    if (loading && !independentTab) {
      return <DeskLoading message="Building chain surface…" />;
    }

    const view = (() => {
      switch (activeTab) {
        case 'home':
          return <DashboardView />;
        case 'vol':
          return <VolStructureView />;
        case 'positioning':
          return <PositioningView />;
        case 'greeks':
          return <GreeksView />;
        case 'desk':
          return <DeskView />;
        case 'crypto':
          return <BtcView />;
        case 'rates':
          return <RatesView />;
        default:
          return <DashboardView />;
      }
    })();

    return (
      <div key={activeTab} className="h-full term-crossfade">
        <Suspense fallback={<DeskLoading message="Loading view…" />}>{view}</Suspense>
      </div>
    );
  };

  return (
    <div
      className={cn(
        'flex h-screen flex-col overflow-hidden bg-background text-foreground density-terminal',
        uiDensity === 'readable' ? 'density-readable' : 'density-dense',
      )}
    >
      <TerminalHeader />
      <TabNav />
      <DeskContextBar />
      <main
        className="min-h-0 flex-1 overflow-hidden p-0.5 sm:p-1"
        role="main"
        aria-label="Terminal content area"
        id={`panel-${activeTab}`}
      >
        {renderView()}
      </main>
      {/* Bottom control strip — display / expiries / sources (was left rail) */}
      <SidePanel />
      <StatusBar />
      {shortcutsOpen && <ShortcutsOverlay onClose={() => setShortcutsOpen(false)} />}
    </div>
  );
}
