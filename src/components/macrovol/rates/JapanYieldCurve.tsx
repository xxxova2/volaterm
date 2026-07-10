/**
 * Japanese Government Bond yield curve — MoF Japan CMT (real data).
 * Dual path: white = latest, blue = ~1Y ago (same visual language as UST).
 */
import { useEffect, useState } from 'react';
import { macrovolApi, type JgbCurveData } from '../../../lib/macrovol/api';
import { YieldCurveCompare, type CurveComparePoint } from './YieldCurveCompare';
import { DataBadge } from '../DataBadge';
import { EmptyState } from '../../common/EmptyState';

export function JapanYieldCurve({ height = 260 }: { height?: number }) {
  const [data, setData] = useState<JgbCurveData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    macrovolApi
      .ratesJgbCurve(365)
      .then((res) => {
        if (cancelled) return;
        if (res.error && !(res.points?.length)) {
          setError(res.error);
          setData(null);
        } else {
          setData(res);
          setError(res.error ?? null);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'JGB curve failed');
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const points: CurveComparePoint[] = (data?.points ?? []).map((p) => ({
    label: p.label,
    today: p.today,
    historical: p.historical,
    delta_bps: p.delta_bps ?? null,
  }));

  if (loading) {
    return (
      <EmptyState
        kind="loading"
        title="Loading JGB curve…"
        body="Ministry of Finance Japan · constant-maturity yields"
        compact
      />
    );
  }

  if (error && points.filter((p) => p.today != null).length < 2) {
    return (
      <EmptyState
        kind="api-down"
        title="JGB curve unavailable"
        body={error}
        compact
      />
    );
  }

  return (
    <div className="min-w-0">
      <YieldCurveCompare
        points={points}
        todayAsOf={data?.today_as_of}
        compareAsOf={data?.compare_as_of}
        source={data?.source || 'MoF Japan'}
        height={height}
        title="JGB YIELD CURVE · TODAY VS LAST YEAR"
        currencyLabel="JPY"
        emptyMessage="Awaiting MoF Japan JGB curve…"
        legendLivePrefix="JGB CMT · Live"
        legendHistPrefix="JGB CMT · Yield"
        sourceHint="MoF · white = live · blue = ~1Y ago · JPY %"
      />
      <DataBadge
        asOf={data?.as_of || data?.today_as_of || undefined}
        source={data?.source || 'MoF Japan'}
        note={data?.note || 'Real MoF constant-maturity JGB yields — not demo/synthetic.'}
        className="mt-1"
      />
    </div>
  );
}
