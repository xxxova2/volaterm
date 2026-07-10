/**
 * Multi-pair FX board — Frankfurter / ECB daily reference rates.
 * Carry score chips join FX + FRED rates already on the desk.
 */
import { useEffect, useMemo, useState } from 'react';
import { CollapsibleSection } from '../../terminal/CollapsibleSection';
import { DataBadge } from '../DataBadge';
import { EmptyState } from '../../common/EmptyState';
import {
  macrovolApi,
  type FxBoardData,
  type PlumbingData,
  type RatesSummary,
} from '../../../lib/macrovol/api';
import {
  buildCarryScores,
  ratesFromFxPairs,
  type CarryScore,
} from '../../../lib/rates/carryScores';
import { cn } from '../../../lib/utils';

function fmtRate(rate: number | null | undefined, decimals = 4): string {
  if (rate == null || !Number.isFinite(rate)) return '—';
  return rate.toFixed(decimals);
}

function toneCls(t: CarryScore['tone']): string {
  if (t === 'up') return 'border-up/40 text-up';
  if (t === 'down') return 'border-down/40 text-down';
  if (t === 'warn') return 'border-warn/40 text-warn';
  return 'border-border text-muted-foreground';
}

export function FxBoard() {
  const [data, setData] = useState<FxBoardData | null>(null);
  const [summary, setSummary] = useState<RatesSummary | null>(null);
  const [plumbing, setPlumbing] = useState<PlumbingData | null>(null);
  const [usJp10, setUsJp10] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      macrovolApi.ratesFx().catch((e: Error) => {
        throw e;
      }),
      macrovolApi.ratesSummary().catch(() => null),
      macrovolApi.ratesPlumbing().catch(() => null),
      macrovolApi.series('DGS10', 5).catch(() => null),
      macrovolApi.series('IRLTLT01JPM156N', 5).catch(() => null),
    ])
      .then(([fx, sum, plumb, us10, jp10]) => {
        if (cancelled) return;
        setData(fx);
        setError(fx.error || null);
        setSummary(sum);
        setPlumbing(plumb);
        const us = us10?.data?.[0]?.value;
        const jp = jp10?.data?.[0]?.value;
        setUsJp10(
          us != null && jp != null && Number.isFinite(us) && Number.isFinite(jp)
            ? us - jp
            : null,
        );
        setLoading(false);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setData(null);
        setError(e.message || 'FX board unavailable');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const pairs = data?.pairs ?? [];
  const live = pairs.filter((p) => p.rate != null);
  const fxRates = ratesFromFxPairs(pairs);

  const scores = useMemo(
    () =>
      buildCarryScores({
        ...fxRates,
        usJp10yPp: usJp10,
        spread2s10s: summary?.spread_2s10s,
        sofr: summary?.sofr ?? plumbing?.sofr,
        iorb: plumbing?.iorb,
      }),
    [fxRates.usdjpy, fxRates.eurusd, usJp10, summary?.spread_2s10s, summary?.sofr, plumbing?.sofr, plumbing?.iorb],
  );

  return (
    <CollapsibleSection
      id="sec-fx"
      belowFold={false}
      title="FX BOARD"
      apis={['Frankfurter', 'ECB', 'FRED']}
      defaultOpen
      storageKey="rates.sec.fx"
      subtitle="USD majors (ECB ref) + carry context chips from FX · US−JP · 2s10s · SOFR−IORB"
      badge={
        <span className="font-mono text-type-2xs text-muted-foreground">
          {live.length}/{pairs.length || 6} pairs
          {data?.ecb_date ? ` · ECB ${data.ecb_date}` : ''}
          {scores.length ? ` · ${scores.length} carry chips` : ''}
        </span>
      }
    >
      {loading && (
        <EmptyState kind="loading" title="Loading FX…" body="Frankfurter · ECB" compact />
      )}
      {!loading && error && live.length === 0 && (
        <EmptyState kind="api-down" title="FX unavailable" body={error} compact />
      )}
      {!loading && live.length > 0 && (
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 xl:grid-cols-6">
          {pairs.map((p) => (
            <div
              key={p.pair}
              className="rounded border border-border bg-background/40 px-2 py-1.5"
              title={p.note}
            >
              <div className="font-mono text-type-2xs font-semibold tracking-wide text-muted-foreground">
                {p.pair}
              </div>
              <div className="font-mono text-sm font-bold tabular-nums text-foreground">
                {fmtRate(p.rate, p.decimals ?? 4)}
              </div>
            </div>
          ))}
        </div>
      )}

      {scores.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {scores.map((s) => (
            <div
              key={s.id}
              title={s.note}
              className={cn(
                'rounded border bg-background/50 px-2 py-1 font-mono',
                toneCls(s.tone),
              )}
            >
              <div className="text-type-2xs opacity-80">{s.label}</div>
              <div className="text-type-xs font-bold tabular-nums text-foreground">{s.value}</div>
            </div>
          ))}
          <span className="self-center font-mono text-type-2xs text-muted-foreground">
            Hover chips · labels not advice
          </span>
        </div>
      )}

      <DataBadge
        asOf={data?.as_of}
        source={data?.source || 'Frankfurter'}
        note={data?.note}
        down={!!error && live.length === 0}
        className="mt-1.5"
        staleThresholdMin={24 * 60}
        delayedThresholdMin={12 * 60}
      />
    </CollapsibleSection>
  );
}
