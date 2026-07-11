import { useEffect, useState } from 'react';
import { macrovolApi, type MacroSummary } from '../../lib/macrovol/api';
import { CHART } from '../../lib/chartTheme';
import { DataBadge } from './DataBadge';
import { ApiSources } from './ApiSources';
import { cn } from '../../lib/utils';

/**
 * Dense US macro strip — inflation → labor → activity → Fed BS.
 * Compact quote-row layout (not sparse card squares).
 * Non-US macro lives further down the desk (Global 10Y / Japan / FX).
 */
const INDICATORS: {
  key: 'cpi_yoy' | 'core_cpi_yoy' | 'core_pce_yoy' | 'nfp_mom' | 'unemployment' | 'retail_sales' | 'housing_starts' | 'fed_balance_sheet';
  label: string;
  unit: string;
  series: string;
  good: 'down' | 'up' | 'neutral';
  group: 'inflation' | 'labor' | 'activity' | 'fed';
}[] = [
  { key: 'cpi_yoy', label: 'CPI', unit: 'YoY%', series: 'CPIAUCSL', good: 'down', group: 'inflation' },
  { key: 'core_cpi_yoy', label: 'Core CPI', unit: 'YoY%', series: 'CPILFESL', good: 'down', group: 'inflation' },
  { key: 'core_pce_yoy', label: 'Core PCE', unit: 'YoY%', series: 'PCEPILFE', good: 'down', group: 'inflation' },
  { key: 'nfp_mom', label: 'NFP', unit: 'k', series: 'PAYEMS', good: 'up', group: 'labor' },
  { key: 'unemployment', label: 'U-3', unit: '%', series: 'UNRATE', good: 'down', group: 'labor' },
  { key: 'retail_sales', label: 'Retail', unit: 'lvl', series: 'RSAFS', good: 'up', group: 'activity' },
  { key: 'housing_starts', label: 'Starts', unit: 'k', series: 'HOUST', good: 'up', group: 'activity' },
  { key: 'fed_balance_sheet', label: 'Fed BS', unit: '$T', series: 'WALCL', good: 'neutral', group: 'fed' },
];

const GROUPS: { id: typeof INDICATORS[number]['group']; title: string }[] = [
  { id: 'inflation', title: 'Inflation' },
  { id: 'labor', title: 'Labor' },
  { id: 'activity', title: 'Activity' },
  { id: 'fed', title: 'Liquidity' },
];

type CardState = {
  value: number | null;
  trend: 'up' | 'down' | 'flat';
  changeLabel: string;
};

function formatValue(
  key: (typeof INDICATORS)[number]['key'],
  value: number,
): string {
  if (key === 'fed_balance_sheet') return (value / 1_000_000).toFixed(2);
  if (key === 'nfp_mom' || key === 'retail_sales' || key === 'housing_starts') {
    return value.toFixed(0);
  }
  return value.toFixed(2);
}

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
                changeLabel = `${momPct >= 0 ? '+' : ''}${momPct.toFixed(2)}m`;
                trend = momPct > 0.05 ? 'up' : momPct < -0.05 ? 'down' : 'flat';
              } else if (ind.key === 'nfp_mom') {
                changeLabel = `${diff >= 0 ? '+' : ''}${diff.toFixed(0)}k`;
                trend = diff > 50 ? 'up' : diff < -50 ? 'down' : 'flat';
              } else if (ind.key === 'fed_balance_sheet') {
                const tDiff = diff / 1_000_000;
                changeLabel = `${tDiff >= 0 ? '+' : ''}${tDiff.toFixed(2)}T`;
                trend = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat';
              } else {
                changeLabel = `${diff >= 0 ? '+' : ''}${diff.toFixed(diff >= 10 ? 0 : 2)}`;
                trend = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat';
              }
            }

            return [ind.key, { value, trend, changeLabel }] as const;
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
      <div className="px-2 py-1 font-mono text-type-xs text-down">
        Macro load failed: {error}
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="ml-2 rounded border border-warn/50 px-1.5 py-0.5 text-type-2xs text-warn hover:bg-warn/10"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!cards) {
    return (
      <div
        className="flex flex-wrap items-center gap-1 border-b border-border/60 px-1.5 py-1"
        aria-busy="true"
        aria-label="Loading macro indicators"
      >
        {INDICATORS.map((i) => (
          <div key={i.key} className="h-6 w-16 skeleton rounded border border-border sm:w-20" />
        ))}
      </div>
    );
  }

  return (
    <div className="border-b border-border/60 font-mono">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 px-1.5 py-0.5">
        <h2 className="text-type-2xs font-bold tracking-wide text-foreground">US MACRO</h2>
        <ApiSources apis={['FRED']} />
        <DataBadge
          asOf={meta.as_of}
          source={meta.source || 'FRED'}
          note="FRED live · YoY from index levels where applicable"
          staleThresholdMin={120}
          className="!gap-1 text-type-2xs"
        />
      </div>

      {/* One dense strip: groups as columns of inline quote chips (no tall empty squares) */}
      <div className="flex flex-wrap items-stretch gap-x-0 gap-y-1 px-1 pb-1">
        {GROUPS.map((g, gi) => {
          const inds = INDICATORS.filter((i) => i.group === g.id);
          return (
            <div
              key={g.id}
              className={cn(
                'flex min-w-0 flex-1 items-center gap-1 px-1',
                gi > 0 && 'border-l border-border/70',
              )}
            >
              <span className="hidden shrink-0 text-type-2xs uppercase tracking-wider text-muted-foreground/70 xl:inline">
                {g.title}
              </span>
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-0.5">
                {inds.map((ind) => {
                  const e = cards[ind.key];
                  if (!e || e.value == null) {
                    return (
                      <div
                        key={ind.key}
                        className="inline-flex items-baseline gap-1 rounded border border-border/80 bg-card/50 px-1.5 py-0.5"
                        title={`${ind.label} · ${ind.unit}`}
                      >
                        <span className="text-type-2xs text-muted-foreground">{ind.label}</span>
                        <span className="text-type-xs font-semibold text-muted-foreground">—</span>
                      </div>
                    );
                  }
                  const isWarning =
                    (ind.good === 'down' && e.value > 3) || (ind.good === 'up' && e.value < 0);
                  const arrowColor =
                    e.trend === 'up'
                      ? CHART.series.up
                      : e.trend === 'down'
                        ? CHART.series.down
                        : CHART.series.muted;
                  const display = formatValue(ind.key, e.value);
                  const tip = `${ind.label} · ${ind.unit}${e.changeLabel ? ` · Δ ${e.changeLabel}` : ''}`;
                  return (
                    <div
                      key={ind.key}
                      title={tip}
                      className={cn(
                        'inline-flex max-w-full items-baseline gap-1 rounded border px-1.5 py-0.5',
                        isWarning ? 'border-down/50 bg-down/15' : 'border-border/80 bg-card/50',
                      )}
                    >
                      <span className="shrink-0 text-type-2xs text-muted-foreground">{ind.label}</span>
                      <span
                        className={cn(
                          'text-type-xs font-bold tabular-nums',
                          isWarning ? 'text-down' : 'text-foreground',
                        )}
                      >
                        {display}
                      </span>
                      <span className="text-type-2xs" style={{ color: arrowColor }}>
                        {e.trend === 'up' ? '↑' : e.trend === 'down' ? '↓' : '→'}
                      </span>
                      {e.changeLabel ? (
                        <span className="hidden truncate text-type-2xs text-muted-foreground sm:inline">
                          {e.changeLabel}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
