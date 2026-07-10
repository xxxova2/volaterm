import { create } from 'zustand';
import type { VolSnapshot, SurfaceGrid, ActiveTab, DisplayMode } from '../lib/options/types';
import { buildSurfaceGrid } from '../lib/options/synthetic';
import { diagnoseArbitrage, type NoArbResult } from '../lib/options/noarb';
import { sviReadout, type SVIReadout } from '../lib/options/surfaceTools';
import { REFRESH_CONFIG, VALIDATION_CONFIG } from '../config/constants';
import {
  fetchFmpQuote,
  fetchFmpTreasuryRates,
  fetchFmpPriceHistory,
  fetchFmpProfile,
  fetchFmpNews,
  fetchFmpEarnings,
  invalidateFmpCache,
} from '../lib/data/fmpClient';
import { fetchYfHistory, fetchYfInfo, invalidateYfCache } from '../lib/data/yfinanceClient';
import { invalidateYahooChainCache } from '../lib/options/yahoo';
import { invalidateDeribitCache } from '../lib/data/deribitClient';
import { getProvider, LiveProvider, type ChainMode } from '../lib/data/provider';
import type { FmpQuote, FmpTreasuryRate, FmpProfile, FmpNewsItem, FmpPriceBar, FmpEarnings } from '../lib/data/types';
import { usEquitySession, type SessionStatus } from '../lib/options/time';
import { pushLiveFrame } from '../lib/options/liveHistory';
import { toast } from 'sonner';
import {
  EMPTY_PROVENANCE,
  makeProvenance,
  type StoreProvenance,
} from '../lib/data/freshness';
import { perfMark, perfTimeSync } from '../config/perfBudget';
import type { BoardFocusState } from '../hooks/useBoardFocus';

function processSurface(surface: SurfaceGrid, spot: number) {
  const readout = sviReadout(surface, spot);
  const arb = diagnoseArbitrage(surface, spot);
  return { surface, sviReadout: readout, arbResult: arb };
}

function processSnapshot(snap: VolSnapshot) {
  return processSurface(buildSurfaceGrid(snap), snap.spot);
}

function liveSnapshotCtx(state: {
  liveRFR: number | null;
  fmpTreasuryRates: FmpTreasuryRate[] | null;
  fmpProfile: FmpProfile | null;
  chainMode: ChainMode;
}) {
  return {
    rfr: state.liveRFR ?? undefined,
    treasury: state.fmpTreasuryRates,
    profile: state.fmpProfile,
    chainMode: state.chainMode,
  };
}

interface TerminalStore {
  symbol: string;
  snapshot: VolSnapshot | null;
  surface: SurfaceGrid | null;
  sviReadout: SVIReadout | null;
  arbResult: NoArbResult | null;
  historicalFrames: { snapshot: VolSnapshot; surface: SurfaceGrid; timestamp: number }[];
  frameIndex: number;
  isPlaying: boolean;
  speed: number;
  source: 'demo' | 'live';
  chainMode: ChainMode;
  liveAvailable: boolean;
  loading: boolean;
  lastUpdate: number;
  /** Epoch ms of last successful spot quote refresh. */
  lastSpotUpdate: number;
  /** Epoch ms of last successful chain/surface rebuild. */
  lastChainUpdate: number;
  activeTab: ActiveTab;
  displayMode: DisplayMode;
  selectedExpiry: string | null;
  /** FMP enrichment data */
  fmpQuote: FmpQuote | null;
  fmpTreasuryRates: FmpTreasuryRate[] | null;
  liveRFR: number | null;
  fmpSpot: number | null;
  fmpProfile: FmpProfile | null;
  fmpNews: FmpNewsItem[] | null;
  fmpHistory: FmpPriceBar[] | null;
  fmpEarnings: FmpEarnings[] | null;
  /** Whether the live surface used a real option chain. */
  chainAvailable: boolean;
  /** Where the live spot came from (`none` = no real print yet). */
  spotSource: 'fmp' | 'yfinance' | 'deribit' | 'none';
  /** Which source actually served the chain (`none` = unavailable). */
  chainUsed: 'fmp' | 'yfinance' | 'deribit' | 'none';
  historySource: 'fmp' | 'yfinance' | 'none';
  profileSource: 'fmp' | 'yfinance' | 'none';
  /** Latest US equity session snapshot (updated on refresh). */
  session: SessionStatus;
  /** Whether the SSE spot stream is currently connected. */
  streamConnected: boolean;
  /** Playback frames are from live captures only (LIVE-only terminal). */
  historyMode: 'live';
  /** Beginner hover hints: show plain-English explanations on tool metrics. */
  explainHovers: boolean;
  /** UI density: dense (terminal) vs readable (more padding). */
  uiDensity: 'dense' | 'readable';
  /** Active desk section label for context bar (Phase C). */
  deskSectionId: string | null;
  deskSectionLabel: string | null;
  deskSectionApis: string[];
  /** Deribit annualized funding when on BTC/ETH desk. */
  fundingAnn: number | null;
  /**
   * Required multi-domain provenance (nulls allowed).
   * StatusBar dual chips consume provenance.spot / provenance.chain.
   */
  provenance: StoreProvenance;
  /** Board keyboard focus (SoT). Cleared on desk/symbol change. */
  boardFocus: BoardFocusState;
  keyboardBoardFocusEnabled: boolean;
  /** Dual BTC+ETH charts (default off). */
  cryptoDualCharts: boolean;

