import { useEffect, useState, useCallback } from 'react';
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
import { PanelToolbar } from '../terminal/PanelToolbar';
import { CommandLine } from '../terminal/CommandLine';
import { FunctionMenuBar } from '../terminal/FunctionMenuBar';
import { StatusBar } from '../terminal/StatusBar';
import { ShortcutsOverlay } from '../terminal/ShortcutsOverlay';
import { CommandPalette } from '../terminal/CommandPalette';
import { DeskContextBar } from '../terminal/DeskContextBar';
import { BootBriefing } from '../terminal/BootBriefing';
import { PlaybackBar } from '../terminal/PlaybackBar';
import { SymbolDialog } from '../terminal/SymbolDialog';
import { SidePanel } from './SidePanel';
import { WatchlistStrip } from '../common/WatchlistStrip';
import { sanitizeSymbol } from '../../lib/validation';
import { TABS } from '../terminal/tabs';
import { findSectionMeta, jumpDeskSection } from '../../config/deskNav';
import type { ActiveTab } from '../../lib/options/types';
import { cn } from '../../lib/utils';
import {
  isDisplayStripEnabled,
  isQuoteStripEnabled,
  setDisplayStripEnabled,
} from '../../lib/market/shellPrefs';
import { renderDeskView } from './renderDeskView';

/**
 * Classic Bloomberg-style panel shell (v1):
 * Header → [quote] → Toolbar → Command line → Red function menu → Function area → Status
 * TabNav demoted (hotkeys 1–7 kept). SidePanel collapsed by default (Display toggle).
 */
