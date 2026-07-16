/**
 * Shared client cache for Greeks pack (surfaces + GEX + OHLC).
 * Terminal chain load and Vol · Greeks must not each pull a fresh yfinance book.
 * Prefetch after chain success; GRK tab hits memory / Node cache, not a third trip.
 */
import { macrovolApi, type GreeksData, type HistoryData } from './api';

/** Match server OPTIONS_MS (~3 min) so remounts do not re-fire cold yfinance. */
const TTL_MS = 3 * 60 * 1000;

export type GreeksPack = {
  data: GreeksData;
  ohlc: HistoryData['data'];
  ts: number;
};

const mem = new Map<string, GreeksPack>();
const inflight = new Map<string, Promise<GreeksPack>>();

export function peekGreeksCache(ticker: string): GreeksPack | null {
  const key = ticker.toUpperCase();
  const hit = mem.get(key);
  if (!hit) return null;
  if (Date.now() - hit.ts > TTL_MS) return null;
  return hit;
}

/** Stale-but-present: show immediately while revalidate (no blank flash). */
export function peekGreeksCacheStale(ticker: string): GreeksPack | null {
  return mem.get(ticker.toUpperCase()) ?? null;
}

export async function loadGreeksPack(
  ticker: string,
  q?: number | null,
): Promise<GreeksPack> {
  const key = ticker.toUpperCase();
  const fresh = peekGreeksCache(key);
  if (fresh) return fresh;

  const pending = inflight.get(key);
  if (pending) return pending;

  const work = (async () => {
    try {
      const [greeksRes, ohlcRes] = await Promise.all([
        macrovolApi.greeks(key, null, q ?? null),
        macrovolApi.greeksHistory(key, '1mo').catch(
          () => ({ ticker: key, data: [] }) as HistoryData,
        ),
      ]);
      const pack: GreeksPack = {
        data: greeksRes,
        ohlc: ohlcRes.data || [],
        ts: Date.now(),
      };
      mem.set(key, pack);
      return pack;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, work);
  return work;
}

/** Fire-and-forget after terminal chain lands — GRK should not cold-start. */
export function prefetchGreeks(ticker: string, q?: number | null): void {
  const key = ticker.toUpperCase();
  if (peekGreeksCache(key)) return;
  void loadGreeksPack(key, q).catch(() => { /* non-blocking */ });
}

export function invalidateGreeksCache(ticker?: string): void {
  if (ticker) {
    mem.delete(ticker.toUpperCase());
    inflight.delete(ticker.toUpperCase());
  } else {
    mem.clear();
    inflight.clear();
  }
}
