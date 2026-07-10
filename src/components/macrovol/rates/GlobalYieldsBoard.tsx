/**
 * Multi-sovereign 10Y yields (US/DE/UK/FR/JP) from FRED.
 */
import { useEffect, useState } from 'react';
import { CollapsibleSection } from '../../terminal/CollapsibleSection';
import { DataBadge } from '../DataBadge';
import { macrovolApi, type GlobalYieldsData } from '../../../lib/macrovol/api';
import { cn } from '../../../lib/utils';

export function GlobalYieldsBoard() {
  const [data, setData] = useState<GlobalYieldsData | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    macrovolApi.ratesGlobalYields()
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setErr(d.error || null);
      })
      .catch((e) => {
        if (cancelled) return;
        setData(null);
        setErr(e instanceof Error ? e.message : String(e));
      });
    return () => { cancelled = true; };
  }, []);

  const points = data?.points ?? [];
  const spreads = data?.spreads_vs_us_bps ?? [];

  return (
    <CollapsibleSection
      id="sec-global"
      title="Global 10Y"
      subtitle="US · DE Bund · UK Gilt · FR · JP (FRED long-term yields)"
      apis={['FRED']}
      defaultOpen
      badge={data?.as_of ? <DataBadge source="FRED" asOf={data.as_of} /> : null}
    >
      {err && !points.some((p) => p.yield_pct != null) ? (
        <p className="px-2 py-1.5 text-type-2xs text-muted-foreground">
          Global yields unavailable — {err}. No synthetic levels.
        </p>
      ) : (
        <div className="space-y-2 p-2">
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-5">
            {points.map((p) => (
              <div
                key={p.code}
                className="rounded border border-border bg-background/40 px-2 py-1.5"
              >
                <div className="text-type-2xs text-muted-foreground">{p.code} · {p.label}</div>
                <div className={cn(
                  'font-mono text-type-md font-semibold tabular-nums',
                  p.yield_pct == null ? 'text-muted-foreground' : 'text-foreground',
                )}>
                  {p.yield_pct != null ? `${p.yield_pct.toFixed(2)}%` : '—'}
                </div>
                {p.obs_date && (
                  <div className="text-type-2xs text-muted-foreground">{p.obs_date}</div>
                )}
              </div>
            ))}
          </div>
          {spreads.length > 0 && (
            <div className="flex flex-wrap gap-2 text-type-2xs font-mono">
              <span className="text-muted-foreground">vs US 10Y</span>
              {spreads.map((s) => (
                <span
                  key={s.pair}
                  className={s.bps >= 0 ? 'text-down' : 'text-up'}
                  title="Foreign − US in bps"
                >
                  {s.pair} {s.bps >= 0 ? '+' : ''}{s.bps.toFixed(0)}bp
                </span>
              ))}
            </div>
          )}
          {data?.note && (
            <p className="text-type-2xs text-muted-foreground">{data.note}</p>
          )}
        </div>
      )}
    </CollapsibleSection>
  );
}
