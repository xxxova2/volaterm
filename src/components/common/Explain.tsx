import { useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTerminalStore } from '../../store/terminalStore';
import { GLOSSARY } from '../../lib/glossary';
import { cn } from '../../lib/utils';

interface ExplainProps {
  /** Glossary term id (see src/lib/glossary.ts). */
  term: string;
  children: ReactNode;
  /** Extra classes for the wrapper (e.g. flex sizing to preserve layout). */
  className?: string;
  /** Optional override when the term is not in the glossary. */
  title?: string;
  body?: string;
}

/**
 * Wraps a label/value and shows a plain-English tooltip on hover (and focus),
 * rendered in a portal so it is never clipped by panel overflow. Fully disabled
 * when the store's `explainHovers` toggle is off (for advanced users).
 */
export function Explain({ term, children, className, title, body }: ExplainProps) {
  const enabled = useTerminalStore(s => s.explainHovers);
  const entry = GLOSSARY[term] ?? (title && body ? { title, body } : null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const ref = useRef<HTMLSpanElement>(null);

  if (!enabled || !entry) return <>{children}</>;

  const show = () => {
    if (ref.current) setRect(ref.current.getBoundingClientRect());
  };
  const hide = () => setRect(null);

  const below = rect ? rect.bottom + 140 < window.innerHeight : true;
  const style = rect
    ? {
        left: rect.left + rect.width / 2,
        top: below ? rect.bottom + 6 : rect.top - 6,
        transform: `translateX(-50%) ${below ? '' : 'translateY(-100%)'}`,
      }
    : undefined;

  return (
    <span
      ref={ref}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      className={cn(
        'relative inline-flex cursor-help underline decoration-dotted decoration-muted-foreground/40 decoration-1 underline-offset-2',
        className,
      )}
      tabIndex={0}
    >
      {children}
      {rect &&
        createPortal(
          <div className="pointer-events-none fixed z-[1000] max-w-[16rem]" style={style}>
            <div className="rounded-md border border-border bg-popover px-2.5 py-2 text-[10px] leading-snug text-popover-foreground shadow-xl">
              <div className="mb-1 font-semibold text-foreground">{entry.title}</div>
              <div>{entry.body}</div>
            </div>
          </div>,
          document.body,
        )}
    </span>
  );
}
