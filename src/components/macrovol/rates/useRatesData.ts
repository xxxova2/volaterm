import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  macrovolApi,
  type RatesSummary,
  type PlumbingData,
  type RatesCurve,
  type CorrelationData,
  type BasisData,
  type BasisHistoryData,
  type StirStripData,
  type CurveShapeData,
  type Dv01BookData,
} from '../../../lib/macrovol/api';
import { perfMark, perfMeasure } from '../../../config/perfBudget';

export function useRatesData() {
  const [summary, setSummary] = useState<RatesSummary | null>(null);
  const [plumbing, setPlumbing] = useState<PlumbingData | null>(null);
  const [basis, setBasis] = useState<BasisData | null>(null);
  const [basisHist, setBasisHist] = useState<BasisHistoryData | null>(null);
  const [stir, setStir] = useState<StirStripData | null>(null);
  const [shape, setShape] = useState<CurveShapeData | null>(null);
  const [dv01, setDv01] = useState<Dv01BookData | null>(null);
  const [curve, setCurve] = useState<{ label: string; yield: number | null }[]>([]);
  const [curveMeta, setCurveMeta] = useState<{ as_of?: string; source?: string; note?: string }>({});
  const [corr, setCorr] = useState<CorrelationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [n2, setN2] = useState(1);
  const [n5, setN5] = useState(1);
  const [n10, setN10] = useState(1);
  const [n30, setN30] = useState(1);
  const [sh2, setSh2] = useState(0);
  const [sh5, setSh5] = useState(0);
  const [sh10, setSh10] = useState(0);
  const [sh30, setSh30] = useState(0);
  const [dv01Loading, setDv01Loading] = useState(false);

  const reloadDv01 = useCallback(async () => {
    setDv01Loading(true);
    try {
      const book = await macrovolApi.ratesDv01({
        n2, n5, n10, n30,
        shock_2: sh2, shock_5: sh5, shock_10: sh10, shock_30: sh30,
      });
      setDv01(book);
    } catch {
      /* keep previous */
    } finally {
      setDv01Loading(false);
    }
  }, [n2, n5, n10, n30, sh2, sh5, sh10, sh30]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    perfMark('rates.load.start');
    Promise.allSettled([
      macrovolApi.ratesSummary(),
      macrovolApi.ratesPlumbing(),
      macrovolApi.ratesCurve(),
      macrovolApi.correlations(30, '1y'),
      macrovolApi.ratesBasis(),
      macrovolApi.stirStrip().catch(() => null),
      macrovolApi.ratesShape(60).catch(() => null),
      macrovolApi.ratesDv01({ n2: 1, n5: 1, n10: 1, n30: 1 }).catch(() => null),
      macrovolApi.ratesBasisHistory(90).catch(() => null),
    ]).then(([s, p, c, cor, b, st, sh, d, bh]) => {
      if (cancelled) return;
      perfMark('rates.load.end');
      perfMeasure('rates.load', 'rates.load.start', 'rates.load.end');
      if (s.status === 'fulfilled') setSummary(s.value);
      if (p.status === 'fulfilled') setPlumbing(p.value);
      if (c.status === 'fulfilled') {
        const res = c.value as RatesCurve;
        setCurve(res.labels.map((label, i) => ({
          label,
          yield: res.yields[i] != null ? Number(Number(res.yields[i]).toFixed(3)) : null,
        })));
        setCurveMeta({ as_of: res.as_of, source: res.source, note: res.note });
      }
      if (cor.status === 'fulfilled') setCorr(cor.value);
      if (b.status === 'fulfilled') setBasis(b.value);
      if (st.status === 'fulfilled' && st.value) setStir(st.value as StirStripData);
      if (sh.status === 'fulfilled' && sh.value) setShape(sh.value as CurveShapeData);
      if (d.status === 'fulfilled' && d.value) setDv01(d.value as Dv01BookData);
      if (bh.status === 'fulfilled' && bh.value) setBasisHist(bh.value as BasisHistoryData);
      const failed = [s, p, c].every((x) => x.status === 'rejected');
      if (failed) {
        setError([s, p, c].find((x) => x.status === 'rejected')?.reason?.message || 'MacroVol rates unavailable');
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const stirChart = useMemo(() => {
    if (stir?.chart?.length) {
      return stir.chart.map((p) => ({
        x: p.x,
        rate: p.implied_rate,
        prior: p.prior_rate ?? null,
        vsSofr: p.vs_sofr_bps ?? null,
        source: p.source,
        contract: p.contract,
      }));
    }
    // Fallback: build live + prior settle from board rows
    return (stir?.sr3 || [])
      .filter((c) => c.implied_rate != null || c.settlement != null || c.prev_close != null)
      .map((c) => {
        const settlePx = c.settlement ?? c.prev_close ?? null;
        const prior =
          settlePx != null && settlePx > 50 ? 100 - settlePx : null;
        return {
          x: c.month || c.contract,
          rate: c.implied_rate,
          prior,
          vsSofr: stir?.sofr != null && c.implied_rate != null
            ? (c.implied_rate - stir.sofr) * 100
            : null,
          source: c.source,
          contract: c.contract,
        };
      });
  }, [stir]);

  const shapeHistoryCharts = useMemo(() => {
    const empty: { date: string; bps: number }[] = [];
    const map = (key: string) =>
      ((shape?.history as Record<string, { date: string; spread_bps: number }[]> | undefined)?.[key] || [])
        .map((p) => ({ date: p.date.slice(5), bps: p.spread_bps }));
    if (!shape?.history) {
      return {
        s2s10: empty, s5s30: empty, s2s5: empty, s5s10: empty,
        s10s30: empty, s3m10y: empty, fly: empty,
      };
    }
    return {
      s2s10: map('2s10s'),
      s5s30: map('5s30s'),
      s2s5: map('2s5s'),
      s5s10: map('5s10s'),
      s10s30: map('10s30s'),
      s3m10y: map('3m10y'),
      fly: map('fly_2s5s10s'),
    };
  }, [shape]);

  const basisChart = useMemo(() => {
    if (!basisHist?.history?.length) return [];
    return basisHist.history.slice(-90).map((h) => ({
      date: h.date.slice(5),
      sofr_effr: h.sofr_effr_bps,
      sofr_iorb: h.sofr_iorb_bps,
      effr_iorb: h.effr_iorb_bps,
    }));
  }, [basisHist]);

  return {
    summary, plumbing, basis, basisHist, stir, shape, dv01, setDv01, curve, curveMeta, corr,
    error, loading,
    n2, setN2, n5, setN5, n10, setN10, n30, setN30,
    sh2, setSh2, sh5, setSh5, sh10, setSh10, sh30, setSh30,
    dv01Loading, setDv01Loading, reloadDv01,
    stirChart, shapeHistoryCharts, basisChart,
  };
}
