/**
 * Greeks desk host — Greeks 1.0 is the canonical shell.
 * Plotly + R3F mesh are surface themes inside Greeks10View (not dual editions).
 * Vol Structure IV surface is untouched.
 */
import { lazy, Suspense, useEffect } from 'react';
import { SectionErrorBoundary } from '../common/SectionErrorBoundary';
import { DeskLoading } from '../common/Skeleton';
import { UI_COPY } from '../../config/uiCopy';
import { consumeDeskJumpOnMount } from '../../lib/market/deskJump';
import { useTerminalStore } from '../../store/terminalStore';

const Greeks10View = lazy(() =>
  import('./Greeks10View').then((m) => ({ default: m.Greeks10View })),
);

/** Map legacy deep-links (heatmap / 3D / old IV tab) onto Trade Analyze + mesh theme. */
function applyLegacyGreeksJump(sectionId: string | null) {
  if (!sectionId) return;
  // Hosted under Vol · Greeks — leave section alone.
  if (sectionId === 'vol-sub-greeks') return;
  if (sectionId === 'greeks-sub-surface3d' || sectionId === 'greeks-mesh') {
    try {
      localStorage.setItem('ui.greeks.surfaceTheme', 'mesh');
    } catch { /* ignore */ }
    useTerminalStore.getState().setDeskSection('desk-ws-analyze');
    return;
  }
  // greeks-iv retired — IV is Vol; other legacy greeks-* → Trade Analyze
  if (
    sectionId.startsWith('greeks-sub-')
    || sectionId === 'greeks-desk'
    || sectionId === 'greeks-iv'
    || sectionId === 'iv'
  ) {
    useTerminalStore.getState().setDeskSection('desk-ws-analyze');
  }
}

export function GreeksView() {
  useEffect(() => {
    consumeDeskJumpOnMount();
    const id = useTerminalStore.getState().deskSectionId;
    applyLegacyGreeksJump(id);
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <SectionErrorBoundary name="Greeks">
        <Suspense fallback={<DeskLoading message={UI_COPY.load.greeks} />}>
          <Greeks10View />
        </Suspense>
      </SectionErrorBoundary>
    </div>
  );
}
