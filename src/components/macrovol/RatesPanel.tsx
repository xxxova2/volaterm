import { useCallback, useState } from 'react';
import { ImplyDrawer } from '../common/ImplyDrawer';
import { EmptyState, SectionSkeleton } from '../common/EmptyState';
import { SectionErrorBoundary } from '../common/SectionErrorBoundary';
import type { ImplyRead } from '../../lib/macrovol/api';
import { useRatesData } from './rates/useRatesData';
import { SnapshotCards } from './rates/SnapshotCards';
import { ShapeSection } from './rates/ShapeSection';
import { Dv01Book } from './rates/Dv01Book';
import { NyFedBoard } from './rates/NyFedBoard';
import { StirSection } from './rates/StirSection';
import { BasisSection } from './rates/BasisSection';
import { PlumbingSection } from './rates/PlumbingSection';
import { CurveSection } from './rates/CurveSection';
import { CorrSection } from './rates/CorrSection';
import { PremiumSection } from './rates/PremiumSection';
import { JapanCarryPanel } from './rates/JapanCarryPanel';
import { CurvesBoard } from './rates/CurvesBoard';

export function RatesPanel() {
  const {
    summary, plumbing, basis, basisHist, stir, shape, dv01, setDv01, curve, curveMeta,
    curveCompare, curveComparePoints, corr,
    error, loading,
    n2, setN2, n5, setN5, n10, setN10, n30, setN30,
    sh2, setSh2, sh5, setSh5, sh10, setSh10, sh30, setSh30,
    dv01Loading, setDv01Loading, reloadDv01,
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
      {/* Dense content stack — curves first, boards second; less chrome/padding */}
      <div className="flex flex-col gap-1.5 p-1 font-mono [&>*]:min-w-0">
        <ImplyDrawer
          open={!!implyDrawer}
          imply={implyDrawer?.imply ?? null}
          context={implyDrawer?.context}
          onClose={() => setImplyDrawer(null)}
        />

        <SnapshotCards summary={summary} />

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

        <StirSection stir={stir} stirChart={stirChart} onOpenImply={openImply} />

        {stir?.nyfed?.ref_print && stir.nyfed.ref_print.length > 0 && (
          <NyFedBoard nyfed={stir.nyfed} />
        )}

        {basis && (
          <BasisSection
            basis={basis}
            basisHist={basisHist}
            plumbing={plumbing}
            basisChart={basisChart}
          />
        )}

        <PlumbingSection plumbing={plumbing} />

        {/* UST curve also lives in CurvesBoard hero — keep compact table section below fold */}
        <CurveSection curve={curve} curveMeta={curveMeta} />

        {corr && corr.matrix?.length > 0 && <CorrSection corr={corr} />}

        <PremiumSection basis={basis} plumbing={plumbing} stir={stir} shape={shape} />

        <div className="order-11 min-w-0">
          <JapanCarryPanel />
        </div>

        <Dv01Book
          dv01={dv01}
          setDv01={setDv01}
          n2={n2} setN2={setN2}
          n5={n5} setN5={setN5}
          n10={n10} setN10={setN10}
          n30={n30} setN30={setN30}
          sh2={sh2} setSh2={setSh2}
          sh5={sh5} setSh5={setSh5}
          sh10={sh10} setSh10={setSh10}
          sh30={sh30} setSh30={setSh30}
          dv01Loading={dv01Loading}
          setDv01Loading={setDv01Loading}
          reloadDv01={reloadDv01}
        />
      </div>
    </SectionErrorBoundary>
  );
}
