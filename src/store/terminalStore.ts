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
import { getProvider, LiveProvider, type ChainMode } from '../lib/data/provider';
import type { FmpQuote, FmpTreasuryRate, FmpProfile, FmpNewsItem, FmpPriceBar, FmpEarnings } from '../lib/data/types';
import { toast } from 'sonner';


function processSurface(surface: SurfaceGrid, spot: number) {
  const readout = sviReadout(surface, spot);
  const arb = diagnoseArbitrage(surface, spot);
  return { surface, sviReadout: readout, arbResult: arb };
}

function processSnapshot(snap: VolSnapshot) {
  return processSurface(buildSurfaceGrid(snap), snap.spot);
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
  /** Whether the live surface used a real option chain (vs synthetic fallback). */
  chainAvailable: boolean;
  /** Where the live spot came from. */
  spotSource: 'fmp' | 'synthetic';
  /** Which source actually served the chain / history / profile. */
  chainUsed: 'fmp' | 'yfinance' | 'synthetic';
  historySource: 'fmp' | 'yfinance' | 'none';
  profileSource: 'fmp' | 'yfinance' | 'none';
  /** Beginner hover hints: show plain-English explanations on tool metrics. */
  explainHovers: boolean;

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
  activeTab: 'surface',
  displayMode: 'strike',
  selectedExpiry: null,
  /** FMP enrichment data */
  fmpQuote: null,
  fmpTreasuryRates: null,
  liveRFR: null,
  fmpSpot: null,
  fmpProfile: null,
  fmpNews: null,
  fmpHistory: null,
  fmpEarnings: null,
  chainAvailable: false,
  spotSource: 'synthetic',
  chainUsed: 'synthetic',
  historySource: 'none',
  profileSource: 'none',
  explainHovers: true,

  playbackInterval: null,
  refreshInterval: null,

  // Fetch FMP enrichment on startup
  setSymbol: async (symbol: string) => {
    const trimmed = symbol.trim().toUpperCase();
    const { MIN_LENGTH, MAX_LENGTH, PATTERN } = VALIDATION_CONFIG.symbol;
    if (!trimmed || trimmed.length < MIN_LENGTH || trimmed.length > MAX_LENGTH || !PATTERN.test(trimmed)) {
      toast.error('Invalid symbol', {
        description: 'Enter 1-5 uppercase letters (e.g. SPY, AAPL)',
      });
      return;
    }

    const { refreshInterval, playbackInterval } = get();
    if (refreshInterval) clearInterval(refreshInterval);
    if (playbackInterval) clearInterval(playbackInterval);

    set({ symbol: trimmed, loading: true, snapshot: null, surface: null, sviReadout: null, arbResult: null, historicalFrames: [], frameIndex: 0, isPlaying: false });

    const demo = getProvider('demo');
    const snapshot = (await demo.getSnapshot(trimmed, { jitter: 0 }))!;
    const frames = demo.getHistory!(trimmed, 64);
    const surface = frames[0]?.surface ?? buildSurfaceGrid(snapshot);
    const { sviReadout: readout, arbResult: arb } = processSurface(surface, snapshot.spot);

    set({
      snapshot,
      surface,
      sviReadout: readout,
      arbResult: arb,
      historicalFrames: frames,
      loading: false,
      lastUpdate: Date.now(),
    });

    // Immediately fetch live data if we're in live mode
    const currentSource = get().source;
    if (currentSource === 'live') {
      const provider = getProvider('live') as LiveProvider;
      const rfr = get().liveRFR ?? undefined;
      provider.getSnapshot(trimmed, { rfr, chainMode: get().chainMode }).then(snap => {
        if (snap) {
          const { surface, sviReadout: readout, arbResult: arb } = processSnapshot(snap);
          set({
            snapshot: snap,
            surface,
            sviReadout: readout,
            arbResult: arb,
            loading: false,
            lastUpdate: Date.now(),
            liveAvailable: true,
            chainAvailable: provider.lastChainAvailable,
            spotSource: provider.lastSpotSource,
            chainUsed: provider.lastChainSource,
          });
          get().storeFrames(snap);

          if (!provider.lastChainAvailable && provider.lastSpotSource === 'synthetic' && !liveWarned) {
            liveWarned = true;
            toast.warning('Live data limited', {
              description: 'No FMP API key / paid options package — showing a synthetic surface over the real spot.',
            });
          }
        }
      }).catch((err) => {
        console.error('Failed to fetch live snapshot:', err);
        toast.error('Live fetch failed', {
          description: err instanceof Error ? err.message : 'Could not retrieve options data',
        });
      });

      // Fetch FMP enrichment (quote, price history, profile, news, earnings, treasury)
      fetchLiveEnrichment(trimmed);
    }

    const id = setInterval(() => {
      const st = get();
      st.refresh();
    }, currentSource === 'demo' ? REFRESH_CONFIG.DEMO_INTERVAL_MS : REFRESH_CONFIG.LIVE_INTERVAL_MS);
    set({ refreshInterval: id });
  },

  storeFrames: (snap: VolSnapshot) => {
    const frames = getProvider('demo').getHistory!(snap.symbol, 64);
    set({ historicalFrames: frames });
  },



  setActiveTab: (tab) => set({ activeTab: tab }),
  setDisplayMode: (mode) => set({ displayMode: mode }),
  setSelectedExpiry: (expiry) => set({ selectedExpiry: expiry }),

  setFrameIndex: (idx: number) => {
    const frames = get().historicalFrames;
    if (idx < 0 || idx >= frames.length) return;
    const frame = frames[idx]!;
    const { sviReadout: readout, arbResult: arb } = processSurface(frame.surface, frame.snapshot.spot);
    set({ frameIndex: idx, snapshot: frame.snapshot, surface: frame.surface, sviReadout: readout, arbResult: arb, lastUpdate: frame.timestamp });
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

    const rfr = get().liveRFR ?? undefined;
    if (state.source === 'live') {
      const provider = getProvider('live') as LiveProvider;
      provider.getSnapshot(state.symbol, { rfr, chainMode: get().chainMode }).then(snap => {
        if (snap) {
          const { surface, sviReadout: readout, arbResult: arb } = processSnapshot(snap);
          set({
            snapshot: snap,
            surface,
            sviReadout: readout,
            arbResult: arb,
            lastUpdate: Date.now(),
            chainAvailable: provider.lastChainAvailable,
            spotSource: provider.lastSpotSource,
            chainUsed: provider.lastChainSource,
          });
        }
      }).catch((err) => {
        console.error('Failed to fetch live data:', err);
      });
      // Refresh cross-cutting FMP enrichment (cached — cheap on repeat).
      fetchLiveEnrichment(state.symbol);
    } else {
      try {
        const spot = state.snapshot?.spot || undefined;
        const snap = await getProvider('demo').getSnapshot(state.symbol, { spot, jitter: (Math.random() - 0.5) * 0.02 });
        if (!snap) throw new Error('synthetic generation failed');
        const { surface, sviReadout: readout, arbResult: arb } = processSnapshot(snap);
        set({ snapshot: snap, surface, sviReadout: readout, arbResult: arb, lastUpdate: Date.now() });
      } catch (err) {
        console.error('Failed to generate synthetic data:', err);
        toast.error('Data Generation Error', {
          description: 'Failed to generate synthetic data',
        });
      }
    }
  },

  setChainMode: (chain: ChainMode) => {
    set({ chainMode: chain });
    // Drop cached chain results (both sources) so the new mode is actually tried.
    invalidateFmpCache('options/symbol');
    invalidateYfCache();
    invalidateYahooChainCache();
    liveWarned = false;
    get().refresh();
  },

  toggleExplainHovers: () => set(s => ({ explainHovers: !s.explainHovers })),

  setSource: async (source: 'demo' | 'live') => {
    const { refreshInterval } = get();
    if (refreshInterval) clearInterval(refreshInterval);
    set({ source });
    if (source === 'live') {
      const provider = getProvider(source) as LiveProvider;
      provider.getSnapshot(get().symbol, { chainMode: get().chainMode }).then(snap => {
        if (snap) {
          const { surface, sviReadout: readout, arbResult: arb } = processSnapshot(snap);
          set({
            snapshot: snap,
            surface,
            sviReadout: readout,
            arbResult: arb,
            loading: false,
            lastUpdate: Date.now(),
            liveAvailable: true,
            chainAvailable: provider.lastChainAvailable,
            spotSource: provider.lastSpotSource,
            chainUsed: provider.lastChainSource,
          });
        }
      }).catch((err) => {
        console.error('Failed to fetch live snapshot on source switch:', err);
        toast.error('Live data error', {
          description: err instanceof Error ? err.message : 'Failed to fetch live snapshot',
        });
      });
      fetchLiveEnrichment(get().symbol);
    }
    const id = setInterval(() => {
      get().refresh();
    }, source === 'demo' ? REFRESH_CONFIG.DEMO_INTERVAL_MS : REFRESH_CONFIG.LIVE_INTERVAL_MS);
    set({ refreshInterval: id });
  },
}));

// One-time warning so we don't toast on every refresh cycle.
let liveWarned = false;

/**
 * Fetch the cross-cutting FMP market data (spot quote, price history, profile,
 * news, earnings, treasury) and push it into the store. All reads go through
 * the cached fmpClient, so repeated calls are cheap once values are warm.
 */
async function fetchLiveEnrichment(symbol: string) {
  const set = useTerminalStore.setState;

  const quotes = await fetchFmpQuote(symbol);
  if (quotes && quotes.length > 0) {
    set({ fmpQuote: quotes[0]!, fmpSpot: quotes[0]!.price, liveAvailable: true });
  }

  // Price history: FMP primary, yfinance fallback.
  let history = await fetchFmpPriceHistory(symbol);
  if (history && history.length > 0) {
    set({ fmpHistory: history, historySource: 'fmp' });
  } else {
    history = await fetchYfHistory(symbol);
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

  // Treasury rates are symbol-independent; fetch once.
  if (!useTerminalStore.getState().fmpTreasuryRates) {
    const rates = await fetchFmpTreasuryRates();
    if (rates && rates.length > 0) {
      set({ fmpTreasuryRates: rates, liveRFR: rates[0]!.year1 / 100 });
    }
  }
}
