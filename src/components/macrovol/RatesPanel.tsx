import { useCallback, useState } from 'react';
import { ImplyDrawer } from '../common/ImplyDrawer';
import { EmptyState, SectionSkeleton } from '../common/EmptyState';
import { SectionErrorBoundary } from '../common/SectionErrorBoundary';
import type { ImplyRead } from '../../lib/macrovol/api';
import { useRatesData } from './rates/useRatesData';
import { MoneyMarketStrip } from './rates/MoneyMarketStrip';
import { SnapshotCards } from './rates/SnapshotCards';
import { ShapeSection } from './rates/ShapeSection';
import { NyFedBoard } from './rates/NyFedBoard';
import { StirSection } from './rates/StirSection';
import { BasisSection } from './rates/BasisSection';
import { PlumbingSection } from './rates/PlumbingSection';
import { CurveSection } from './rates/CurveSection';
import { CorrSection } from './rates/CorrSection';
import { PremiumSection } from './rates/PremiumSection';
import { JapanCarryPanel } from './rates/JapanCarryPanel';
import { CurvesBoard } from './rates/CurvesBoard';
import { FxBoard } from './rates/FxBoard';
import { GlobalYieldsBoard } from './rates/GlobalYieldsBoard';
import { UstDataStrip } from './rates/UstDataStrip';

/**
 * US rates desk — information hierarchy:
 *   money markets (data → chart) → UST (data → chart) → STIR → plumbing
 * Global/FX/Japan are rendered by RatesView after this panel (relevance order).
 *
 * Rule: every block is *data first, then meaning (chart)* for the same series.
 */
export function RatesPanel({
  includeGlobalBlocks = false,
}: {
  /** When true, also render Global 10Y / FX / Japan (standalone use). RatesView sets false. */
  includeGlobalBlocks?: boolean;
}) {
  const {
    summary, plumbing, basis, basisHist, stir, shape, curve, curveMeta,
    curveCompare, curveComparePoints, corr,
    error, loading,
    stirChart, shapeHistoryCharts, basisChart,
  } = useRatesData();
  const [implyDrawer, setImplyDrawer] = useState<{ imply: ImplyRead; context?: string } | null>(null);
  const openImply = useCallback((i: ImplyRead) => setImplyDrawer({ imply: i }), []);

  if (loading) {
    return (
      <div className="p-1">
        <EmptyState kind="loading" title="Loading rates…" body="FRED · NYFed · yfinance via MacroVol (:8765)" compact />
        <SectionSkeleton rows={3} className="mt-1" />
      </div>
    );
  }
  if (error && !summary) {
    return (
      <EmptyState
        kind="api-down"
        title="Rates API unavailable"
        body={error}
        action={
          <button
            type="button"
            className="rounded border border-border px-2 py-1 text-type-xs hover:border-primary"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        }
      />
    );
  }

  return (
    <SectionErrorBoundary name="Rates panel">
      <div className="flex flex-col gap-1.5 p-1 font-mono [&>*]:min-w-0">
        <ImplyDrawer
          open={!!implyDrawer}
          imply={implyDrawer?.imply ?? null}
          context={implyDrawer?.context}
          onClose={() => setImplyDrawer(null)}
        />

        {/* ── 1. MONEY MARKETS: data → chart ─────────────────────────── */}
        <MoneyMarketStrip
          summary={summary}
          basis={basis}
          plumbing={plumbing}
          basisHist={basisHist}
          stir={stir}
        />

        {basis && (
          <BasisSection
            basis={basis}
            basisHist={basisHist}
            plumbing={plumbing}
            basisChart={basisChart}
            compactData
          />
        )}

        <PlumbingSection plumbing={plumbing} />

        {/* ── 2. UST CURVE: data strip → dual curve + spread history ── */}
        <UstDataStrip
          summary={summary}
          curve={curve}
          curveMeta={curveMeta}
          shape={shape}
        />

        <CurvesBoard
          curve={curve}
          curveMeta={curveMeta}
          curveComparePoints={curveComparePoints}
          curveCompare={curveCompare}
          stirChart={stirChart}
          sofr={summary?.sofr ?? stir?.sofr}
          shape={shape}
          spreadHistory={shapeHistoryCharts}
          onOpenImply={openImply}
        />

        {shape && (
          <ShapeSection
            shape={shape}
            shapeHistoryCharts={shapeHistoryCharts}
            onOpenImply={openImply}
          />
        )}

        {/* Compact dual-source table (secondary to UstDataStrip + CurvesBoard) */}
        <CurveSection curve={curve} curveMeta={curveMeta} />

        {/* ── 3. STIR / NY Fed path ─────────────────────────────────── */}
        <StirSection stir={stir} stirChart={stirChart} onOpenImply={openImply} />

        {stir?.nyfed?.ref_print && stir.nyfed.ref_print.length > 0 && (
          <NyFedBoard nyfed={stir.nyfed} />
        )}

        {/* Snapshot kept as foldable detail (primary prints are in MM + UST strips) */}
        <SnapshotCards summary={summary} />

        <PremiumSection basis={basis} plumbing={plumbing} stir={stir} shape={shape} />

        {corr && corr.matrix?.length > 0 && <CorrSection corr={corr} />}

        {includeGlobalBlocks && (
          <>
            <GlobalYieldsBoard />
            <FxBoard />
            <JapanCarryPanel />
          </>
        )}
      </div>
    </SectionErrorBoundary>
  );
}
