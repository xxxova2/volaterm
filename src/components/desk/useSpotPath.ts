import { useMemo } from 'react';
import { useTerminalStore } from '../../store/terminalStore';
import { historyToSpotBars } from '../../lib/options/greeksPnl';

/**
 * Spot path for desk tools: real FMP/yfinance history only.
 * No synthetic path under LIVE — tools show empty until history is available.
 */
export function useSpotPath(days = 40) {
  const fmpHistory = useTerminalStore((s) => s.fmpHistory);
  const historySource = useTerminalStore((s) => s.historySource);
  return useMemo(() => {
    const fromHist = historyToSpotBars(fmpHistory, days);
    if (fromHist.length >= 5 && historySource !== 'none') {
      return { path: fromHist, source: historySource };
    }
    return { path: [] as ReturnType<typeof historyToSpotBars>, source: 'none' as const };
  }, [fmpHistory, historySource, days]);
}