export function TerminalLayout() {
  const {
    activeTab, setActiveTab, setSymbol, refresh, loading, source, symbol, uiDensity, setDeskContext,
    snapshot, chainAvailable, lastChainUpdate, historicalFrames,
  } = useTerminalStore();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [symbolDialogOpen, setSymbolDialogOpen] = useState(false);
  const [quoteStripOn] = useState(() => isQuoteStripEnabled());
  const [displayStripOn, setDisplayStripOn] = useState(() => isDisplayStripEnabled());
  const [cmdFocusToken, setCmdFocusToken] = useState(0);
  /** First-open rates/macro briefing while heavy chain loads in the background. */
  const [bootOpen, setBootOpen] = useState(true);
  const heavyReady = Boolean(snapshot && chainAvailable && lastChainUpdate > 0) || (!loading && lastChainUpdate > 0);

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

  const toggleDisplayStrip = useCallback(() => {
    setDisplayStripOn((prev) => {
      const next = !prev;
      setDisplayStripEnabled(next);
      return next;
    });
  }, []);

  // SSE spot ticks in live mode (Node/Docker server). No-ops if stream unavailable.
  useSpotStream(symbol, source === 'live');

  // Always boot into LIVE so desks never start on synthetic/demo market data.
  useEffect(() => {
    const s = useTerminalStore.getState();
    if (s.source !== 'live') {
      void s.setSource('live');
    }
    setSymbol('SPY');
  }, [setSymbol]);

  // Migrate stale tab ids (e.g. old "macro" tab merged into rates)
  useEffect(() => {
    const id = activeTab as string;
    if (id === 'macro' || !TABS.some((t) => t.id === activeTab)) {
      setActiveTab('rates');
    }
  }, [activeTab, setActiveTab]);

  const handleSymbolSelect = useCallback((sym: string) => {
    const sanitized = sanitizeSymbol(sym);
    if (!sanitized) {
      toast.error('Invalid symbol', {
        description: 'Enter a ticker (e.g. SPY, AAPL, BTC, ETH)',
      });
      return;
    }
    setSymbol(sanitized);
    toast.success(`Switched to ${sanitized}`);
    setSymbolDialogOpen(false);
  }, [setSymbol]);

  const nextTab = useCallback(() => {
    const tabs = TABS.map((t) => t.id);
    const idx = tabs.indexOf(activeTab);
    setActiveTab(tabs[(idx + 1) % tabs.length] as ActiveTab);
  }, [activeTab, setActiveTab]);

  useKeyboardShortcuts({
    'mod+k': () => {
      // Focus always-on command line AND open the command palette overlay
      setCmdFocusToken((n) => n + 1);
      setPaletteOpen(true);
    },
    r: refresh,
    s: () => setSymbolDialogOpen(true),
    space: () => useTerminalStore.getState().togglePlay(),
    l: () => {
      void useTerminalStore.getState().setSource('live');
      toast.message('LIVE', { description: 'Refreshing market feeds' });
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
    b: () => setActiveTab('crypto'),
    m: () => setActiveTab('desk'),
    v: () => setActiveTab('vol'),
    '[': () => jumpSection(-1),
    ']': () => jumpSection(1),
    d: () => useTerminalStore.getState().toggleUiDensity(),
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
      if (paletteOpen) {
        setPaletteOpen(false);
        return;
      }
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

  return (
    <div
      className={cn(
        'flex h-screen flex-col overflow-hidden bg-background text-foreground density-terminal',
        uiDensity === 'readable' ? 'density-readable' : 'density-dense',
      )}
    >
      <TerminalHeader onOpenShortcuts={() => setShortcutsOpen((o) => !o)} />
      {/* Optional multi-symbol tape — off by default (WL under Home · Feeds / toolbar). */}
      {quoteStripOn && (
        <div
          id="shell-quote-strip"
          className="shrink-0 border-b border-border bg-card/80 px-1"
        >
          <WatchlistStrip className="border-0 bg-transparent" recordMetrics compact />
        </div>
      )}
      {!quoteStripOn && <div id="shell-quote-strip" className="sr-only" aria-hidden />}

      {/* Classic BBG: toolbar → command → red desk menu (7 desks + sections) */}
      <PanelToolbar
        onHelp={() => setShortcutsOpen(true)}
        onWatchlistFocus={() => {
          document.getElementById('shell-quote-strip')?.scrollIntoView({ block: 'nearest' });
        }}
        onOpenDisplay={toggleDisplayStrip}
      />
      <CommandLine
        focusToken={cmdFocusToken}
        onHelp={() => setShortcutsOpen(true)}
        onWatchlistFocus={() => {
          document.getElementById('shell-quote-strip')?.scrollIntoView({ block: 'nearest' });
        }}
      />
      <FunctionMenuBar />
      {activeTab !== 'home' && <DeskContextBar />}

      <main
        className="min-h-0 flex-1 overflow-hidden p-0.5 sm:p-1"
        role="main"
        aria-label="Function area"
        id={`panel-${activeTab}`}
      >
        {renderDeskView(activeTab, loading)}
      </main>

      {/* Display / expiries — collapsed by default; open via toolbar Display */}
      {displayStripOn && <SidePanel />}
      {/* Playback only on Vol Structure when multi-frame history exists (not global chrome). */}
      {activeTab === 'vol' && historicalFrames.length >= 2 && <PlaybackBar />}
      <StatusBar />
      {paletteOpen && (
        <CommandPalette
          onClose={() => setPaletteOpen(false)}
          onHelp={() => {
            setPaletteOpen(false);
            setShortcutsOpen(true);
          }}
          onWatchlistFocus={() => {
            document.getElementById('shell-quote-strip')?.scrollIntoView({ block: 'nearest' });
          }}
        />
      )}
      {shortcutsOpen && <ShortcutsOverlay onClose={() => setShortcutsOpen(false)} />}
      {symbolDialogOpen && (
        <SymbolDialog onSelect={handleSymbolSelect} onClose={() => setSymbolDialogOpen(false)} />
      )}
      {bootOpen && (
        <BootBriefing
          heavyReady={heavyReady}
          onEnter={() => setBootOpen(false)}
        />
      )}
    </div>
  );
}
