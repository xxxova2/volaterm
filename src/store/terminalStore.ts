import { create } from 'zustand';
import type { VolSnapshot, SurfaceGrid, ActiveTab, DisplayMode } from '../lib/options/types';
import { buildSnapshot, buildSurfaceGrid, generateHistory, presetFor } from '../lib/options/synthetic';
import { fetchYahooSnapshot } from '../lib/options/yahoo';
import { REFRESH_CONFIG } from '../config/constants';
import { toast } from 'sonner';


interface TerminalStore {
  symbol: string;
  snapshot: VolSnapshot | null;
  surface: SurfaceGrid | null;
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
  playbackInterval: null,
  refreshInterval: null,

  setSymbol: (symbol: string) => {
    const { refreshInterval, playbackInterval } = get();
    if (refreshInterval) clearInterval(refreshInterval);
    if (playbackInterval) clearInterval(playbackInterval);

    set({ symbol, loading: true, snapshot: null, surface: null, historicalFrames: [], frameIndex: 0, isPlaying: false });

    const preset = presetFor(symbol);
    const snapshot = buildSnapshot(symbol, Date.now(), preset?.spot ?? 100, 0, 0);
    const frames = generateHistory(symbol, 64);
    const surface = frames[0]?.surface ?? buildSurfaceGrid(snapshot);

    set({
      snapshot,
      surface,
      historicalFrames: frames,
      loading: false,
      lastUpdate: Date.now(),
    });

    // Immediately fetch live data if we're in live mode
    const currentSource = get().source;
    if (currentSource === 'live') {
      fetchYahooSnapshot(symbol).then(snap => {
        if (snap) {
          const surface = buildSurfaceGrid(snap);
          set({ snapshot: snap, surface, loading: false, lastUpdate: Date.now(), liveAvailable: true });
          get().storeFrames(snap);
        }
      }).catch(() => {});
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
    set({ frameIndex: idx, snapshot: frame.snapshot, surface: frame.surface, lastUpdate: frame.timestamp });
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
    if (state.source === 'live') {
      fetchYahooSnapshot(state.symbol).then(snap => {
        if (snap) {
          const surface = buildSurfaceGrid(snap);
          set({ snapshot: snap, surface, lastUpdate: Date.now() });
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
        const spot = state.snapshot?.spot || 548;
        const snap = buildSnapshot(state.symbol, Date.now(), spot, 0, (Math.random() - 0.5) * 0.02);
        const surface = buildSurfaceGrid(snap);
        set({ snapshot: snap, surface, lastUpdate: Date.now() });
      });
    } else {
      try {
        const spot = state.snapshot?.spot || 548;
        const snap = buildSnapshot(state.symbol, Date.now(), spot, 0, (Math.random() - 0.5) * 0.02);
        const surface = buildSurfaceGrid(snap);
        set({ snapshot: snap, surface, lastUpdate: Date.now() });
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
          const surface = buildSurfaceGrid(snap);
          set({ snapshot: snap, surface, loading: false, lastUpdate: Date.now(), liveAvailable: true });
        }
      }).catch(() => {});
    }
    const id = setInterval(() => {
      get().refresh();
    }, source === 'demo' ? REFRESH_CONFIG.DEMO_INTERVAL_MS : REFRESH_CONFIG.LIVE_INTERVAL_MS);
    set({ refreshInterval: id });
  },
}));
