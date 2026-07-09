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
import { fetchYfHistory, fetchYfInfo } from '../data/yfinanceClient';
import { DATA_CONFIG } from '../../config/constants';
import type { FmpQuote, FmpOptionsResponse } from '../data/types';
import { estimateDividendYield, termRiskFreeRate } from '../options/marketParams';
import type { FmpTreasuryRate, FmpProfile } from '../data/types';
import { isCryptoSymbol, resolveCryptoUnderlyings } from '../options/basis';
import { deribitCurrencyFromSymbol, fetchDeribitMarket } from '../data/deribitClient';
import { buildDeribitSnapshot } from '../options/deribit';

export type Source = 'demo' | 'live';
export type ChainMode = 'auto' | 'fmp' | 'yfinance' | 'deribit';
export type ChainSource = 'fmp' | 'yfinance' | 'deribit' | 'synthetic';

export interface SnapshotContext {
  /** Risk-free rate (decimal) used by the live solver. */
  rfr?: number;
  /** Full treasury curve for term-matched rates (preferred over flat rfr). */
  treasury?: FmpTreasuryRate | FmpTreasuryRate[] | null;
  /** Override spot; falls back to the symbol preset. */
  spot?: number;
  /** Dividend yield override (decimal). */
  dividendYield?: number;
  /** Profile used to estimate dividend yield when override absent. */
  profile?: FmpProfile | null;
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

/** Tick quote for future streaming adapters (OPRA / SSE). Snapshot-only this slice. */
export interface QuoteTick {
  symbol: string;
  bid: number | null;
  ask: number | null;
  last: number | null;
  size?: number;
  ts: number;
  source: 'opra' | 'yfinance' | 'fmp' | 'deribit' | 'synthetic';
}

/**
 * Optional streaming capability on the DataProvider seam.
 * LiveProvider may implement later; Demo never streams.
 * Delta / ChainDiff apply is future-only — ship snapshot path only.
 */
export interface StreamingDataProvider extends DataProvider {
  readonly supportsStreaming: boolean;
  connect?(symbol: string): Promise<void>;
  disconnect?(): void;
  onQuote?(cb: (t: QuoteTick) => void): () => void;
  /** Snapshot-only for this horizon; delta mode is future. */
  onChainSnapshot?(cb: (snap: VolSnapshot) => void): () => void;
}

/** Future only — do not implement delta-apply in this slice. */
export interface ChainDiff {
  symbol: string;
  mode: 'snapshot' | 'delta';
  asOfMs: number;
}

export function isStreamingProvider(p: DataProvider): p is StreamingDataProvider {
  return 'supportsStreaming' in p && (p as StreamingDataProvider).supportsStreaming === true;
}

/**
 * Thin HTTP snapshot transport helper (optional).
 * Store continues to use getProvider() only — this does not fork the seam.
 */
export class HttpSnapshotTransport {
  private readonly baseFetch: typeof fetch;

  constructor(baseFetch: typeof fetch = fetch.bind(globalThis)) {
    this.baseFetch = baseFetch;
  }

  async getJson<T>(url: string, init?: RequestInit): Promise<T | null> {
    try {
      const res = await this.baseFetch(url, init);
      if (!res.ok) return null;
      return (await res.json()) as T;
    } catch {
      return null;
    }
  }
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
  lastChainSource: ChainSource = 'synthetic';
  /** Where the spot price came from for the last snapshot. */
  lastSpotSource: 'fmp' | 'yfinance' | 'deribit' | 'synthetic' = 'synthetic';
  /** Epoch ms when the last chain payload was obtained (best-effort). */
  lastChainFetchedAt = 0;
  /** Epoch ms when the last spot quote was obtained. */
  lastSpotFetchedAt = 0;
  /** Last Deribit annualized funding (crypto only). */
  lastFundingAnn: number | null = null;

  /** Accept a chain only when it has usable expiries (not empty shells). */
  private acceptChain(snap: VolSnapshot | null): boolean {
    return !!snap && Array.isArray(snap.expiries) && snap.expiries.length > 0
      && snap.expiries.some((e) => e.calls.length + e.puts.length > 0);
  }

