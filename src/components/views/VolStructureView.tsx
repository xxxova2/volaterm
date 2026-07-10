/**
 * Vol Structure desk — surface + smile + term + surface-quality (arb diagnostics).
 * Replaces standalone Vol Surface / Smile / Term / Arbitrage tabs.
 */
import { useEffect, useState, lazy, Suspense } from 'react';
import { SmileView } from './SmileView';
import { TermView } from './TermView';
import { ArbitrageView } from './ArbitrageView';
import { useTerminalStore } from '../../store/terminalStore';
import { DeskLoading } from '../common/Skeleton';
import { EmptyState } from '../common/EmptyState';
import { SectionErrorBoundary } from '../common/SectionErrorBoundary';
import { UI_COPY } from '../../config/uiCopy';
import { DeskChrome } from '../terminal/DeskChrome';
import { DeskModeBar } from '../terminal/DeskModeBar';
import { GexLevelsStrip } from '../common/GexLevelsStrip';

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
  const snapshot = useTerminalStore((s) => s.snapshot);
  const loading = useTerminalStore((s) => s.loading);
  const chainUsed = useTerminalStore((s) => s.chainUsed);

  useEffect(() => {
    const meta = SUBS.find((s) => s.id === sub);
    setDeskContext({
      id: meta?.domId ?? null,
      label: meta?.label ?? 'Surface',
      apis: chainUsed === 'deribit' ? ['Deribit'] : ['yfinance', 'FMP'],
    });
    return () => setDeskContext({ id: null, label: null, apis: [] });
  }, [sub, setDeskContext, chainUsed]);

  if (loading && !snapshot) {
    return <DeskLoading message={UI_COPY.load.chain} />;
  }
  if (!snapshot) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <EmptyState
          kind="no-data"
          title="No live surface"
          body={UI_COPY.empty.chain}
        />
      </div>
    );
  }

  const activeDomId = SUBS.find((s) => s.id === sub)?.domId ?? 'vol-sub-surface';

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <DeskChrome
        label="VOL STRUCTURE"
        trailing={
          <span className="hidden font-mono text-type-2xs text-muted-foreground xl:inline">
            Fit = SVI / model · not feed arb · [ ] cycle · parity under Positioning
          </span>
        }
      >
        <DeskModeBar
          items={SUBS.map((s) => ({
            id: s.domId,
            label: s.label,
            title: s.blurb,
          }))}
          activeId={activeDomId}
          onSelect={(domId) => {
            const m = SUBS.find((s) => s.domId === domId);
            if (m) setSub(m.id);
          }}
          asSectionButtons
        />
      </DeskChrome>

      {/* Sticky dealer levels on vol surface / smile / term (Phase 3) */}
      <GexLevelsStrip compact showSpark className="bg-card/40" />

      <div className="min-h-0 flex-1 term-crossfade" key={sub}>
        {sub === 'surface' && (
          <SectionErrorBoundary name="Surface">
            <Suspense fallback={<DeskLoading message={UI_COPY.load.surface} />}>
              <SurfaceView />
            </Suspense>
          </SectionErrorBoundary>
        )}
        {sub === 'smile' && (
          <SectionErrorBoundary name="Smile">
            <SmileView />
          </SectionErrorBoundary>
        )}
        {sub === 'term' && (
          <SectionErrorBoundary name="Term">
            <TermView />
          </SectionErrorBoundary>
        )}
        {sub === 'quality' && (
          <SectionErrorBoundary name="Quality">
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
          </SectionErrorBoundary>
        )}
      </div>
    </div>
  );
}
