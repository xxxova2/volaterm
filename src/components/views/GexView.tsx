/**
 * Thin re-export wrapper — full dealer stack lives in PositioningView.
 * Kept for any leftover imports / tests.
 */
import { PositioningView } from './PositioningView';

export function GexView() {
  return <PositioningView />;
}
