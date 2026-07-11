/**
 * Shared desk view switch — classic shell and future tiles call the same path.
 */
import { lazy, Suspense, type ReactNode } from 'react';
import { DashboardView } from '../views/DashboardView';
import { VolStructureView } from '../views/VolStructureView';
import { PositioningView } from '../views/PositioningView';
import { DeskView } from '../views/DeskView';
import { BtcView } from '../views/BtcView';
import { RatesView } from '../views/RatesView';
import { DeskLoading } from '../common/Skeleton';
import type { ActiveTab } from '../../lib/options/types';

const GreeksView = lazy(() =>
  import('../views/GreeksView').then((m) => ({ default: m.GreeksView })),
);

/** Desks that paint without waiting on equity chain load. */
export const INDEPENDENT_TABS: ReadonlySet<ActiveTab> = new Set([
  'rates',
  'greeks',
  'home',
  'crypto',
  'desk',
]);

export function renderDeskView(tab: ActiveTab, loading: boolean): ReactNode {
  if (loading && !INDEPENDENT_TABS.has(tab)) {
    return <DeskLoading message="Building chain surface…" />;
  }

  const view = (() => {
    switch (tab) {
      case 'home':
        return <DashboardView />;
      case 'vol':
        return <VolStructureView />;
      case 'positioning':
        return <PositioningView />;
      case 'greeks':
        return <GreeksView />;
      case 'desk':
        return <DeskView />;
      case 'crypto':
        return <BtcView />;
      case 'rates':
        return <RatesView />;
      default:
        return <DashboardView />;
    }
  })();

  return (
    <div key={tab} className="h-full term-crossfade">
      <Suspense fallback={<DeskLoading message="Loading view…" />}>{view}</Suspense>
    </div>
  );
}