  async getSnapshot(symbol: string, ctx: SnapshotContext = {}): Promise<VolSnapshot | null> {
    const crypto = isCryptoSymbol(symbol);
    const deribitCcy = deribitCurrencyFromSymbol(symbol);
    const under = crypto ? resolveCryptoUnderlyings(symbol) : null;
    // BTC/ETH: no dividend; ETF proxies (IBIT) may still pay 0.
    const q = crypto || deribitCcy
      ? (ctx.dividendYield ?? 0)
      : (ctx.dividendYield ?? estimateDividendYield(symbol, ctx.profile, ctx.spot));
    // Flat seed r (~30d); per-tenor r(T) is applied inside the chain build.
    const r = ctx.treasury
      ? termRiskFreeRate(ctx.treasury, 30 / 365)
      : (ctx.rfr ?? DATA_CONFIG.market.RISK_FREE_RATE);
    const rateForT = ctx.treasury
      ? (T: number) => termRiskFreeRate(ctx.treasury, T)
      : undefined;
    const chainMode = ctx.chainMode ?? 'auto';
    const buildOpts = { rateForT, useParityDividend: !(crypto || deribitCcy) as boolean };

    // ── Pure BTC / ETH: Deribit public options (auto + explicit) ──────────
    if (deribitCcy && (chainMode === 'auto' || chainMode === 'deribit')) {
      try {
        const market = await fetchDeribitMarket(deribitCcy);
        if (market) {
          const built = buildDeribitSnapshot(market, { r, q: 0, maxExpiries: 12 });
          if (built && this.acceptChain(built)) {
            this.lastChainAvailable = true;
            this.lastChainSource = 'deribit';
            this.lastSpotSource = 'deribit';
            this.lastChainFetchedAt = market.fetchedAt;
            this.lastSpotFetchedAt = market.fetchedAt;
            this.lastFundingAnn = market.fundingAnn;
            return {
              ...built,
              symbol: symbol.toUpperCase(),
              riskFreeRate: r,
              dividendYield: 0,
            };
          }
        }
      } catch (err) {
        console.warn('Deribit chain failed, falling back:', err);
      }
      // Fall through: synthetic crypto smile + any available spot
    }

    // Real spot: FMP first, then yfinance (critical for BTC-USD / crypto).
    let spot: number | null = ctx.spot ?? null;
    let spotSource: 'fmp' | 'yfinance' | 'deribit' | 'synthetic' = 'synthetic';

    if (spot == null) {
      const fmpSym = under?.label === 'BTC' || under?.label === 'ETH'
        ? under.spotSymbol.replace('-', '') // FMP sometimes uses BTCUSD
        : symbol;
      const quoteRes = await fmpGet(`quote?symbol=${encodeURIComponent(fmpSym)}`, { ttl: 12_000 });
      if (quoteRes.json) {
        const arr = quoteRes.json as FmpQuote[];
        if (arr.length > 0 && isFinite(arr[0]!.price) && arr[0]!.price > 0) {
          spot = arr[0]!.price;
          spotSource = 'fmp';
          this.lastSpotFetchedAt = Date.now();
        }
      }
    } else {
      spotSource = 'fmp';
      this.lastSpotFetchedAt = Date.now();
    }

    // yfinance spot for crypto (BTC-USD) or as equity fallback
    if (spot == null) {
      const yfSym = under?.spotSymbol ?? symbol;
      const hist = await fetchYfHistory(yfSym, 60_000);
      if (hist && hist.length > 0) {
        const last = hist[hist.length - 1]!;
        if (last.close > 0) {
          spot = last.close;
          spotSource = 'yfinance';
          this.lastSpotFetchedAt = Date.now();
        }
      }
    }
    if (spot == null && under) {
      void (await fetchYfInfo(under.spotSymbol, 60_000));
    }

    this.lastSpotSource = spotSource;

    let snap: VolSnapshot | null = null;
    let chainOk = false;
    let chainUsed: ChainSource = 'synthetic';

    // Equity / ETF proxy chains (AAPL, QQQ, SPY, IBIT, …)
    // Forced deribit on equities is a no-op (already handled above for BTC/ETH).
    const chainSymbol = deribitCcy
      ? null
      : (under?.chainSymbol ?? symbol);

    const buildFromFmp = async (sym: string): Promise<VolSnapshot | null> => {
      const raw = await fetchFmpOptions(sym);
      if (!raw) return null;
      const quotes: YahooRawOption[] = normalizeFmp(raw as FmpOptionsResponse);
      if (quotes.length < 5) return null;
      const data: YahooResponse = {
        symbol: sym,
        spot: spot ?? quotes[0]!.strike,
        expirations: [...new Set(quotes.map((x) => x.expiry))],
        quotes,
        timestamp: Date.now(),
      };
      const built = buildYahooSnapshot(data, r, q, { maxExpiries: 12, ...buildOpts });
      return this.acceptChain(built) ? built : null;
    };

    const buildFromYf = async (sym: string): Promise<VolSnapshot | null> => {
      // Prefer chain spot when FMP/YF history is cold — keeps IV inversion consistent.
      const built = await fetchYahooSnapshot(sym, 12, r, q, buildOpts);
      return this.acceptChain(built) ? built : null;
    };

    if (chainSymbol) {
      if (chainMode === 'fmp') {
        snap = await buildFromFmp(chainSymbol);
        if (snap) { chainOk = true; chainUsed = 'fmp'; this.lastChainFetchedAt = Date.now(); }
      } else if (chainMode === 'yfinance') {
        snap = await buildFromYf(chainSymbol);
        if (snap) { chainOk = true; chainUsed = 'yfinance'; this.lastChainFetchedAt = Date.now(); }
      } else if (chainMode === 'deribit') {
        // Non-crypto: nothing to do — synthetic fallback below.
      } else {
        // auto (equity / ETF): yfinance first (free + full chain), FMP if paid key works.
        snap = await buildFromYf(chainSymbol);
        if (snap) {
          chainOk = true;
          chainUsed = 'yfinance';
          this.lastChainFetchedAt = Date.now();
        } else {
          snap = await buildFromFmp(chainSymbol);
          if (snap) { chainOk = true; chainUsed = 'fmp'; this.lastChainFetchedAt = Date.now(); }
        }
      }
    }

    // Prefer market spot from the options payload when our spot is still synthetic.
    if (snap && spot == null && snap.spot > 0) {
      spot = snap.spot;
      spotSource = chainUsed === 'yfinance' ? 'yfinance' : spotSource;
      this.lastSpotSource = spotSource;
      this.lastSpotFetchedAt = Date.now();
    }

    this.lastChainAvailable = chainOk;
    this.lastChainSource = chainUsed;
    this.lastFundingAnn = null;

    let result: VolSnapshot;
    if (snap && chainOk) {
      // Patch spot from FMP/YF quote so surface aligns with the live print,
      // but keep the chain IVs from the options feed.
      result = {
        ...snap,
        spot: spot != null && !crypto ? spot : snap.spot,
        surfaceSource: 'live',
      };
    } else {
      // Fallback: synthetic surface seeded by the real spot (if we have one).
      const synth = buildSnapshot(
        symbol,
        Date.now(),
        spot ?? presetFor(symbol)?.spot ?? DATA_CONFIG.SYMBOL_PRESETS.SPY.spot,
        0,
        0,
      );
      result = {
        ...synth,
        riskFreeRate: r,
        dividendYield: crypto || deribitCcy ? 0 : q,
        spot: spot ?? synth.spot,
        surfaceSource: 'synthetic',
      };
      chainUsed = 'synthetic';
      this.lastChainSource = 'synthetic';
      this.lastChainAvailable = false;
    }

    if (crypto || deribitCcy) {
      result = { ...result, symbol: symbol.toUpperCase() };
    }

    return result;
  }
}

const providers: Record<Source, DataProvider> = {
  demo: new DemoProvider(),
  live: new LiveProvider(),
};

export function getProvider(source: Source): DataProvider {
  return providers[source];
}
