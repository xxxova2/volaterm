/**
 * Thin adapter: store → SecurityDesCard props.
 * No API calls here — chain/FMP already load via terminalStore.
 */
import { useMemo } from 'react';
import { useTerminalStore } from '../../store/terminalStore';
import { dealerExposure, ivRank } from '../../lib/options/analytics';
import { classifyGammaRegime } from '../../lib/options/gexSession';
import { SecurityDesCard } from './SecurityDesCard';

const CHAIN_LABEL: Record<string, string> = {
  yfinance: 'yfinance',
  fmp: 'fmp',
  deribit: 'deribit',
  none: 'none',
};

export function SecurityDesFromStore({ className }: { className?: string }) {
  const symbol = useTerminalStore((s) => s.symbol);
  const snapshot = useTerminalStore((s) => s.snapshot);
  const historicalFrames = useTerminalStore((s) => s.historicalFrames);
  const frameIndex = useTerminalStore((s) => s.frameIndex);
  const chainUsed = useTerminalStore((s) => s.chainUsed);
  const fmpQuote = useTerminalStore((s) => s.fmpQuote);
  const fmpHistory = useTerminalStore((s) => s.fmpHistory);
  const setActiveTab = useTerminalStore((s) => s.setActiveTab);
  const setDeskSection = useTerminalStore((s) => s.setDeskSection);

  const front = snapshot?.expiries?.[0];
  const atmIv = front?.atmIV != null && front.atmIV > 0 ? front.atmIV : null;
  const nearestDte = front?.dte ?? null;

  const spot =
    snapshot?.spot != null && snapshot.spot > 0
      ? snapshot.spot
      : fmpQuote?.price != null && fmpQuote.price > 0
        ? fmpQuote.price
        : null;

  const dayChgPct =
    fmpQuote?.changePercentage != null && Number.isFinite(fmpQuote.changePercentage)
      ? fmpQuote.changePercentage / 100
      : null;

  const ivRankPct = useMemo(() => {
    if (historicalFrames.length < 2) return null;
    return ivRank(historicalFrames, frameIndex).percentile;
  }, [historicalFrames, frameIndex]);

  const gex = useMemo(() => {
    if (!snapshot) return null;
    const d = dealerExposure(snapshot);
    const regime = classifyGammaRegime(d.totalGEX, snapshot.spot, d.gammaFlip);
    return {
      short: regime.short,
      label: regime.label,
      tone: regime.tone as 'up' | 'down' | 'warn' | 'neutral',
    };
  }, [snapshot]);

  const histIvSeries = useMemo(
    () =>
      historicalFrames.map((f) => ({
        atmIv: f.snapshot.expiries[0]?.atmIV ?? NaN,
        timestamp: f.timestamp,
      })),
    [historicalFrames],
  );

  const quotePath = useMemo(() => {
    if (!fmpHistory || fmpHistory.length < 2) return undefined;
    return fmpHistory.slice(-60).map((b) => ({ t: b.date, close: b.close }));
  }, [fmpHistory]);

  return (
    <SecurityDesCard
      symbol={symbol}
      spot={spot}
      dayChgPct={dayChgPct}
      atmIv={atmIv}
      ivRankPct={ivRankPct}
      gexShort={gex?.short}
      gexRegimeLabel={gex?.label}
      gexRegimeTone={gex?.tone ?? 'neutral'}
      nearestDte={nearestDte}
      chainLabel={CHAIN_LABEL[chainUsed] ?? chainUsed}
      quotePath={quotePath}
      histIvSeries={histIvSeries}
      histIvCurrent={atmIv}
      onOpenTerm={() => {
        setActiveTab('vol');
        queueMicrotask(() => setDeskSection('vol-sub-term'));
      }}
      className={className}
    />
  );
}