  playbackInterval: ReturnType<typeof setInterval> | null;
  refreshInterval: ReturnType<typeof setInterval> | null;

  setSymbol: (symbol: string) => void;
  setActiveTab: (tab: ActiveTab) => void;
  setDisplayMode: (mode: DisplayMode) => void;
  setSelectedExpiry: (expiry: string | null) => void;
  setFrameIndex: (idx: number) => void;
  setPlaying: (playing: boolean) => void;
  togglePlay: () => void;
  setSpeed: (speed: number) => void;
  refresh: () => void;
  setSource: (source: 'demo' | 'live') => void;
  setChainMode: (chain: ChainMode) => void;
  storeFrames: (snap: VolSnapshot) => void;
  toggleExplainHovers: () => void;
  setUiDensity: (d: 'dense' | 'readable') => void;
  toggleUiDensity: () => void;
  setDeskContext: (ctx: { id: string | null; label: string | null; apis?: string[] }) => void;
  setBoardFocus: (focus: BoardFocusState) => void;
  setKeyboardBoardFocusEnabled: (on: boolean) => void;
  setCryptoDualCharts: (on: boolean) => void;
}

export const useTerminalStore = create<TerminalStore>((set, get) => ({
  symbol: 'SPY',
  snapshot: null,
  surface: null,
  sviReadout: null,
  arbResult: null,
  historicalFrames: [],
  frameIndex: 0,
  isPlaying: false,
  speed: 1,
  source: 'live',
  chainMode: 'auto',
  liveAvailable: false,
  loading: true,
  lastUpdate: Date.now(),
  lastSpotUpdate: 0,
  lastChainUpdate: 0,
  activeTab: 'home',
  displayMode: 'strike',
  selectedExpiry: null,
  fmpQuote: null,
  fmpTreasuryRates: null,
  liveRFR: null,
  fmpSpot: null,
  fmpProfile: null,
  fmpNews: null,
  fmpHistory: null,
  fmpEarnings: null,
  chainAvailable: false,
  spotSource: 'none',
  chainUsed: 'none',
  historySource: 'none',
  profileSource: 'none',
  session: usEquitySession(),
  streamConnected: false,
  historyMode: 'live',
  explainHovers: true,
  uiDensity: (() => {
    try {
      const raw = localStorage.getItem('ui.density');
      if (raw === 'readable') return 'readable' as const;
    } catch { /* ignore */ }
    return 'dense' as const;
  })(),
  deskSectionId: null,
  deskSectionLabel: null,
  deskSectionApis: [],
  fundingAnn: null,
  provenance: { ...EMPTY_PROVENANCE },
  boardFocus: { boardId: null, rowIndex: 0, colKey: null },
  keyboardBoardFocusEnabled: (() => {
    try {
      const raw = localStorage.getItem('ui.keyboard.boardFocus');
      if (raw === '0' || raw === 'false') return false;
    } catch { /* ignore */ }
    return true;
  })(),
  cryptoDualCharts: (() => {
    try {
      return localStorage.getItem('ui.crypto.dualCharts') === '1';
    } catch { /* ignore */ }
    return false;
  })(),

  playbackInterval: null,
  refreshInterval: null,

  setSymbol: async (symbol: string) => {
    const trimmed = symbol.trim().toUpperCase();
    const { MIN_LENGTH, MAX_LENGTH, PATTERN } = VALIDATION_CONFIG.symbol;
    if (!trimmed || trimmed.length < MIN_LENGTH || trimmed.length > MAX_LENGTH || !PATTERN.test(trimmed)) {
      toast.error('Invalid symbol', {
        description: 'Enter a ticker (e.g. SPY, AAPL, BTC)',
      });
      return;
    }

    const { refreshInterval, playbackInterval } = get();
    if (refreshInterval) clearInterval(refreshInterval);
    if (playbackInterval) clearInterval(playbackInterval);

    // Bump gen so any in-flight live fetch for the previous symbol is dropped.
    liveFetchGen += 1;
    liveWarned = false;

    set({
      symbol: trimmed,
      loading: true,
      snapshot: null,
      surface: null,
      sviReadout: null,
      arbResult: null,
      historicalFrames: [],
      frameIndex: 0,
      isPlaying: false,
      lastSpotUpdate: 0,
      lastChainUpdate: 0,
      historyMode: 'live',
      boardFocus: { boardId: null, rowIndex: 0, colKey: null },
      chainAvailable: false,
      chainUsed: 'none',
      spotSource: 'none',
      fundingAnn: null,
      source: 'live',
    });

    // Background load — do not block first paint (boot briefing uses this window).
    startRefreshLoop(get, set, 'live');
    void (async () => {
      try {
        await fetchLiveEnrichment(trimmed);
      } catch { /* optional */ }
      if (get().symbol !== trimmed) return;
      await fetchLiveSnapshot(trimmed, true);
      if (get().symbol !== trimmed) return;
      if (!get().snapshot) {
        set({
          snapshot: null,
          surface: null,
          sviReadout: null,
          arbResult: null,
          historicalFrames: [],
          loading: false,
          chainUsed: 'none',
          chainAvailable: false,
          session: usEquitySession(),
        });
        if (!liveWarned) {
          liveWarned = true;
          toast.warning('Live chain unavailable', {
            description:
              'Equity chain: yfinance (delayed) or FMP if keyed failed/timeout. Crypto: Deribit. No synthetic chain shown.',
          });
        }
      }
    })();
  },

  storeFrames: (snap: VolSnapshot) => {
    const state = get();
    // LIVE-only ring buffer — never seed demo frames.
    if (!state.chainAvailable || snap.surfaceSource === 'synthetic') {
      set({ historicalFrames: [], historyMode: 'live', frameIndex: 0 });
      return;
    }
    const surface = buildSurfaceGrid(snap);
    const base = state.historyMode === 'live' ? state.historicalFrames : [];
    const frames = pushLiveFrame(base, snap, surface);
    set({
      historicalFrames: frames,
      frameIndex: Math.max(0, frames.length - 1),
      historyMode: 'live',
    });
  },

  setBoardFocus: (focus) => set({ boardFocus: focus }),

  setKeyboardBoardFocusEnabled: (on) => {
    try {
      localStorage.setItem('ui.keyboard.boardFocus', on ? '1' : '0');
    } catch { /* ignore */ }
    set({ keyboardBoardFocusEnabled: on });
  },

  setCryptoDualCharts: (on) => {
    try {
      localStorage.setItem('ui.crypto.dualCharts', on ? '1' : '0');
    } catch { /* ignore */ }
    set({ cryptoDualCharts: on });
  },

  setActiveTab: (tab) => set({
    activeTab: tab,
    deskSectionId: null,
    deskSectionLabel: null,
    deskSectionApis: [],
    boardFocus: { boardId: null, rowIndex: 0, colKey: null },
  }),
  setDisplayMode: (mode) => set({ displayMode: mode }),
  setSelectedExpiry: (expiry) => set({ selectedExpiry: expiry }),

  setFrameIndex: (idx: number) => {
    const frames = get().historicalFrames;
    if (idx < 0 || idx >= frames.length) return;
    const frame = frames[idx]!;
    const { sviReadout: readout, arbResult: arb } = processSurface(frame.surface, frame.snapshot.spot);
    set({
      frameIndex: idx,
      snapshot: frame.snapshot,
      surface: frame.surface,
      sviReadout: readout,
      arbResult: arb,
      lastUpdate: frame.timestamp,
    });
  },

  setPlaying: (playing: boolean) => {
    const { playbackInterval } = get();
    if (playbackInterval) clearInterval(playbackInterval);
    if (playing) {
      const id = setInterval(() => {
        const s = get();
        const next = s.frameIndex + 1;
        if (next >= s.historicalFrames.length) {
          s.setPlaying(false);
          return;
        }
        s.setFrameIndex(next);
      }, REFRESH_CONFIG.PLAYBACK_INTERVAL_MS / get().speed);
      set({ playbackInterval: id, isPlaying: true });
    } else {
      set({ playbackInterval: null, isPlaying: false });
    }
  },

  togglePlay: () => {
    const s = get();
    s.setPlaying(!s.isPlaying);
  },

  setSpeed: (speed: number) => {
    set({ speed });
    const s = get();
    if (s.isPlaying) {
      s.setPlaying(true);
    }
  },

  refresh: async () => {
    const state = get();
    set({ session: usEquitySession() });

    // LIVE-only refresh — market feeds only.
    const session = usEquitySession();
    const now = Date.now();
    const spotCadence = session.isOpen
      ? REFRESH_CONFIG.LIVE_SPOT_OPEN_MS
      : REFRESH_CONFIG.LIVE_SPOT_CLOSED_MS;
    const chainCadence = session.isOpen
      ? REFRESH_CONFIG.LIVE_CHAIN_OPEN_MS
      : REFRESH_CONFIG.LIVE_CHAIN_CLOSED_MS;

    const needSpot = now - state.lastSpotUpdate >= spotCadence || state.lastSpotUpdate === 0;
    const needChain = now - state.lastChainUpdate >= chainCadence || state.lastChainUpdate === 0;

    // When SSE is connected, skip poll-based spot (stream owns lastSpotUpdate).
    if (needSpot && !state.streamConnected) {
      try {
        const quotes = await fetchFmpQuote(state.symbol);
        if (quotes && quotes.length > 0) {
          const q = quotes[0]!;
          const prevSpotKind = get().provenance.spot?.kind;
          const spotProv = makeProvenance('spot', 'fmp', now, {
            previousKind: prevSpotKind,
          });
          set({
            fmpQuote: q,
            fmpSpot: q.price,
            liveAvailable: true,
            lastSpotUpdate: now,
            lastUpdate: now,
            spotSource: 'fmp',
            provenance: { ...get().provenance, spot: spotProv },
          });
          const snap = get().snapshot;
          if (snap && q.price > 0 && Math.abs(q.price - snap.spot) / snap.spot > 0.00005) {
            const patched = { ...snap, spot: q.price, timestamp: now };
            const processed = perfTimeSync('store.spotPatch', () => processSnapshot(patched));
            set({
              snapshot: patched,
              surface: processed.surface,
              sviReadout: processed.sviReadout,
              arbResult: processed.arbResult,
            });
          }
        }
      } catch (err) {
        console.error('Spot refresh failed:', err);
      }
    }

    if (needChain) {
      await fetchLiveSnapshot(state.symbol, false);
      // Periodic enrichment (history/news) — cheap via cache.
      fetchLiveEnrichment(state.symbol);
    }
  },

  setChainMode: (chain: ChainMode) => {
    set({ chainMode: chain, lastChainUpdate: 0 });
    invalidateFmpCache('options/symbol');
    invalidateYfCache();
    invalidateYahooChainCache();
    invalidateDeribitCache();
    liveWarned = false;
    if (get().source === 'live') {
      set({ loading: true });
      liveFetchGen += 1;
      // Force a full chain rebuild for the selected API (auto/yf/fmp/deribit).
      void fetchLiveSnapshot(get().symbol, true);
    }
  },

  toggleExplainHovers: () => set((s) => ({ explainHovers: !s.explainHovers })),

  setUiDensity: (d) => {
    try {
      localStorage.setItem('ui.density', d);
    } catch { /* ignore */ }
    set({ uiDensity: d });
  },

  toggleUiDensity: () => {
    const next = get().uiDensity === 'dense' ? 'readable' : 'dense';
    get().setUiDensity(next);
  },

  setDeskContext: ({ id, label, apis }) => {
    const prev = get();
    if (
      prev.deskSectionId === id
      && prev.deskSectionLabel === label
      && JSON.stringify(prev.deskSectionApis) === JSON.stringify(apis ?? [])
    ) {
      return;
    }
    // Clear previous active mark
    if (prev.deskSectionId) {
      document.getElementById(prev.deskSectionId)?.removeAttribute('data-desk-section-active');
    }
    if (id) {
      document.getElementById(id)?.setAttribute('data-desk-section-active', '1');
    }
    set({
      deskSectionId: id,
      deskSectionLabel: label,
      deskSectionApis: apis ?? [],
    });
  },

  setSource: async (source: 'demo' | 'live') => {
    // Terminal is LIVE-only — demo/synthetic mode is disabled.
    if (source === 'demo') {
      toast.message('LIVE only', {
        description: 'Demo/synthetic surfaces are disabled. Using market feeds.',
      });
    }
    const { refreshInterval } = get();
    if (refreshInterval) clearInterval(refreshInterval);
    set({ source: 'live', lastSpotUpdate: 0, lastChainUpdate: 0, loading: true });
    startRefreshLoop(get, set, 'live');
    // Non-blocking: boot UI shows rates/macro while chain loads in background.
    void (async () => {
      try {
        await fetchLiveEnrichment(get().symbol);
      } catch { /* enrichment is optional */ }
      await fetchLiveSnapshot(get().symbol, true);
    })();
  },
}));

