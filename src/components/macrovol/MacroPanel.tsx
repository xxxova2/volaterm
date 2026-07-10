import { useEffect, useState } from 'react';
import { macrovolApi, type MacroSummary } from '../../lib/macrovol/api';
import { CHART } from '../../lib/chartTheme';
import { DataBadge } from './DataBadge';
import { ApiSources } from './ApiSources';

/**
 * US macro only — Option A relevance-first: US sets the regime.
 * Nested by theme *within* the US block (inflation → labor → activity → BS).
 * Non-US macro lives in Global 10Y / Japan / FX sections further down the desk.
 */
const GROUPS: {
  id: string;
  title: string;
  why: string;
  indicators: {
    key: 'cpi_yoy' | 'core_cpi_yoy' | 'core_pce_yoy' | 'nfp_mom' | 'unemployment' | 'retail_sales' | 'housing_starts' | 'fed_balance_sheet';
    label: string;
    sublabel: string;
    series: string;
    good: 'down' | 'up' | 'neutral';
  }[];
}[] = [
  {
    id: 'inflation',
    title: 'INFLATION',
    why: 'Price regime drives Fed path and real rates.',
    indicators: [
      { key: 'cpi_yoy', label: 'CPI', sublabel: 'YoY %', series: 'CPIAUCSL', good: 'down' },
      { key: 'core_cpi_yoy', label: 'Core CPI', sublabel: 'YoY %', series: 'CPILFESL', good: 'down' },
      { key: 'core_pce_yoy', label: 'Core PCE', sublabel: 'YoY %', series: 'PCEPILFE', good: 'down' },
    ],
  },
  {
    id: 'labor',
    title: 'LABOR',
    why: 'Employment dual-mandate input; NFP / UNRATE move front-end pricing.',
    indicators: [
      { key: 'nfp_mom', label: 'NFP', sublabel: 'MoM (000s)', series: 'PAYEMS', good: 'up' },
      { key: 'unemployment', label: 'Unemployment', sublabel: 'Rate %', series: 'UNRATE', good: 'down' },
    ],
  },
  {
    id: 'activity',
    title: 'ACTIVITY',
    why: 'Demand pulse after prices and labor.',
    indicators: [
      { key: 'retail_sales', label: 'Retail Sales', sublabel: 'Level', series: 'RSAFS', good: 'up' },
      { key: 'housing_starts', label: 'Housing Starts', sublabel: '000s units', series: 'HOUST', good: 'up' },
    ],
  },
  {
    id: 'balance-sheet',
    title: 'FED BS',
    why: 'Liquidity stock context for plumbing / RRP (not a growth print).',
    indicators: [
      { key: 'fed_balance_sheet', label: 'Fed Balance Sheet', sublabel: '$ Trillions (WALCL / 1e6)', series: 'WALCL', good: 'neutral' },
    ],
  },
];

const INDICATORS = GROUPS.flatMap((g) => g.indicators);

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

        // Fetch order matches display order (inflation → labor → activity → BS).
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
    <div className="flex flex-col gap-1.5 p-1 font-mono">
      <div className="flex flex-wrap items-center gap-1.5 px-0.5">
        <h2 className="text-type-xs font-bold text-foreground">US MACRO</h2>
        <ApiSources apis={['FRED']} />
        <span className="text-type-2xs text-muted-foreground">
          Relevance-first · inflation → labor → activity → Fed BS · live FRED only
        </span>
      </div>

      {GROUPS.map((group) => (
        <div key={group.id} className="space-y-1">
          <div className="flex flex-wrap items-baseline gap-2 px-0.5">
            <span className="text-type-2xs font-bold tracking-wide text-muted-foreground">{group.title}</span>
            <span className="text-type-2xs text-muted-foreground/80">{group.why}</span>
          </div>
          <div
            className={`grid gap-1 ${
              group.indicators.length >= 3
                ? 'grid-cols-3'
                : group.indicators.length === 2
                  ? 'grid-cols-2 sm:grid-cols-4'
                  : 'grid-cols-2 sm:grid-cols-4'
            }`}
          >
            {group.indicators.map((ind) => {
              const e = cards[ind.key];
              if (!e || e.value == null) {
                return (
                  <div key={ind.key} className="rounded border border-border bg-card p-2">
                    <div className="text-type-xs text-muted-foreground">{ind.label}</div>
                    <div className="text-base font-bold text-muted-foreground">—</div>
                    <div className="text-type-2xs text-muted-foreground">{ind.sublabel}</div>
                  </div>
                );
              }
              const isWarning = (ind.good === 'down' && e.value > 3) || (ind.good === 'up' && e.value < 0);
              const arrowColor = e.trend === 'up' ? CHART.series.up : e.trend === 'down' ? CHART.series.down : CHART.series.muted;
              const barColor = e.trend === 'up' ? CHART.series.up : e.trend === 'down' ? CHART.series.down : CHART.series.info;
              // WALCL from FRED is USD millions → show $ trillions (÷1e6).
              const display =
                ind.key === 'fed_balance_sheet'
                  ? (e.value / 1_000_000).toFixed(2)
                  : ind.key === 'nfp_mom' || ind.key === 'retail_sales' || ind.key === 'housing_starts'
                    ? e.value.toFixed(0)
                    : e.value.toFixed(2);
              return (
                <div
                  key={ind.key}
                  className={`rounded border p-2 ${isWarning ? 'border-down/50 bg-down/15' : 'border-border bg-card'}`}
                >
                  <div className="mb-0.5 text-type-xs text-muted-foreground">{ind.label}</div>
                  <div className={`flex items-center gap-1 text-base font-bold tabular-nums ${isWarning ? 'text-down' : 'text-foreground'}`}>
                    {display}
                    <span className="text-type-xs" style={{ color: arrowColor }}>
                      {e.trend === 'up' ? '↑' : e.trend === 'down' ? '↓' : '→'}
                    </span>
                  </div>
                  <div className="text-type-2xs text-muted-foreground">
                    {ind.sublabel}
                    {e.changeLabel ? ` · ${e.changeLabel}` : ''}
                  </div>
                  {e.history.length > 0 && (
                    <div className="mt-1 flex h-5 items-end gap-px">
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
        </div>
      ))}

      <DataBadge
        asOf={meta.as_of}
        source={meta.source || 'FRED'}
        note="FRED live via MacroVol · YoY computed from index levels where applicable"
        staleThresholdMin={120}
        className="mt-0.5"
      />
    </div>
  );
}
