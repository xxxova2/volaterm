import { create } from 'zustand';
import type { VolSnapshot, SurfaceGrid, ActiveTab, DisplayMode } from '../lib/options/types';
import { buildSnapshot, buildSurfaceGrid, generateHistory, presetFor } from '../lib/options/synthetic';
import { fetchYahooSnapshot } from '../lib/options/yahoo';
import { diagnoseArbitrage, type NoArbResult } from '../lib/options/noarb';
import { sviReadout, type SVIReadout } from '../lib/options/surfaceTools';
import { REFRESH_CONFIG, VALIDATION_CONFIG, DATA_CONFIG, FMP_CONFIG } from '../config/constants';
import { fetchFmpQuote, fetchFmpTreasuryRates } from '../lib/data/fmpClient';
import type { FmpQuote, FmpTreasuryRate } from '../lib/data/types';
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
  storeFrames: (snap: VolSnapshot) => void;
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

  playbackInterval: null,
  refreshInterval: null,

  // Fetch FMP enrichment on startup
  setSymbol: (symbol: string) => {
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

    const preset = presetFor(trimmed);
    const defSpot = preset?.spot ?? DATA_CONFIG.SYMBOL_PRESETS.SPY.spot;
    const snapshot = buildSnapshot(trimmed, Date.now(), defSpot, 0, 0);
    const frames = generateHistory(trimmed, 64);
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
      const rfr = get().liveRFR ?? undefined;
      fetchYahooSnapshot(trimmed, 12, rfr).then(snap => {
        if (snap) {
          const { surface, sviReadout: readout, arbResult: arb } = processSnapshot(snap);
          set({ snapshot: snap, surface, sviReadout: readout, arbResult: arb, loading: false, lastUpdate: Date.now(), liveAvailable: true });
          get().storeFrames(snap);
        }
      }).catch((err) => {
        console.error('Failed to fetch live snapshot:', err);
        toast.error('Live fetch failed', {
          description: 'Could not retrieve options data',
        });
      });

      // Fetch FMP enrichment (quote + treasury) in parallel
      fetchFmpQuote(trimmed).then(quotes => {
        if (quotes && quotes.length > 0) {
          set({ fmpQuote: quotes[0]!, fmpSpot: quotes[0]!.price });
        }
      });
    }

    // Fetch treasury rates (one-time, symbol-independent)
    if (!get().fmpTreasuryRates) {
      fetchFmpTreasuryRates().then(rates => {
        if (rates && rates.length > 0) {
          const latest = rates[0]!;
          // Use 1y Treasury as risk-free rate (converted from % to decimal)
          const rfr = latest.year1 / 100;
          set({ fmpTreasuryRates: rates, liveRFR: rfr });
        }
      });
    }

    const id = setInterval(() => {
      const st = get();
      st.refresh();
    }, currentSource === 'demo' ? REFRESH_CONFIG.DEMO_INTERVAL_MS : REFRESH_CONFIG.LIVE_INTERVAL_MS);
    set({ refreshInterval: id });
  },

  storeFrames: (snap: VolSnapshot) => {
    const frames = generateHistory(snap.symbol, 64);
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

  refresh: () => {
    const state = get();
    // Refresh FMP quote and treasury on every cycle
    fetchFmpQuote(state.symbol).then(quotes => {
      if (quotes && quotes.length > 0) {
        set({ fmpQuote: quotes[0]!, fmpSpot: quotes[0]!.price });
      }
    });
    fetchFmpTreasuryRates().then(rates => {
      if (rates && rates.length > 0) {
        const latest = rates[0]!;
        set({ fmpTreasuryRates: rates, liveRFR: latest.year1 / 100 });
      }
    });

    const rfr = get().liveRFR ?? undefined;
    if (state.source === 'live') {
      fetchYahooSnapshot(state.symbol, 12, rfr).then(snap => {
        if (snap) {
          const { surface, sviReadout: readout, arbResult: arb } = processSnapshot(snap);
          set({ snapshot: snap, surface, sviReadout: readout, arbResult: arb, lastUpdate: Date.now() });
        } else {
          toast.error('Failed to fetch live data', {
            description: 'Unable to retrieve options data from Yahoo Finance',
          });
        }
      }).catch((err) => {
        console.error('Failed to fetch live data:', err);
        toast.error('Network Error', {
          description: 'Failed to fetch live data. Switching to demo mode.',
        });
        // Fallback to demo mode on error
        set({ source: 'demo' });
        const defSpot = presetFor(state.symbol)?.spot ?? DATA_CONFIG.SYMBOL_PRESETS.SPY.spot;
        const spot = state.snapshot?.spot || defSpot;
        const snap = buildSnapshot(state.symbol, Date.now(), spot, 0, (Math.random() - 0.5) * 0.02);
        const { surface, sviReadout: readout, arbResult: arb } = processSnapshot(snap);
        set({ snapshot: snap, surface, sviReadout: readout, arbResult: arb, lastUpdate: Date.now() });
      });
    } else {
      try {
        const defSpot = presetFor(state.symbol)?.spot ?? DATA_CONFIG.SYMBOL_PRESETS.SPY.spot;
        const spot = state.snapshot?.spot || defSpot;
        const snap = buildSnapshot(state.symbol, Date.now(), spot, 0, (Math.random() - 0.5) * 0.02);
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

  setSource: (source: 'demo' | 'live') => {
    const { refreshInterval } = get();
    if (refreshInterval) clearInterval(refreshInterval);
    set({ source });
    if (source === 'live') {
      fetchYahooSnapshot(get().symbol).then(snap => {
        if (snap) {
          const { surface, sviReadout: readout, arbResult: arb } = processSnapshot(snap);
          set({ snapshot: snap, surface, sviReadout: readout, arbResult: arb, loading: false, lastUpdate: Date.now(), liveAvailable: true });
        }
      }).catch((err) => {
        console.error('Failed to fetch live snapshot on source switch:', err);
      });
    }
    const id = setInterval(() => {
      get().refresh();
    }, source === 'demo' ? REFRESH_CONFIG.DEMO_INTERVAL_MS : REFRESH_CONFIG.LIVE_INTERVAL_MS);
    set({ refreshInterval: id });
  },
}));
