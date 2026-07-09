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
      className="order-1"
      title="SNAPSHOT"
      apis={['FRED']}
      defaultOpen
      storageKey="rates.sec.snapshot"
      subtitle={summary?.spread_note}
    >
      <div className="grid grid-cols-3 gap-1 sm:grid-cols-6">
        {cards.map((card) => {
          const display =
            card.value != null
              ? (card.bps ? (card.value * 100).toFixed(0) : card.value.toFixed(2)) + card.suffix
              : '—';
          const isNeg = card.bps && card.value != null && card.value < 0;
          return (
            <div
              key={card.label}
              className={`rounded border px-1.5 py-1 ${isNeg ? 'border-down/50 bg-down/15' : 'border-border bg-background/40'}`}
            >
              <div className={`truncate text-type-2xs ${isNeg ? 'text-down' : 'text-muted-foreground'}`}>{card.label}</div>
              <div className={`text-sm font-bold tabular-nums ${isNeg ? 'text-down' : 'text-foreground'}`}>
                {display}
              </div>
            </div>
          );
        })}
      </div>
      <DataBadge
        asOf={summary?.as_of}
        source={summary?.source || 'FRED · snapshot'}
        note={summary?.spread_note}
        staleThresholdMin={60}
        className="mt-1"
      />
    </CollapsibleSection>
  );
}
