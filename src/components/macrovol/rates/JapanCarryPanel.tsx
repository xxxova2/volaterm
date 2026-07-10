import { useEffect, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { macrovolApi } from '../../../lib/macrovol/api';
import { DataBadge } from '../DataBadge';
import { CollapsibleSection } from '../../terminal/CollapsibleSection';
import { CHART, chartAxisTick, chartGridProps, chartTooltipStyle } from '../../../lib/chartTheme';

/** USDJPY + US−JP yield differential — Japan carry context (FRED series). */
export function JapanCarryPanel() {
  const [state, setState] = useState<{
    usdjpy: number | null;
    jp10: number | null;
    us10: number | null;
    us2: number | null;
    asOf?: string;
    hist: { date: string; usdjpy: number | null; spread: number | null }[];
    error?: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [fx, jp, us10s, us2s] = await Promise.all([
          macrovolApi.series('DEXJPUS', 90).catch(() => null),
          macrovolApi.series('IRLTLT01JPM156N', 36).catch(() => null),
          macrovolApi.series('DGS10', 90).catch(() => null),
          macrovolApi.series('DGS2', 90).catch(() => null),
        ]);
        if (cancelled) return;
        const latest = (s: { data?: { value: number; date: string }[] } | null) => {
          const d = s?.data?.[0];
          return d ? { v: d.value, d: d.date } : { v: null as number | null, d: undefined as string | undefined };
        };
        const fxL = latest(fx as { data?: { value: number; date: string }[] } | null);
        const jpL = latest(jp as { data?: { value: number; date: string }[] } | null);
        const us10L = latest(us10s as { data?: { value: number; date: string }[] } | null);
        const us2L = latest(us2s as { data?: { value: number; date: string }[] } | null);

        // Build aligned US10−JP10 spread history (monthly JP series is sparse)
        const usMap = new Map(
          ((us10s as { data?: { date: string; value: number }[] } | null)?.data || []).map((d) => [d.date, d.value]),
        );
        const hist = ((jp as { data?: { date: string; value: number }[] } | null)?.data || [])
          .slice(0, 24)
          .map((d) => {
            const us = usMap.get(d.date);
            // nearest US10 within same month if exact date missing
            let usY = us;
            if (usY == null) {
              const ym = d.date.slice(0, 7);
              for (const [dt, val] of usMap) {
                if (dt.startsWith(ym)) { usY = val; break; }
              }
            }
            return {
              date: d.date.slice(0, 7),
              usdjpy: null as number | null,
              spread: usY != null ? usY - d.value : null,
            };
          })
          .reverse()
          .filter((h) => h.spread != null);

        setState({
          usdjpy: fxL.v,
          jp10: jpL.v,
          us10: us10L.v,
          us2: us2L.v,
          asOf: fxL.d || us10L.d,
          hist,
        });
      } catch (e) {
        if (!cancelled) {
          setState({
            usdjpy: null, jp10: null, us10: null, us2: null, hist: [],
            error: e instanceof Error ? e.message : 'Japan series failed',
          });
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const spread10 = state?.us10 != null && state?.jp10 != null ? state.us10 - state.jp10 : null;
  const premiumNote =
    spread10 != null && state?.usdjpy != null
      ? spread10 > 3
        ? 'Wide US−JP differential — classic long USDJPY carry premium (earn yield, short JPY). Vulnerable to vol spikes / BoJ policy shifts.'
        : spread10 > 1.5
          ? 'Moderate carry premium. Size risk to USDJPY gamma and funding, not just yield gap.'
          : 'Compressed differential — carry less attractive; FX can still reprice on risk-off (JPY strength).'
      : 'Load FRED for live differential.';

  return (
    <CollapsibleSection
      id="sec-carry"
        belowFold
      title="JAPAN CARRY · USDJPY"
      apis={['FRED']}
      defaultOpen={false}
      storageKey="rates.sec.carry"
      subtitle="US−JP 10Y yield gap + USDJPY spot — structural carry context, not a rec. Funding / FX vol / BoJ dominate P&L."
    >
      {state?.error && (
        <div className="text-type-xs text-down">{state.error}</div>
      )}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <div className="rounded border border-border px-2 py-1.5">
          <div className="text-type-2xs text-muted-foreground">USDJPY</div>
          <div className="text-sm font-bold tabular-nums">{state?.usdjpy != null ? state.usdjpy.toFixed(2) : '—'}</div>
        </div>
        <div className="rounded border border-border px-2 py-1.5">
          <div className="text-type-2xs text-muted-foreground">US 10Y</div>
          <div className="text-sm font-bold tabular-nums">{state?.us10 != null ? `${state.us10.toFixed(2)}%` : '—'}</div>
        </div>
        <div className="rounded border border-border px-2 py-1.5">
          <div className="text-type-2xs text-muted-foreground">JP 10Y</div>
          <div className="text-sm font-bold tabular-nums">{state?.jp10 != null ? `${state.jp10.toFixed(2)}%` : '—'}</div>
        </div>
        <div className="rounded border border-border px-2 py-1.5">
          <div className="text-type-2xs text-muted-foreground">US−JP 10Y</div>
          <div className={`text-sm font-bold tabular-nums ${spread10 != null && spread10 > 2 ? 'text-warn' : 'text-foreground'}`}>
            {spread10 != null ? `${spread10 >= 0 ? '+' : ''}${spread10.toFixed(2)} pp` : '—'}
          </div>
        </div>
      </div>
      <p className="mt-2 text-type-xs leading-snug text-muted-foreground">{premiumNote}</p>
      {state?.hist && state.hist.length > 2 && (
        <div className="mt-3">
          <div className="mb-1 text-type-xs text-muted-foreground">US−JP 10Y spread history (pp)</div>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={state.hist}>
              <CartesianGrid {...chartGridProps} />
              <XAxis dataKey="date" tick={{ ...chartAxisTick, fontSize: 8 }} interval="preserveStartEnd" />
              <YAxis tick={{ ...chartAxisTick, fontSize: 8 }} width={32} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Area type="monotone" dataKey="spread" stroke={CHART.series.warn} fill={CHART.series.warn} fillOpacity={0.15} strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      <DataBadge
        asOf={state?.asOf}
        source="FRED · DEXJPUS · IRLTLT01JPM156N · DGS10"
        note="Carry premium ≈ yield differential; P&L often dominated by USDJPY path / vol, not the coupon."
        className="mt-2"
      />
    </CollapsibleSection>
  );
}
