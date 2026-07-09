/**
 * Vol Structure desk — surface + smile + term + surface-quality (arb diagnostics).
 * Replaces standalone Vol Surface / Smile / Term / Arbitrage tabs.
 */
import { useEffect, useState, lazy, Suspense } from 'react';
import { SmileView } from './SmileView';
import { TermView } from './TermView';
import { ArbitrageView } from './ArbitrageView';
import { cn } from '../../lib/utils';
import { useTerminalStore } from '../../store/terminalStore';
import { DeskLoading } from '../common/Skeleton';

const SurfaceView = lazy(() =>
  import('./surface/SurfaceView').then((m) => ({ default: m.SurfaceView })),
);

type Sub = 'surface' | 'smile' | 'term' | 'quality';

const SUBS: { id: Sub; label: string; blurb: string; domId: string }[] = [
  { id: 'surface', label: 'Surface', blurb: '3D IV mesh', domId: 'vol-sub-surface' },
  { id: 'smile', label: 'Smile / Skew', blurb: 'RR · fly · SVI', domId: 'vol-sub-smile' },
  { id: 'term', label: 'Term', blurb: 'ATM IV vs √DTE', domId: 'vol-sub-term' },
  {
    id: 'quality',
    label: 'Surface Fit',
    blurb: 'Model convergence — validates SVI fit, not raw feed',
    domId: 'vol-sub-quality',
  },
];

export function VolStructureView() {
  const [sub, setSub] = useState<Sub>('surface');
  const setDeskContext = useTerminalStore((s) => s.setDeskContext);

  useEffect(() => {
    const meta = SUBS.find((s) => s.id === sub);
    setDeskContext({ id: meta?.domId ?? null, label: meta?.label ?? 'Surface', apis: [] });
    return () => setDeskContext({ id: null, label: null, apis: [] });
  }, [sub, setDeskContext]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="sticky top-0 z-20 flex shrink-0 flex-wrap items-center gap-1 border-b border-border bg-background/95 px-2 py-1 backdrop-blur-sm">
        <span className="mr-1 font-mono text-type-xs font-bold tracking-wider text-primary">
          VOL STRUCTURE
        </span>
        {SUBS.map((s) => (
          <button
            key={s.id}
            id={s.domId}
            type="button"
            data-desk-section="1"
            data-desk-section-active={sub === s.id ? '1' : undefined}
            onClick={() => setSub(s.id)}
            title={s.blurb}
            className={cn(
              'rounded px-2 py-0.5 font-mono text-type-xs transition-colors',
              sub === s.id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {s.label}
          </button>
        ))}
        <span className="ml-auto hidden font-mono text-type-2xs text-muted-foreground xl:inline">
          Fit = SVI / model · not feed arb · [ ] cycle · parity under Positioning
        </span>
      </div>

      <div className="min-h-0 flex-1 term-crossfade" key={sub}>
        {sub === 'surface' && (
          <Suspense
            fallback={
              <DeskLoading message="Fitting surface…" />
            }
          >
            <SurfaceView />
          </Suspense>
        )}
        {sub === 'smile' && <SmileView />}
        {sub === 'term' && <TermView />}
        {sub === 'quality' && (
          <div className="flex h-full flex-col">
            <p className="shrink-0 border-b border-border px-3 py-1.5 font-mono text-type-2xs text-muted-foreground">
              Surface Fit / Model Convergence — validates SVI fit, not raw feed
            </p>
            <div className="border-b border-border px-3 py-1.5 font-mono text-type-xs text-muted-foreground">
              Calendar: total variance w=σ²T non-decreasing in T · Butterfly: discrete convexity of w in log-moneyness.
              Red cells = model inconsistency / noisy grid — not a free lunch without bid/ask and transaction costs.
            </div>
            <div className="min-h-0 flex-1">
              <ArbitrageView />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
