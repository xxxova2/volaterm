/**
 * Hook-local dual BTC/ETH books — shared Deribit cache, half-rate inactive.
 * CoinGecko spot fills tape when Deribit index fails (fail-closed, no demo).
 * Active book remains store + LiveProvider via setSymbol.
 */
import { useEffect, useRef, useState } from 'react';
import { fetchDeribitMarket, type DeribitMarketBundle } from '../lib/data/deribitClient';
import { buildDeribitSnapshot } from '../lib/options/deribit';
import type { VolSnapshot } from '../lib/options/types';
import { makeProvenance, type DataProvenance } from '../lib/data/freshness';
import { useTerminalStore } from '../store/terminalStore';
import { macrovolApi, type CryptoSpotAsset, type CryptoSpotData } from '../lib/macrovol/api';

export type DualTapeSnap = {
  ccy: 'BTC' | 'ETH';
  spot: number | null;
  fundingAnn: number | null;
  optionCount: number;
  asOf: number;
  ok: boolean;
  /** Spot source: Deribit index when live; CoinGecko when Deribit down */
  spotSource?: 'deribit' | 'coingecko' | null;
  change24hPct?: number | null;
  marketCapUsd?: number | null;
  /** Deribit index − CoinGecko in bps of spot (when both live) */
  basisBps?: number | null;
};

export type CryptoBookState = {
  ccy: 'BTC' | 'ETH';
  market: DeribitMarketBundle | null;
  snapshot: VolSnapshot | null;
  asOf: number;
  provenance: DataProvenance | null;
};

const ACTIVE_MS = 30_000;
const INACTIVE_MS = 60_000;
const GECKO_MS = 60_000;

function geckoAsset(ccy: 'BTC' | 'ETH', g: CryptoSpotData | null): CryptoSpotAsset | null {
  if (!g) return null;
  const row = ccy === 'BTC' ? g.btc : g.eth;
  return row ?? g.assets?.find((a) => a.symbol === ccy) ?? null;
}

function toTape(
  ccy: 'BTC' | 'ETH',
  m: DeribitMarketBundle | null,
  g: CryptoSpotData | null,
): DualTapeSnap {
  if (m?.indexPrice != null && Number.isFinite(m.indexPrice)) {
    const ga = geckoAsset(ccy, g);
    let basisBps: number | null = null;
    if (ga?.spot_usd != null && ga.spot_usd > 0) {
      basisBps = ((m.indexPrice - ga.spot_usd) / ga.spot_usd) * 10_000;
    }
    return {
      ccy,
      spot: m.indexPrice,
      fundingAnn: m.fundingAnn,
      optionCount: m.options?.length ?? 0,
      asOf: m.fetchedAt,
      ok: true,
      spotSource: 'deribit',
      change24hPct: ga?.change_24h_pct ?? null,
      marketCapUsd: ga?.market_cap_usd ?? null,
      basisBps,
    };
  }
  // Deribit down — CoinGecko spot backup
  const ga = geckoAsset(ccy, g);
  if (ga?.spot_usd != null && Number.isFinite(ga.spot_usd)) {
    return {
      ccy,
      spot: ga.spot_usd,
      fundingAnn: null,
      optionCount: 0,
      asOf: ga.last_updated_at ? ga.last_updated_at * 1000 : (g?.as_of_ms ?? Date.now()),
      ok: true,
      spotSource: 'coingecko',
      change24hPct: ga.change_24h_pct ?? null,
      marketCapUsd: ga.market_cap_usd ?? null,
      basisBps: null,
    };
  }
  return {
    ccy,
    spot: null,
    fundingAnn: null,
    optionCount: 0,
    asOf: Date.now(),
    ok: false,
    spotSource: null,
    basisBps: null,
  };
}

