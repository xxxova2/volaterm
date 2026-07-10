/**
 * Macros & Rates desk — Option A relevance-first hierarchy.
 *
 * Order justification (one sentence each):
 *  1. US Macro — reserve-currency regime prints set the global risk regime.
 *  2. US Money Markets + UST — SOFR/EFFR/IORB and the Treasury curve are the
 *     primary rates desk objects for USD funding and discounting.
 *  3. STIR / NY Fed — priced path and official ON prints for the same USD system.
 *  4. Global 10Y (US→DE→UK→FR→JP) — G10 sovereigns by market relevance to USD desk.
 *  5. FX — transmission of rate differentials into crosses (EUR, GBP, JPY…).
 *  6. Japan — BoJ / JGB carry is a special G10 case after the generic DM board.
 *  7. Asset corr — cross-asset risk context, not a primary trading object.
 */
import { useEffect, useState } from 'react';
import { MacroPanel } from '../macrovol/MacroPanel';
import { RatesPanel } from '../macrovol/RatesPanel';
import { ApiSources } from '../macrovol/ApiSources';
import { DataBadge } from '../macrovol/DataBadge';
import { DeskChrome } from '../terminal/DeskChrome';
import { DeskSubNav } from '../terminal/DeskSubNav';
import { CollapsibleSection } from '../terminal/CollapsibleSection';
import { SectionErrorBoundary } from '../common/SectionErrorBoundary';
import { RATES_SECTIONS } from '../../config/deskNav';
import { macrovolApi, type CorrelationData } from '../../lib/macrovol/api';
import { GlobalYieldsBoard } from '../macrovol/rates/GlobalYieldsBoard';
import { FxBoard } from '../macrovol/rates/FxBoard';
import { JapanCarryPanel } from '../macrovol/rates/JapanCarryPanel';

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
      <DeskChrome
        label="RATES"
        sticky={false}
        dense
        className="h-6 border-border bg-card/40 px-1.5 py-0"
        trailing={<ApiSources apis={['FRED', 'MoF', 'NYFed', 'yfinance', 'MacroVol']} />}
      >
        <DeskSubNav items={RATES_SECTIONS} label="" bare />
      </DeskChrome>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* 1. US macro prints — regime first */}
        <section id="sec-macro" className="scroll-mt-8 border-b border-border/60" aria-label="US macro indicators">
          <SectionErrorBoundary name="Macro">
            <MacroPanel />
          </SectionErrorBoundary>
        </section>

        {/* 2–3. US money markets, UST, STIR (data→chart inside RatesPanel) */}
        <section aria-label="US rates and STIR">
          <SectionErrorBoundary name="Rates">
            <RatesPanel includeGlobalBlocks={false} />
          </SectionErrorBoundary>
        </section>

        {/* 4. Global DM 10Y — after US rates, before specials */}
        <section className="border-t border-border/40 px-1 pt-1" aria-label="Global 10Y sovereign yields">
          <SectionErrorBoundary name="Global yields">
            <GlobalYieldsBoard />
          </SectionErrorBoundary>
        </section>

        {/* 5. FX transmission */}
        <section className="px-1" aria-label="FX board">
          <SectionErrorBoundary name="FX">
            <FxBoard />
          </SectionErrorBoundary>
        </section>

        {/* 6. Japan carry / JGB — G10 special after generic DM */}
        <section className="px-1 pb-1" aria-label="Japan rates and carry">
          <SectionErrorBoundary name="Japan">
            <JapanCarryPanel />
          </SectionErrorBoundary>
        </section>

        {/* 7. Cross-asset corr — risk context last */}
        {corr && (
          <div className="px-1 pb-2 font-mono">
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