// One-time warning so we don't toast on every refresh cycle.
let liveWarned = false;
/** Monotonic token so late async replies for a previous symbol cannot clobber state. */
let liveFetchGen = 0;

function startRefreshLoop(
  get: () => TerminalStore,
  set: (partial: Partial<TerminalStore>) => void,
  _source: 'demo' | 'live',
) {
  const { refreshInterval } = get();
  if (refreshInterval) clearInterval(refreshInterval);
  const id = setInterval(() => {
    get().refresh();
  }, REFRESH_CONFIG.LIVE_INTERVAL_MS);
  set({ refreshInterval: id });
}

async function fetchLiveSnapshot(symbol: string, force: boolean) {
  const set = useTerminalStore.setState;
  const provider = getProvider('live') as LiveProvider;
  const gen = ++liveFetchGen;
  const upper = symbol.toUpperCase();
  try {
    if (force) {
      invalidateYahooChainCache();
      invalidateFmpCache('options/symbol');
      invalidateDeribitCache();
    }
    perfMark('live.snapshot.start');
    const snap = await provider.getSnapshot(upper, liveSnapshotCtx(useTerminalStore.getState()));
    // Drop stale replies (user switched symbol / mode mid-flight).
    if (gen !== liveFetchGen || useTerminalStore.getState().symbol !== upper) return;
    if (!snap) {
      // Fail-closed: clear any previous surface so we never keep stale/synth under LIVE.
      set({
        loading: false,
        chainAvailable: false,
        chainUsed: 'none',
        session: usEquitySession(Date.now()),
      });
      if (!liveWarned) {
        liveWarned = true;
        toast.warning('Live chain unavailable', {
          description:
            'No live option chain for this symbol. Equities: yfinance (delayed) / FMP if keyed · Crypto: Deribit. Fail-closed.',
        });
      }
      return;
    }
    const { surface, sviReadout: readout, arbResult: arb } = processSnapshot(snap);
    const now = Date.now();
    const liveSpot = provider.lastSpotSource !== 'synthetic';
    const prev = useTerminalStore.getState();
    const chainOk = provider.lastChainAvailable && provider.lastChainSource !== 'synthetic';
    const spotAsOf = liveSpot
      ? (provider.lastSpotFetchedAt || now)
      : (prev.lastSpotUpdate || null);
    const chainAsOf = provider.lastChainFetchedAt || now;
    const spotProv = makeProvenance('spot', provider.lastSpotSource, spotAsOf, {
      previousKind: prev.provenance.spot?.kind,
      demo: false,
    });
    const chainProv = makeProvenance(
      'chain',
      provider.lastChainSource,
      chainAsOf,
      {
        previousKind: prev.provenance.chain?.kind,
        demo: false,
        label: chainOk ? `chain:${provider.lastChainSource}` : 'chain:none',
      },
    );
    const spotSrc = provider.lastSpotSource === 'synthetic' ? 'none' as const : provider.lastSpotSource;
    const chainSrc = provider.lastChainSource === 'synthetic' ? 'none' as const : provider.lastChainSource;
    set({
      snapshot: snap,
      surface,
      sviReadout: readout,
      arbResult: arb,
      loading: false,
      lastUpdate: now,
      lastChainUpdate: now,
      lastSpotUpdate: liveSpot ? now : prev.lastSpotUpdate,
      liveAvailable: true,
      chainAvailable: provider.lastChainAvailable,
      spotSource: spotSrc,
      chainUsed: chainSrc,
      fundingAnn: provider.lastFundingAnn ?? snap.fundingAnn ?? null,
      session: usEquitySession(now),
      provenance: {
        ...prev.provenance,
        spot: spotProv,
        chain: chainProv,
      },
    });
    useTerminalStore.getState().storeFrames(snap);

    if (!provider.lastChainAvailable && !liveWarned) {
      liveWarned = true;
      toast.warning('Live chain unavailable', {
        description:
          'Equity chain: yfinance (delayed) / FMP if keyed failed. Crypto: Deribit. No synthetic chain shown.',
      });
    }
  } catch (err) {
    if (gen !== liveFetchGen) return;
    console.error('Failed to fetch live snapshot:', err);
    toast.error('Live fetch failed', {
      description: err instanceof Error ? err.message : 'Could not retrieve options data',
    });
    set({ loading: false });
  }
}

