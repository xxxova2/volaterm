/**
 * Macros & Rates desk — FRED macro prints on top, then STIR / curve / plumbing.
 * Sticky sub-nav + collapsible low-priority tools for density (Phase A UI/UX).
 */
import { useEffect, useState } from 'react';
import { MacroPanel } from '../macrovol/MacroPanel';
import { RatesPanel } from '../macrovol/RatesPanel';
import { ApiSources } from '../macrovol/ApiSources';
import { DataBadge } from '../macrovol/DataBadge';
import { DeskSubNav } from '../terminal/DeskSubNav';
import { CollapsibleSection } from '../terminal/CollapsibleSection';
import { SectionErrorBoundary } from '../common/SectionErrorBoundary';
import { RATES_SECTIONS } from '../../config/deskNav';
import { macrovolApi, type CorrelationData } from '../../lib/macrovol/api';

export function RatesView() {
  const [corr, setCorr] = useState<CorrelationData | null>(null);

  useEffect(() => {
    let cancelled = false;
    macrovolApi.correlations(30, '1y')
      .then((c) => { if (!cancelled) setCorr(c); })
      .catch(() => { /* optional */ });
    return () => { cancelled = true; };
  }, []);

  // Home / action chips can deep-link: sessionStorage desk.jump = section id
  useEffect(() => {
    try {
      const jump = sessionStorage.getItem('desk.jump');
      if (!jump) return;
      sessionStorage.removeItem('desk.jump');
      const t = window.setTimeout(() => {
        document.getElementById(jump)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
      return () => clearTimeout(t);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-card/40 px-2 py-1">
        <span className="font-mono text-type-sm font-bold tracking-wider text-primary">MACROS &amp; RATES</span>
        <span className="hidden font-mono text-type-xs text-muted-foreground md:inline">
          Macro · SOFR / STIR · curve · plumbing · basis · carry
        </span>
        <span className="ml-auto flex flex-wrap items-center gap-2">
          <span className="hidden font-mono text-type-2xs text-muted-foreground/70 lg:inline" title="Resolved upstreams for this desk">
            desk sources
          </span>
          <ApiSources apis={['FRED', 'NYFed', 'yfinance', 'MacroVol']} />
        </span>
      </div>

      <DeskSubNav items={RATES_SECTIONS} label="Jump" />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <section id="sec-macro" className="scroll-mt-10 border-b border-border/60" aria-label="Macro indicators">
          <SectionErrorBoundary name="Macro">
            <MacroPanel />
          </SectionErrorBoundary>
        </section>

        <section aria-label="Rates and STIR">
          <SectionErrorBoundary name="Rates">
            <RatesPanel />
          </SectionErrorBoundary>
        </section>

        {corr && (
          <div className="mx-auto max-w-5xl px-2 pb-4 font-mono">
            <CollapsibleSection
              id="sec-asset-corr"
              title="ASSET CORRELATIONS (30d)"
              apis={['yfinance']}
              defaultOpen={false}
              storageKey="rates.sec.asset-corr"
              subtitle="Rolling returns corr — macro risk context, not a trading signal."
            >
              <div className="overflow-x-auto">
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
            </CollapsibleSection>
          </div>
        )}
      </div>
    </div>
  );
}
