/**
 * Live snapshot ring buffer for playback scrubbing and IV rank/percentile.
 * When live chains are available we accumulate real frames instead of
 * synthetic history.
 */

import type { VolSnapshot, SurfaceGrid, HistoricalFrame } from './types';
import { DATA_CONFIG } from '../../config/constants';

export const LIVE_HISTORY_MAX_FRAMES = DATA_CONFIG.history.DEFAULT_FRAMES;

/**
 * Append a live frame; drop oldest when over capacity.
 * Skips near-duplicate timestamps (same second) to avoid polluting IV rank.
 */
export function pushLiveFrame(
  frames: HistoricalFrame[],
  snapshot: VolSnapshot,
  surface: SurfaceGrid,
  maxFrames = LIVE_HISTORY_MAX_FRAMES,
): HistoricalFrame[] {
  const ts = snapshot.timestamp || Date.now();
  const last = frames[frames.length - 1];
  if (last && Math.abs(last.timestamp - ts) < 2_000) {
    // Replace last frame if refresh was very recent (same chain cycle).
    const next = frames.slice(0, -1);
    next.push({ snapshot, surface, timestamp: ts });
    return next;
  }
  const next = [...frames, { snapshot, surface, timestamp: ts }];
  if (next.length > maxFrames) return next.slice(next.length - maxFrames);
  return next;
}

/** Whether a frame series looks like real live captures (not synthetic seed). */
export function isLiveHistory(frames: HistoricalFrame[]): boolean {
  if (frames.length < 2) return false;
  // Synthetic history uses fixed 2h frame spacing from generateHistory.
  // Live frames are irregular and much closer together when active.
  const dt = frames[1]!.timestamp - frames[0]!.timestamp;
  return Math.abs(dt) < 30 * 60 * 1000; // < 30 min between first two frames
}
