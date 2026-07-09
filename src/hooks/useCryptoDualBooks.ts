/**
 * Hook-local dual BTC/ETH books — shared Deribit cache, half-rate inactive.
 * Active book remains store + LiveProvider via setSymbol.
 */
import { useEffect, useRef, useState } from 'react';
import { fetchDeribitMarket, type DeribitMarketBundle } from '../lib/data/deribitClient';
import { buildDeribitSnapshot } from '../lib/options/deribit';
import type { VolSnapshot } from '../lib/options/types';
import { makeProvenance, type DataProvenance } from '../lib/data/freshness';
import { useTerminalStore } from '../store/terminalStore';

export type DualTapeSnap = {
  ccy: 'BTC' | 'ETH';
  spot: number | null;
  fundingAnn: number | null;
  optionCount: number;
  asOf: number;
  ok: boolean;
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

  const lastInactiveFetch = useRef(0);

  useEffect(() => {
    let cancelled = false;

    const toTape = (ccy: 'BTC' | 'ETH', m: DeribitMarketBundle | null): DualTapeSnap =>
      m
        ? {
            ccy,
            spot: m.indexPrice,
            fundingAnn: m.fundingAnn,
            optionCount: m.options?.length ?? 0,
            asOf: m.fetchedAt,
            ok: true,
          }
        : { ccy, spot: null, fundingAnn: null, optionCount: 0, asOf: Date.now(), ok: false };

    const load = async (forceInactive: boolean) => {
      const now = Date.now();
      const needInactive = forceInactive || now - lastInactiveFetch.current >= INACTIVE_MS;

      const [btcM, ethM] = await Promise.all([
        fetchDeribitMarket('BTC').catch(() => null),
        needInactive || active === 'ETH'
          ? fetchDeribitMarket('ETH').catch(() => null)
          : Promise.resolve(null),
      ]);
      // Always refresh active; inactive half-rate
      const ethMarket =
        active === 'ETH' || needInactive
          ? ethM
          : null;
      const btcMarket =
        active === 'BTC' || needInactive
          ? btcM
          : null;

      if (cancelled) return;

      // Merge: keep previous inactive market if we skipped fetch
      setTape((prev) => ({
        btc: btcMarket != null || prev.btc == null ? toTape('BTC', btcMarket) : prev.btc,
        eth: ethMarket != null || prev.eth == null ? toTape('ETH', ethMarket) : prev.eth,
      }));

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
          // Active book can reuse store snapshot when symbol matches
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
          btc: btcMarket || !prev.btc ? build('BTC', btcMarket ?? prev.btc?.market ?? null) : prev.btc,
          eth: ethMarket || !prev.eth ? build('ETH', ethMarket ?? prev.eth?.market ?? null) : prev.eth,
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

  return { tape, books, active };
}
