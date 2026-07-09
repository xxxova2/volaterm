/**
 * Macro desk — CPI / NFP / FRED indicators + correlations strip.
 * Top-level tab split from Macrovol.
 */
import { useEffect, useState } from 'react';
import { MacroPanel } from '../macrovol/MacroPanel';
import { macrovolApi, type CorrelationData } from '../../lib/macrovol/api';
import { DataBadge } from '../macrovol/DataBadge';

export function MacroView() {
  const [corr, setCorr] = useState<CorrelationData | null>(null);

  useEffect(() => {
    let cancelled = false;
    macrovolApi.correlations(30, '1y')
      .then((c) => { if (!cancelled) setCorr(c); })
      .catch(() => { /* optional */ });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card/40 px-3 py-2">
        <span className="font-mono text-xs font-bold tracking-wider text-primary">MACRO DESK</span>
        <span className="font-mono text-type-xs text-muted-foreground">
          Inflation · labor · activity · Fed balance sheet · asset correlations
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <MacroPanel />
        {corr && (
          <div className="mx-auto max-w-5xl px-3 pb-6 font-mono">
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-xs font-semibold text-foreground">ASSET CORRELATIONS (30d)</h3>
              <p className="mt-0.5 text-type-xs text-muted-foreground">
                Rolling returns corr — for macro risk context, not a trading signal.
              </p>
              <div className="mt-3 overflow-x-auto">
                {corr.instruments?.length && corr.matrix?.length ? (
                  <table className="w-full border-collapse text-type-xs">
                    <thead>
                      <tr>
                        <th className="p-1 text-left font-normal text-muted-foreground" />
                        {corr.instruments.map((l) => (
                          <th key={l} className="p-1 text-right font-normal text-muted-foreground">{l}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {corr.instruments.map((row, i) => (
                        <tr key={row} className="border-t border-border/50">
                          <td className="p-1 font-medium text-foreground">{row}</td>
                          {(corr.matrix[i] || []).map((v, j) => (
                            <td
                              key={`${i}-${j}`}
                              className={`p-1 text-right tabular-nums ${
                                i === j ? 'text-muted-foreground'
                                  : v != null && v > 0.5 ? 'text-up'
                                    : v != null && v < -0.3 ? 'text-down'
                                      : 'text-foreground'
                              }`}
                            >
                              {v != null ? v.toFixed(2) : '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-type-xs text-muted-foreground">
                    Correlation matrix unavailable{corr.error ? `: ${corr.error}` : ''}.
                  </div>
                )}
              </div>
              <DataBadge asOf={corr.as_of} source={corr.source || 'yfinance'} className="mt-2" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
