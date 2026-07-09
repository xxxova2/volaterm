import type { RatesSummary } from '../../../lib/macrovol/api';
import { DataBadge } from '../DataBadge';
import { CollapsibleSection } from '../../terminal/CollapsibleSection';

export function SnapshotCards({ summary }: { summary: RatesSummary | null }) {
  const cards = summary
    ? [
        { label: 'SOFR', value: summary.sofr, suffix: '%', bps: false },
        { label: 'EFFR', value: summary.effr, suffix: '%', bps: false },
        { label: '2Y TREASURY', value: summary.usy2, suffix: '%', bps: false },
        { label: '10Y TREASURY', value: summary.usy10, suffix: '%', bps: false },
        { label: '2S10S SPREAD', value: summary.spread_2s10s, suffix: ' bps', bps: true },
        { label: '3M10Y SPREAD', value: summary.spread_3m10y, suffix: ' bps', bps: true },
      ]
    : [];

  return (
    <CollapsibleSection
      id="sec-snapshot"
      className="order-2"
      title="RATES SNAPSHOT"
      apis={['FRED']}
      defaultOpen
      storageKey="rates.sec.snapshot"
      subtitle={summary?.spread_note}
    >
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
        {cards.map((card) => {
          const display =
            card.value != null
              ? (card.bps ? (card.value * 100).toFixed(0) : card.value.toFixed(2)) + card.suffix
              : '—';
          const isNeg = card.bps && card.value != null && card.value < 0;
          return (
            <div
              key={card.label}
              className={`rounded-lg border p-2.5 ${isNeg ? 'border-red-500/50 bg-red-950/20' : 'border-border bg-background/40'}`}
            >
              <div className={`text-[10px] ${isNeg ? 'text-red-400' : 'text-muted-foreground'}`}>{card.label}</div>
              <div className={`text-lg font-bold tabular-nums ${isNeg ? 'text-red-400' : 'text-foreground'}`}>
                {display}
              </div>
              {isNeg && <div className="mt-0.5 text-[10px] text-red-400">⚠ INVERTED</div>}
            </div>
          );
        })}
      </div>
      <DataBadge
        asOf={summary?.as_of}
        source={summary?.source || 'FRED · snapshot'}
        note={summary?.spread_note}
        staleThresholdMin={60}
      />
    </CollapsibleSection>
  );
}