export function useCryptoDualBooks(opts?: { dualCharts?: boolean }) {
  const dualCharts = opts?.dualCharts ?? false;
  const symbol = useTerminalStore((s) => s.symbol);
  const storeSnap = useTerminalStore((s) => s.snapshot);
  const active: 'BTC' | 'ETH' = symbol === 'ETH' ? 'ETH' : 'BTC';

  const [tape, setTape] = useState<{ btc: DualTapeSnap | null; eth: DualTapeSnap | null }>({
    btc: null,
    eth: null,
  });
  const [books, setBooks] = useState<{
    btc: CryptoBookState | null;
    eth: CryptoBookState | null;
  }>({ btc: null, eth: null });
  const [gecko, setGecko] = useState<CryptoSpotData | null>(null);

  const lastInactiveFetch = useRef(0);
  const lastGeckoFetch = useRef(0);
  const geckoRef = useRef<CryptoSpotData | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async (forceInactive: boolean) => {
      const now = Date.now();
      const needInactive = forceInactive || now - lastInactiveFetch.current >= INACTIVE_MS;
      const needGecko = forceInactive || now - lastGeckoFetch.current >= GECKO_MS;

      const [btcM, ethM, geckoRes] = await Promise.all([
        fetchDeribitMarket('BTC').catch(() => null),
        needInactive || active === 'ETH'
          ? fetchDeribitMarket('ETH').catch(() => null)
          : Promise.resolve(null),
        needGecko
          ? macrovolApi.cryptoSpot().catch(() => null)
          : Promise.resolve(null),
      ]);

      if (cancelled) return;

      if (geckoRes && !geckoRes.error) {
        geckoRef.current = geckoRes;
        setGecko(geckoRes);
        lastGeckoFetch.current = now;
      }
      const g = geckoRef.current;

      // Active always refreshed; inactive half-rate (keep prior Deribit market via books/tape)
      const btcMarket = btcM; // always fetch BTC in Promise above when... actually we always fetch BTC
      const ethMarket =
        active === 'ETH' || needInactive ? ethM : null;

      setTape((prev) => {
        // BTC: we always re-fetch BTC market each cycle
        const nextBtc = toTape('BTC', btcMarket, g);
        // ETH: if we skipped inactive fetch, preserve prior Deribit spot but overlay gecko meta
        let nextEth: DualTapeSnap;
        if (ethMarket != null || active === 'ETH' || needInactive || forceInactive) {
          nextEth = toTape('ETH', ethMarket, g);
        } else if (prev.eth?.spotSource === 'deribit' && prev.eth.spot != null) {
          const ga = geckoAsset('ETH', g);
          nextEth = {
            ...prev.eth,
            change24hPct: ga?.change_24h_pct ?? prev.eth.change24hPct,
            marketCapUsd: ga?.market_cap_usd ?? prev.eth.marketCapUsd,
          };
        } else {
          nextEth = toTape('ETH', null, g);
        }
        return { btc: nextBtc, eth: nextEth };
      });

      if (needInactive) lastInactiveFetch.current = now;

      if (dualCharts) {
        const thin = { r: 0.04, q: 0, maxExpiries: 8 };
        const build = (ccy: 'BTC' | 'ETH', m: DeribitMarketBundle | null): CryptoBookState => {
          if (!m) {
            return {
              ccy,
              market: null,
              snapshot: null,
              asOf: Date.now(),
              provenance: makeProvenance('crypto', 'deribit', null, { down: true }),
            };
          }
          const snap =
            ccy === active && storeSnap?.symbol === ccy
              ? storeSnap
              : buildDeribitSnapshot(m, thin);
          return {
            ccy,
            market: m,
            snapshot: snap ?? null,
            asOf: m.fetchedAt,
            provenance: makeProvenance('crypto', 'deribit', m.fetchedAt),
          };
        };
        setBooks((prev) => ({
          btc: build('BTC', btcMarket ?? prev.btc?.market ?? null),
          eth:
            ethMarket != null || active === 'ETH' || needInactive
              ? build('ETH', ethMarket ?? prev.eth?.market ?? null)
              : prev.eth,
        }));
      }
    };

    void load(true);
    const id = setInterval(() => void load(false), ACTIVE_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [active, dualCharts, storeSnap]);

  return { tape, books, active, gecko };
}
