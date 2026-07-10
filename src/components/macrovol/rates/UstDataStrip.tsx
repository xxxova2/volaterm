/**
 * UST primary data strip — live CMT prints + key curve spreads.
 * Charts for the same series live in CurvesBoard directly below.
 */
import type { RatesSummary, CurveShapeData } from '../../../lib/macrovol/api';
import { DataBadge } from '../DataBadge';
import { CollapsibleSection } from '../../terminal/CollapsibleSection';
import { cn } from '../../../lib/utils';

export function UstDataStrip({
  summary,
  curve,
  curveMeta,
  shape,
}: {
  summary: RatesSummary | null;
  curve: { label: string; yield: number | null }[];
  curveMeta: { as_of?: string; source?: string; note?: string };
  shape: CurveShapeData | null;
}) {
  const spreads = shape?.spreads;
  const keySpreads: { label: string; bps: number | null; formula?: string }[] = [
    {
      label: '2s10s',
      bps: spreads?.['2s10s']?.bps
        ?? (summary?.spread_2s10s != null ? summary.spread_2s10s * 100 : null),
      formula: spreads?.['2s10s']?.formula || '10Y − 2Y',
    },
    {
      label: '3m10y',
      bps: spreads?.['3m10y']?.bps
        ?? (summary?.spread_3m10y != null ? summary.spread_3m10y * 100 : null),
      formula: spreads?.['3m10y']?.formula || '10Y − 3M',
    },
    {
      label: '5s30s',
      bps: spreads?.['5s30s']?.bps ?? null,
      formula: spreads?.['5s30s']?.formula,
    },
    {
      label: '2s5s10s fly',
      bps: spreads?.fly_2s5s10s?.bps ?? null,
      formula: spreads?.fly_2s5s10s?.formula,
    },
  ];

  const tenorStrip = curve.length > 0
    ? curve
    : [
        { label: '2Y', yield: summary?.usy2 ?? null },
        { label: '10Y', yield: summary?.usy10 ?? null },
      ];

  return (
    <CollapsibleSection
      id="sec-ust-data"
      title="UST YIELDS"
      apis={['FRED']}
      defaultOpen
      storageKey="rates.sec.ust-data"
      subtitle="Constant-maturity Treasury prints · chart of the same curve is immediately below"
    >
      <div className="flex flex-wrap gap-1">
        {tenorStrip.map((t) => (
          <div
            key={t.label}
            className="min-w-[4.5rem] flex-1 rounded border border-border bg-background/50 px-2 py-1.5"
          >
            <div className="text-type-xs font-semibold text-muted-foreground">{t.label}</div>
            <div
              className={cn(
                'font-mono text-lg font-bold tabular-nums leading-none',
                t.yield == null ? 'text-muted-foreground' : 'text-foreground',
              )}
            >
              {t.yield != null ? t.yield.toFixed(2) : '—'}
              {t.yield != null && (
                <span className="ml-0.5 text-type-2xs font-normal text-muted-foreground">%</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-1.5 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {keySpreads.map((s) => {
          const neg = s.bps != null && s.bps < 0;
          return (
            <div
              key={s.label}
              className={cn(
                'rounded border px-2 py-1.5',
                neg ? 'border-down/40 bg-down/10' : 'border-border bg-card/50',
              )}
              title={s.formula}
            >
              <div className={cn('text-type-xs', neg ? 'text-down' : 'text-muted-foreground')}>
                {s.label}
              </div>
              <div
                className={cn(
                  'font-mono text-lg font-bold tabular-nums leading-none',
                  neg ? 'text-down' : 'text-foreground',
                  s.bps == null && 'text-muted-foreground',
                )}
              >
                {s.bps != null
                  ? `${s.bps >= 0 ? '+' : ''}${s.bps.toFixed(0)}`
                  : '—'}
                <span className="ml-0.5 text-type-2xs font-normal text-muted-foreground">bp</span>
              </div>
            </div>
          );
        })}
      </div>

      <DataBadge
        asOf={shape?.as_of || curveMeta.as_of || summary?.as_of}
        source={shape?.source || curveMeta.source || summary?.source || 'FRED'}
        note={
          summary?.spread_note
          || 'Yields in % · curve spreads in bp. FRED CMT; no synthetic tenors.'
        }
        staleThresholdMin={60}
        className="mt-1"
      />
    </CollapsibleSection>
  );
}
