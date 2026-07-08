/**
 * DataProvider — single seam for swapping the volatility data source.
 *
 * DemoProvider generates a realistic synthetic SVI surface (offline).
 * LiveProvider fetches real quotes from Financial Modeling Prep (FMP) and,
 * optionally, a real option chain from FMP (paid) or yfinance (Python proxy).
 *
 * FMP enrichment (quotes, treasury rates, price history, profile, news) is
 * intentionally NOT part of this interface — it is cross-cutting market data
 * layered on top by the store. This seam only owns the volatility surface.
 *
 * On FMP Free/Starter the option chain is unavailable, so the live surface
 * gracefully falls back to the synthetic surface while still using the REAL
 * spot price from FMP — the app stays in "live" mode with a real underlying.
 */

import type { VolSnapshot, SurfaceGrid } from '../options/types';
import { buildSnapshot, presetFor, generateHistory } from '../options/synthetic';
import { buildYahooSnapshot, fetchYahooSnapshot, type YahooRawOption, type YahooResponse } from '../options/yahoo';
import { normalizeFmp } from '../options/fmp';
import { fmpGet, fetchFmpOptions } from '../data/fmpClient';
import { DATA_CONFIG } from '../../config/constants';
import type { FmpQuote, FmpOptionsResponse } from '../data/types';

export type Source = 'demo' | 'live';
export type ChainMode = 'auto' | 'fmp' | 'yfinance';

export interface SnapshotContext {
  /** Risk-free rate (decimal) used by the live solver. */
  rfr?: number;
  /** Override spot; falls back to the symbol preset. */
  spot?: number;
  /** Small random spot jitter applied in demo mode to simulate live ticks. */
  jitter?: number;
  /** Number of historical playback frames to backfill (demo only). */
  historyFrames?: number;
  /** Which source to use for the option chain (live mode only). */
  chainMode?: ChainMode;
}

export interface DataProvider {
  readonly id: Source;
  getSnapshot(symbol: string, ctx?: SnapshotContext): Promise<VolSnapshot | null>;
  /** Synthetic playback history (only meaningful for the demo provider). */
  getHistory?(symbol: string, frames?: number): { snapshot: VolSnapshot; surface: SurfaceGrid; timestamp: number }[];
}

export class DemoProvider implements DataProvider {
  readonly id = 'demo' as const;

  async getSnapshot(symbol: string, ctx: SnapshotContext = {}): Promise<VolSnapshot | null> {
    const defSpot = ctx.spot ?? presetFor(symbol)?.spot ?? DATA_CONFIG.SYMBOL_PRESETS.SPY.spot;
    return buildSnapshot(symbol, Date.now(), defSpot, 0, ctx.jitter ?? 0);
  }

  /** Synthetic playback history (used regardless of live/demo for the scrubber). */
  getHistory(symbol: string, frames = 64) {
    return generateHistory(symbol, frames);
  }
}

export class LiveProvider implements DataProvider {
  readonly id = 'live' as const;

  /** Whether the last snapshot used a REAL option chain (vs synthetic fallback). */
  lastChainAvailable = false;
  /** Which source actually provided the chain for the last snapshot. */
  lastChainSource: 'fmp' | 'yfinance' | 'synthetic' = 'synthetic';
  /** Where the spot price came from for the last snapshot. */
  lastSpotSource: 'fmp' | 'synthetic' = 'synthetic';

  async getSnapshot(symbol: string, ctx: SnapshotContext = {}): Promise<VolSnapshot | null> {
    const r = ctx.rfr ?? 0.0525;
    const q = 0.013;
    const chainMode = ctx.chainMode ?? 'auto';

    // Real spot from FMP quote (works on Free plan).
    let spot: number | null = null;
    const quoteRes = await fmpGet(`quote?symbol=${encodeURIComponent(symbol)}`, { ttl: 60_000 });
    if (quoteRes.json) {
      const arr = quoteRes.json as FmpQuote[];
      if (arr.length > 0 && isFinite(arr[0]!.price) && arr[0]!.price > 0) {
        spot = arr[0]!.price;
      }
    }
    this.lastSpotSource = spot != null ? 'fmp' : 'synthetic';

    let snap: VolSnapshot | null = null;
    let chainOk = false;
    let chainUsed: 'fmp' | 'yfinance' | 'synthetic' = 'synthetic';

    const buildFromFmp = async (): Promise<boolean> => {
      const raw = await fetchFmpOptions(symbol);
      if (!raw) return false;
      const quotes: YahooRawOption[] = normalizeFmp(raw as FmpOptionsResponse);
      if (quotes.length < 5) return false;
      const data: YahooResponse = {
        symbol,
        spot: spot ?? quotes[0]!.strike,
        expirations: [...new Set(quotes.map((x) => x.expiry))],
        quotes,
        timestamp: Date.now(),
      };
      const built = buildYahooSnapshot(data, r, q, 12);
      if (!built) return false;
      snap = built;
      chainUsed = 'fmp';
      return true;
    };

    if (chainMode === 'fmp') {
      chainOk = await buildFromFmp();
    } else if (chainMode === 'yfinance') {
      snap = await fetchYahooSnapshot(symbol, 12, r, q);
      chainOk = !!snap;
      chainUsed = snap ? 'yfinance' : 'synthetic';
    } else {
      // Auto: yfinance is the most complete FREE chain, so try it first;
      // fall back to FMP (paid) if yfinance is unavailable; synthetic last.
      snap = await fetchYahooSnapshot(symbol, 12, r, q);
      if (snap) {
        chainOk = true;
        chainUsed = 'yfinance';
      } else {
        chainOk = await buildFromFmp();
      }
    }

    this.lastChainAvailable = chainOk;
    this.lastChainSource = chainUsed;

    if (!snap) {
      // Fallback: synthetic surface seeded by the real spot (if we have one).
      snap = buildSnapshot(
        symbol,
        Date.now(),
        spot ?? presetFor(symbol)?.spot ?? DATA_CONFIG.SYMBOL_PRESETS.SPY.spot,
        0,
        0,
      );
      chainUsed = 'synthetic';
    } else if (spot != null) {
      // Always prefer the authoritative FMP spot over the chain's spot.
      snap = { ...snap, spot };
    }

    return snap;
  }
}

const providers: Record<Source, DataProvider> = {
  demo: new DemoProvider(),
  live: new LiveProvider(),
};

export function getProvider(source: Source): DataProvider {
  return providers[source];
}