/**
 * Fetch the cross-cutting FMP market data (spot quote, price history, profile,
 * news, earnings, treasury) and push it into the store. All reads go through
 * the cached fmpClient, so repeated calls are cheap once values are warm.
 */
async function fetchLiveEnrichment(symbol: string) {
  const set = useTerminalStore.setState;
  const upper = symbol.toUpperCase();
  const isBtcEth = upper === 'BTC' || upper === 'ETH';
  const histSymbol = upper === 'BTC' ? 'BTC-USD' : upper === 'ETH' ? 'ETH-USD' : symbol;

  if (!isBtcEth) {
    const quotes = await fetchFmpQuote(symbol);
    if (quotes && quotes.length > 0) {
      const t = Date.now();
      const prev = useTerminalStore.getState();
      set({
        fmpQuote: quotes[0]!,
        fmpSpot: quotes[0]!.price,
        liveAvailable: true,
        lastSpotUpdate: t,
        spotSource: 'fmp',
        provenance: {
          ...prev.provenance,
          spot: makeProvenance('spot', 'fmp', t, { previousKind: prev.provenance.spot?.kind }),
        },
      });
    }
  }

  // Price history: FMP primary, yfinance fallback (BTC-USD / ETH-USD for crypto).
  let history = isBtcEth ? null : await fetchFmpPriceHistory(symbol);
  if (history && history.length > 0) {
    set({ fmpHistory: history, historySource: 'fmp' });
  } else {
    history = await fetchYfHistory(histSymbol);
    if (history && history.length > 0) set({ fmpHistory: history, historySource: 'yfinance' });
    else set({ fmpHistory: null, historySource: 'none' });
  }

  // Fundamentals: FMP primary, yfinance fallback.
  let profile = await fetchFmpProfile(symbol);
  if (profile) {
    set({ fmpProfile: profile, profileSource: 'fmp' });
  } else {
    profile = await fetchYfInfo(symbol);
    if (profile) set({ fmpProfile: profile, profileSource: 'yfinance' });
    else set({ fmpProfile: null, profileSource: 'none' });
  }

  const news = await fetchFmpNews(symbol);
  if (news) set({ fmpNews: news });

  const earnings = await fetchFmpEarnings(symbol);
  if (earnings) set({ fmpEarnings: earnings });

  // Treasury rates are symbol-independent; refresh hourly via fmpClient TTL.
  if (!useTerminalStore.getState().fmpTreasuryRates) {
    const rates = await fetchFmpTreasuryRates();
    if (rates && rates.length > 0) {
      const y1 = rates[0]!.year1;
      set({ fmpTreasuryRates: rates, liveRFR: y1 > 1 ? y1 / 100 : y1 });
    }
  }
}
