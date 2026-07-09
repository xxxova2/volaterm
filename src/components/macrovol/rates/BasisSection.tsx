import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { BasisData, BasisHistoryData, PlumbingData } from '../../../lib/macrovol/api';
import { DataBadge } from '../DataBadge';
import { CollapsibleSection } from '../../terminal/CollapsibleSection';
import { chartTooltipStyle } from '../../../lib/chartTheme';

export function BasisSection({
  basis,
  basisHist,
  plumbing,
  basisChart,
}: {
  basis: BasisData;
  basisHist: BasisHistoryData | null;
  plumbing: PlumbingData | null;
  basisChart: { date: string; sofr_effr: number | null; sofr_iorb: number | null; effr_iorb: number | null }[];
}) {
  const spreads = basis
    ? [
        { label: 'SOFR − IORB', bps: basis.sofr_iorb, hint: basis.context?.sofr_iorb },
        { label: 'EFFR − IORB', bps: basis.effr_iorb, hint: basis.context?.effr_iorb },
        { label: 'SOFR − EFFR', bps: basis.sofr_effr, hint: basis.context?.sofr_effr },
      ]
    : plumbing
      ? [
          {
            label: 'SOFR − IORB',
            bps: plumbing.sofr != null && plumbing.iorb != null ? (plumbing.sofr - plumbing.iorb) * 100 : null,
          },
          {
            label: 'EFFR − IORB',
            bps: plumbing.effr != null && plumbing.iorb != null ? (plumbing.effr - plumbing.iorb) * 100 : null,
          },
          {
            label: 'SOFR − EFFR',
            bps: plumbing.sofr != null && plumbing.effr != null ? (plumbing.sofr - plumbing.effr) * 100 : null,
          },
        ]
      : [];

  return (
    <CollapsibleSection
      id="sec-basis"
      className="order-5"
      title="OVERNIGHT BASIS"
      apis={['FRED', 'MacroVol']}
      defaultOpen
      storageKey="rates.sec.basis"
      subtitle={basis.regime_note}
      badge={
        <span
          className={`rounded px-1.5 py-0.5 text-type-2xs font-bold ${
            basis.regime === 'corridor_normal'
              ? 'bg-up/15 text-up'
              : basis.regime === 'above_floor'
                ? 'bg-amber-500/15 text-amber-400'
                : 'bg-down/15 text-down'
          }`}
        >
          {(basis.regime || 'unknown').replace(/_/g, ' ').toUpperCase()}
        </span>
      }
    >
      <div className="mt-3 grid grid-cols-3 gap-2">
        {spreads.map((s) => (
          <div
            key={s.label}
            className="rounded border border-border px-2 py-1.5 text-type-xs"
            title={'hint' in s ? s.hint : undefined}
          >
            <span className="text-muted-foreground">{s.label}</span>
            <div className="text-sm font-bold text-foreground">
              {s.bps != null ? `${Number(s.bps).toFixed(1)} bps` : '—'}
            </div>
          </div>
        ))}
      </div>
      {basisHist?.zscore && (
        <div className="mt-2 flex flex-wrap gap-3 text-type-xs">
          <span className="text-muted-foreground">Z-score ({basisHist.zscore.window}d)</span>
          <span>
            SOFR−EFFR{' '}
            <b className={Math.abs(basisHist.zscore.sofr_effr ?? 0) > 2 ? 'text-amber-400' : ''}>
              {basisHist.zscore.sofr_effr != null ? basisHist.zscore.sofr_effr.toFixed(2) : '—'}
            </b>
          </span>
          <span>
            SOFR−IORB{' '}
            <b className={Math.abs(basisHist.zscore.sofr_iorb ?? 0) > 2 ? 'text-amber-400' : ''}>
              {basisHist.zscore.sofr_iorb != null ? basisHist.zscore.sofr_iorb.toFixed(2) : '—'}
            </b>
          </span>
          <span>
            EFFR−IORB{' '}
            <b className={Math.abs(basisHist.zscore.effr_iorb ?? 0) > 2 ? 'text-amber-400' : ''}>
              {basisHist.zscore.effr_iorb != null ? basisHist.zscore.effr_iorb.toFixed(2) : '—'}
            </b>
          </span>
        </div>
      )}
      {basisChart.length > 5 && (
        <div className="mt-3">
          <div className="mb-1 text-type-xs text-muted-foreground">SPREAD HISTORY (bps)</div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={basisChart} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#1f1f1f" strokeDasharray="2 2" />
              <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 9 }} interval="preserveStartEnd" />
              <YAxis tick={{ fill: '#71717a', fontSize: 9 }} width={36} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <ReferenceLine y={0} stroke="#333" />
              <Line type="monotone" dataKey="sofr_effr" name="SOFR−EFFR" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="sofr_iorb" name="SOFR−IORB" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="effr_iorb" name="EFFR−IORB" stroke="#22c55e" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <DataBadge
        asOf={basisHist?.as_of || basis.as_of}
        source={basisHist?.source || basis.source || 'FRED'}
        note={basisHist?.note}
        className="mt-2"
      />
    </CollapsibleSection>
  );
}
