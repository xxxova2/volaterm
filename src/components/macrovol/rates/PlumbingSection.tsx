import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { PlumbingData } from '../../../lib/macrovol/api';
import { DataBadge } from '../DataBadge';
import { CollapsibleSection } from '../../terminal/CollapsibleSection';
import { CHART, chartAxisTick, chartGridProps, chartTooltipStyle } from '../../../lib/chartTheme';

export function PlumbingSection({ plumbing }: { plumbing: PlumbingData | null }) {
  const rateCards = plumbing
    ? [
        { key: 'iorb', label: 'IORB', val: plumbing.iorb },
        { key: 'rrp', label: 'RRP RATE*', val: plumbing.rrp_rate },
        { key: 'sofr', label: 'SOFR', val: plumbing.sofr },
        { key: 'effr', label: 'EFFR', val: plumbing.effr },
      ]
    : [];

  const rrpHist = (plumbing?.rrp_volume_history || []).slice(-60).map((d) => ({
    date: d.date.slice(5),
    volume: d.volume,
  }));
  const resHist = (plumbing?.wresbal_history || []).slice(-90).map((d) => ({
    date: d.date.slice(5),
    reserves: d.reserves / 1000,
  }));

  return (
    <CollapsibleSection
      id="sec-plumbing"
      belowFold
      className="order-7"
      title="FED PLUMBING"
      apis={['FRED']}
      defaultOpen
      storageKey="rates.sec.plumbing"
    >
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {rateCards.map((c) => (
          <div key={c.key} className="rounded-lg border border-border bg-background/50 p-3">
            <div className="text-type-xs text-muted-foreground">{c.label}</div>
            <div className="text-xl font-bold text-foreground">
              {c.val != null ? `${c.val.toFixed(2)}%` : '—'}
            </div>
          </div>
        ))}
      </div>
      {plumbing?.rrp_rate_note && (
        <p className="mt-2 text-type-2xs text-muted-foreground">* {plumbing.rrp_rate_note}</p>
      )}
      {(rrpHist.length > 0 || resHist.length > 0) && (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {rrpHist.length > 0 && (
            <div>
              <div className="mb-1 text-type-xs text-muted-foreground">
                RRP VOLUME ($B) · latest {plumbing?.rrp_volume_latest != null ? `$${plumbing.rrp_volume_latest}B` : '—'}
              </div>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={rrpHist}>
                  <CartesianGrid {...chartGridProps} />
                  <XAxis dataKey="date" tick={{ ...chartAxisTick, fontSize: 9 }} interval="preserveStartEnd" />
                  <YAxis tick={{ ...chartAxisTick, fontSize: 9 }} width={40} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Line type="monotone" dataKey="volume" stroke={CHART.series.info} strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          {resHist.length > 0 && (
            <div>
              <div className="mb-1 text-type-xs text-muted-foreground">RESERVE BALANCES ($T)</div>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={resHist}>
                  <CartesianGrid {...chartGridProps} />
                  <XAxis dataKey="date" tick={{ ...chartAxisTick, fontSize: 9 }} interval="preserveStartEnd" />
                  <YAxis tick={{ ...chartAxisTick, fontSize: 9 }} width={40} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Line type="monotone" dataKey="reserves" stroke={CHART.series.up} strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
      <DataBadge asOf={plumbing?.as_of} source={plumbing?.source || 'FRED'} className="mt-2" />
    </CollapsibleSection>
  );
}
