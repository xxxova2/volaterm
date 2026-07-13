/**
 * Zoom / expand any chart tool to a near-fullscreen overlay.
 * Click Zoom to open; backdrop, Esc, or × to close.
 * Children mount once (inline or portal) so ResponsiveContainer / canvas size correctly.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, Minimize2, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export type ChartZoomContextValue = {
  /** True when this chart is shown in the fullscreen overlay. */
  zoomed: boolean;
};

const ChartZoomContext = createContext<ChartZoomContextValue>({ zoomed: false });

/** Read zoom state from the nearest ChartZoom parent (false if none). */
export function useChartZoom(): ChartZoomContextValue {
  return useContext(ChartZoomContext);
}

export type ChartZoomProps = {
  /** Short title shown in the expanded chrome. */
  title: string;
  children: ReactNode;
  className?: string;
  /** Extra classes on the inline (non-zoomed) body. */
  bodyClassName?: string;
  /** Expanded shell height (default fills most of the viewport). */
  expandedHeightClass?: string;
  /** Optional subtitle / badge under title when zoomed. */
  subtitle?: string;
  /** Hide the zoom button (e.g. already inside another zoom). */
  hideButton?: boolean;
};

export function ChartZoom({
  title,
  children,
  className,
  bodyClassName,
  expandedHeightClass = 'h-[min(88vh,920px)]',
  subtitle,
  hideButton = false,
}: ChartZoomProps) {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  const close = useCallback(() => setOpen(false), []);
  const openZoom = useCallback(() => setOpen(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  const zoomBtn =
    !hideButton && !open ? (
      <button
        type="button"
        onClick={openZoom}
        title="Zoom chart"
        aria-label={`Zoom ${title}`}
        className={cn(
          'absolute right-1 top-1 z-10 flex items-center gap-1 rounded border border-border/80',
          'bg-card/90 px-1.5 py-0.5 font-mono text-type-2xs text-muted-foreground',
          'shadow-sm backdrop-blur-sm transition-colors',
          'hover:border-primary/50 hover:bg-muted hover:text-foreground',
        )}
      >
        <Maximize2 className="h-3 w-3" aria-hidden />
        <span className="hidden sm:inline">Zoom</span>
      </button>
    ) : null;

  return (
    <div className={cn('relative flex min-h-0 flex-col', className)}>
      {zoomBtn}
      {/* Keep layout height while zoomed; children live only in portal to avoid double size loops */}
      <div
        className={cn('min-h-0 flex-1', bodyClassName, open && 'invisible pointer-events-none')}
        aria-hidden={open || undefined}
      >
        {!open && (
          <ChartZoomContext.Provider value={{ zoomed: false }}>
            {children}
          </ChartZoomContext.Provider>
        )}
      </div>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-2 sm:p-4"
            onClick={close}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <div
              className={cn(
                'flex w-full max-w-[min(98vw,1400px)] flex-col overflow-hidden',
                'rounded-lg border border-border bg-background shadow-2xl',
                expandedHeightClass,
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2">
                <div className="min-w-0">
                  <div
                    id={titleId}
                    className="truncate font-mono text-type-sm font-semibold uppercase tracking-wide text-foreground"
                  >
                    {title}
                  </div>
                  {subtitle && (
                    <div className="truncate font-mono text-type-2xs text-muted-foreground">
                      {subtitle}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <span className="hidden font-mono text-type-2xs text-muted-foreground sm:inline">
                    Esc · click outside
                  </span>
                  <button
                    type="button"
                    onClick={close}
                    title="Close zoom"
                    aria-label="Close zoom"
                    className="flex items-center gap-1 rounded border border-border px-2 py-1 font-mono text-type-2xs text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Minimize2 className="h-3.5 w-3.5" aria-hidden />
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              </div>
              {/* Fill remaining shell — charts must use h-full / useChartZoom().zoomed */}
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-2 sm:p-3">
                <ChartZoomContext.Provider value={{ zoomed: true }}>
                  <div className="flex h-full min-h-0 w-full flex-1 flex-col">{children}</div>
                </ChartZoomContext.Provider>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
