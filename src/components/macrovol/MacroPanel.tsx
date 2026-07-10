import { useEffect, useState } from 'react';
import { macrovolApi, type MacroSummary } from '../../lib/macrovol/api';
import { CHART } from '../../lib/chartTheme';
import { DataBadge } from './DataBadge';
import { ApiSources } from './ApiSources';

const INDICATORS = [
  { key: 'cpi_yoy' as const, label: 'CPI', sublabel: 'YoY %', series: 'CPIAUCSL', good: 'down' as const },
  { key: 'core_cpi_yoy' as const, label: 'Core CPI', sublabel: 'YoY %', series: 'CPILFESL', good: 'down' as const },
  { key: 'core_pce_yoy' as const, label: 'Core PCE', sublabel: 'YoY %', series: 'PCEPILFE', good: 'down' as const },
  { key: 'nfp_mom' as const, label: 'NFP', sublabel: 'MoM (000s)', series: 'PAYEMS', good: 'up' as const },
  { key: 'unemployment' as const, label: 'Unemployment', sublabel: 'Rate %', series: 'UNRATE', good: 'down' as const },
  { key: 'retail_sales' as const, label: 'Retail Sales', sublabel: 'Level', series: 'RSAFS', good: 'up' as const },
  { key: 'housing_starts' as const, label: 'Housing Starts', sublabel: '000s units', series: 'HOUST', good: 'up' as const },
  { key: 'fed_balance_sheet' as const, label: 'Fed Balance Sheet', sublabel: '$ Billions', series: 'WALCL', good: 'neutral' as const },
];

type CardState = {
  value: number | null;
  trend: 'up' | 'down' | 'flat';
  changeLabel: string;
  history: number[];
  maxHist: number;
};

export function MacroPanel() {
  const [cards, setCards] = useState<Record<string, CardState> | null>(null);
  const [meta, setMeta] = useState<{ as_of?: string; source?: string }>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const summary = await macrovolApi.macroSummary();
        if (cancelled) return;
        setMeta({ as_of: summary.as_of, source: summary.source });

        const entries = await Promise.all(
          INDICATORS.map(async (ind) => {
            const limit = ind.key === 'fed_balance_sheet' ? 30 : 24;
            let vals: number[] = [];
            try {
              const raw = await macrovolApi.series(ind.series, limit);
              vals = (raw.data || []).map((d) => d.value);
            } catch {
              vals = [];
            }

            let value: number | null = (summary as MacroSummary)[ind.key] ?? null;

            // Prefer frontend YoY from series (more robust than backend index)
            if ((ind.key === 'cpi_yoy' || ind.key === 'core_cpi_yoy' || ind.key === 'core_pce_yoy') && vals.length >= 13) {
              const asc = [...vals].reverse();
              if (asc.length >= 13) {
                const latest = asc[asc.length - 1]!;
                const yearAgo = asc[asc.length - 13]!;
                if (yearAgo !== 0) {
                  value = parseFloat(((latest / yearAgo - 1) * 100).toFixed(2));
                }
              }
            }

            let trend: 'up' | 'down' | 'flat' = 'flat';
            let changeLabel = '';
            if (vals.length >= 2) {
              const curr = vals[0]!;
              const prev = vals[1]!;
              const diff = curr - prev;
              if (ind.key === 'cpi_yoy' || ind.key === 'core_cpi_yoy' || ind.key === 'core_pce_yoy') {
                const momPct = (curr / prev - 1) * 100;
                changeLabel = momPct >= 0 ? `Idx MoM: +${momPct.toFixed(2)}%` : `Idx MoM: ${momPct.toFixed(2)}%`;
                trend = momPct > 0.05 ? 'up' : momPct < -0.05 ? 'down' : 'flat';
              } else if (ind.key === 'nfp_mom') {
                changeLabel = diff >= 0 ? `+${diff.toFixed(0)}k` : `${diff.toFixed(0)}k`;
                trend = diff > 50 ? 'up' : diff < -50 ? 'down' : 'flat';
              } else {
                changeLabel = diff >= 0 ? `+${diff.toFixed(2)}` : `${diff.toFixed(2)}`;
                trend = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat';
              }
            }

            const hist = [...vals].reverse();
            const maxHist = Math.max(...hist, 0.001);
            return [ind.key, { value, trend, changeLabel, history: hist, maxHist }] as const;
          }),
        );
        if (!cancelled) setCards(Object.fromEntries(entries));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (error) {
    return (
      <div className="p-4 font-mono text-type-sm text-down">
        Failed to load macro data: {error}
        <div className="mt-1 text-muted-foreground">
          Ensure MacroVol API is running (port 8765) and FRED_API_KEY is set for live data.
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-2 rounded border border-warn/50 px-2 py-1 text-type-xs text-warn hover:bg-warn/10"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!cards) {
    return (
      <div className="grid grid-cols-4 gap-1 p-1 md:grid-cols-8" aria-busy="true" aria-label="Loading macro indicators">
        {INDICATORS.map((i) => (
          <div key={i.key} className="h-16 skeleton rounded border border-border" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 p-1 font-mono">
      <div className="flex flex-wrap items-center gap-1.5 px-0.5">
        <h2 className="text-type-xs font-bold text-foreground">MACRO</h2>
        <ApiSources apis={['FRED']} />
        <span className="text-type-2xs text-muted-foreground">CPI · PCE · NFP · labor · housing · Fed BS</span>
      </div>
      <div className="grid grid-cols-4 gap-1 md:grid-cols-8">
        {INDICATORS.map((ind) => {
          const e = cards[ind.key];
          if (!e || e.value == null) {
            return (
              <div key={ind.key} className="rounded border border-border bg-card p-1.5">
                <div className="text-type-2xs text-muted-foreground">{ind.label}</div>
                <div className="text-sm font-bold text-foreground">—</div>
              </div>
            );
          }
          const isWarning = (ind.good === 'down' && e.value > 3) || (ind.good === 'up' && e.value < 0);
          const arrowColor = e.trend === 'up' ? CHART.series.up : e.trend === 'down' ? CHART.series.down : CHART.series.muted;
          const barColor = e.trend === 'up' ? CHART.series.up : e.trend === 'down' ? CHART.series.down : CHART.series.info;
          return (
            <div
              key={ind.key}
              className={`rounded border p-1.5 ${isWarning ? 'border-down/50 bg-down/15' : 'border-border bg-card'}`}
            >
              <div className="mb-0.5 text-type-2xs text-muted-foreground">{ind.label}</div>
              <div className={`flex items-center gap-1 text-sm font-bold ${isWarning ? 'text-down' : 'text-foreground'}`}>
                {e.value.toFixed(2)}
                <span className="text-type-xs" style={{ color: arrowColor }}>
                  {e.trend === 'up' ? '↑' : e.trend === 'down' ? '↓' : '→'}
                </span>
              </div>
              {e.history.length > 0 && (
                <div className="mt-1 flex h-4 items-end gap-px">
                  {e.history.slice(-16).map((v, i) => (
                    <div
                      key={i}
                      className="w-1 rounded-t"
                      style={{
                        height: `${Math.max((v / e.maxHist) * 100, 4)}%`,
                        backgroundColor: barColor,
                        opacity: 0.5 + 0.5 * (i / 16),
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <DataBadge
        asOf={meta.as_of}
        source={meta.source || 'FRED'}
        note="FRED live via MacroVol"
        staleThresholdMin={120}
        className="mt-0.5"
      />
    </div>
  );
}
