/**
 * Click-to-explain drawer for STIR / curve "imply" chips (Phase E).
 */
import { useEffect } from 'react';
import type { ImplyRead } from '../../lib/macrovol/api';
import { cn } from '../../lib/utils';

export function ImplyDrawer({
  imply,
  open,
  onClose,
  context,
}: {
  imply: ImplyRead | null;
  open: boolean;
  onClose: () => void;
  /** Optional section context e.g. "STIR path" */
  context?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !imply) return null;

  const bias = (imply.bias || 'neutral').toLowerCase();
  const biasColor =
    bias === 'easing' || bias === 'ample' || bias === 'trough'
      ? 'text-up'
      : bias === 'tightening' || bias === 'stress' || bias === 'humped' || bias === 'inverted'
        ? 'text-amber'
        : bias === 'steepener'
          ? 'text-info'
          : bias === 'flattener'
            ? 'text-rate'
            : 'text-muted-foreground';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Imply read explanation"
    >
      <div
        className="w-full max-w-md rounded-t-xl border border-border bg-card p-4 shadow-2xl sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <div>
            <div className="font-mono text-type-2xs uppercase tracking-wider text-muted-foreground">
              Imply read{context ? ` · ${context}` : ''}
            </div>
            <div className="mt-0.5 font-mono text-sm font-bold text-foreground">{imply.label}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-0.5 font-mono text-type-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Esc
          </button>
        </div>
        <p className="font-mono text-type-sm leading-relaxed text-foreground/90">{imply.text}</p>
        <div className="mt-3 flex flex-wrap gap-2 font-mono text-type-xs">
          <span className={cn('rounded border border-border px-1.5 py-0.5', biasColor)}>
            bias: {imply.bias || 'neutral'}
          </span>
          {imply.confidence && (
            <span className="rounded border border-border px-1.5 py-0.5 text-muted-foreground">
              conf: {imply.confidence}
            </span>
          )}
        </div>
        <p className="mt-3 border-t border-border/60 pt-2 font-mono text-type-2xs text-muted-foreground">
          Heuristic label from curve / strip geometry — not a trade recommendation. Confirm vs
          your model and liquidity.
        </p>
      </div>
    </div>
  );
}

/** Shared clickable imply chip used across Rates tools */
export function ImplyChip({
  imply,
  compact = false,
  onOpen,
}: {
  imply?: ImplyRead | null;
  compact?: boolean;
  onOpen?: (imply: ImplyRead) => void;
}) {
  if (!imply?.label || imply.label === '—') {
    return compact ? null : (
      <span className="text-type-2xs text-muted-foreground/70">—</span>
    );
  }
  const bias = (imply.bias || 'neutral').toLowerCase();
  const color =
    bias === 'easing' || bias === 'ample' || bias === 'trough'
      ? 'bg-up/15 text-up border-up/30'
      : bias === 'tightening' || bias === 'stress' || bias === 'humped' || bias === 'inverted'
        ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
        : bias === 'steepener'
          ? 'bg-info/15 text-info border-info/30'
          : bias === 'flattener'
            ? 'bg-rate/15 text-rate border-rate/30'
            : bias === 'flat'
              ? 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30'
              : 'bg-muted text-muted-foreground border-border';

  const interactive = !!onOpen;

  const className = cn(
    'inline-flex max-w-full items-center gap-1 rounded border px-1 py-0.5 text-type-2xs font-bold leading-tight',
    color,
    interactive && 'cursor-pointer hover:ring-1 hover:ring-primary/40',
  );

  const title = `${imply.text}${imply.confidence ? ` · conf=${imply.confidence}` : ''}${interactive ? ' · click for why' : ''}`;

  if (interactive) {
    return (
      <button
        type="button"
        className={className}
        title={title}
        onClick={(e) => {
          e.stopPropagation();
          onOpen(imply);
        }}
      >
        <span className="shrink-0">{imply.label}</span>
        {!compact && (
          <span className="hidden max-w-[200px] truncate font-normal opacity-80 lg:inline">
            {imply.text}
          </span>
        )}
      </button>
    );
  }

  return (
    <span className={className} title={title}>
      <span className="shrink-0">{imply.label}</span>
      {!compact && (
        <span className="hidden max-w-[200px] truncate font-normal opacity-80 lg:inline">
          {imply.text}
        </span>
      )}
    </span>
  );
}
