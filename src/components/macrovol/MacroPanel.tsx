import { useEffect, useState } from 'react';
import { macrovolApi, type MacroSummary } from '../../lib/macrovol/api';
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
      <div className="p-4 font-mono text-xs text-red-400">
        Failed to load macro data: {error}
        <div className="mt-1 text-muted-foreground">Ensure MacroVol API is running (port 8765) and FRED_API_KEY is set for live data.</div>
      </div>
    );
  }

  if (!cards) {
    return (
      <div className="grid grid-cols-2 gap-2 p-3 md:grid-cols-4">
        {INDICATORS.map((i) => (
          <div key={i.key} className="h-28 animate-pulse rounded-xl border border-border bg-card" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-2 font-mono">
      <div className="px-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-bold text-foreground">MACRO DASHBOARD</h2>
          <ApiSources apis={['FRED']} />
        </div>
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          CPI · Core CPI · Core PCE · NFP · labor · housing · Fed BS — top of desk
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
        {INDICATORS.map((ind) => {
          const e = cards[ind.key];
          if (!e || e.value == null) {
            return (
              <div key={ind.key} className="rounded-xl border border-border bg-card p-3">
                <div className="text-[10px] text-muted-foreground">{ind.label}</div>
                <div className="text-xl font-bold text-foreground">—</div>
              </div>
            );
          }
          const isWarning = (ind.good === 'down' && e.value > 3) || (ind.good === 'up' && e.value < 0);
          const arrowColor = e.trend === 'up' ? '#22c55e' : e.trend === 'down' ? '#ef4444' : '#71717a';
          const barColor = e.trend === 'up' ? '#22c55e' : e.trend === 'down' ? '#ef4444' : '#3b82f6';
          return (
            <div
              key={ind.key}
              className={`rounded-xl border p-3 ${isWarning ? 'border-red-500/50 bg-red-950/20' : 'border-border bg-card'}`}
            >
              <div className="mb-0.5 text-[10px] text-muted-foreground">{ind.label}</div>
              <div className={`flex items-center gap-1.5 text-xl font-bold ${isWarning ? 'text-red-400' : 'text-foreground'}`}>
                {e.value.toFixed(2)}
                <span className="text-sm" style={{ color: arrowColor }}>
                  {e.trend === 'up' ? '↑' : e.trend === 'down' ? '↓' : '→'}
                </span>
              </div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">
                {ind.sublabel}
                {e.changeLabel && <span className="ml-1.5">{e.changeLabel}</span>}
              </div>
              {e.history.length > 0 && (
                <div className="mt-2 flex h-7 items-end gap-px">
                  {e.history.map((v, i) => (
                    <div
                      key={i}
                      className="w-1 rounded-t"
                      style={{
                        height: `${Math.max((v / e.maxHist) * 100, 4)}%`,
                        backgroundColor: barColor,
                        opacity: 0.5 + 0.5 * (i / e.history.length),
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
        note="API: FRED via MacroVol · CPI/PCE/NFP lag release calendars — badge is request time"
        staleThresholdMin={120}
      />
      <p className="text-[9px] text-muted-foreground">
        Retail sales / Fed BS shown as FRED levels (not YoY). NFP is MoM change in thousands of jobs.
      </p>
    </div>
  );
}
