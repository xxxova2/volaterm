/**
 * Ctrl/Cmd+K command palette — function codes + symbol switch.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  openFunction,
  searchFunctions,
  type FunctionDescriptor,
} from '../../config/functionRegistry';
import { cn } from '../../lib/utils';

interface CommandPaletteProps {
  onClose: () => void;
  onHelp?: () => void;
  onWatchlistFocus?: () => void;
}

export function CommandPalette({ onClose, onHelp, onWatchlistFocus }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [hi, setHi] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => searchFunctions(query, 16), [query]);

  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  useEffect(() => {
    setHi(0);
  }, [query]);

  const run = useCallback(
    (d?: FunctionDescriptor | null, raw?: string) => {
      const input = d
        ? (d.codes[0] ?? d.functionId)
        : (raw ?? query).trim();
      if (!input) return;
      const r = openFunction(d?.functionId === 'crypto:eth' ? 'ETH' : (d?.codes[0] ?? input), {
        onHelp: () => {
          onHelp?.();
          onClose();
        },
        onWatchlistFocus: () => {
          onWatchlistFocus?.();
          onClose();
        },
      });
      if (r.ok) onClose();
    },
    [query, onClose, onHelp, onWatchlistFocus],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHi((i) => Math.min(i + 1, Math.max(0, results.length - 1)));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHi((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (results[hi]) run(results[hi]);
        else if (query.trim()) run(null, query.trim());
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [onClose, results, hi, query, run]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-background/70 pt-[12vh] backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden border border-border bg-card shadow-2xl glow-amber"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border bg-card px-3 py-2">
          <span className="term-code text-type-xs">GO</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Function code or symbol (GEX, SOFR, SPY…)"
            className="w-full bg-transparent font-mono text-sm outline-none placeholder:text-muted-foreground"
            autoComplete="off"
            spellCheck={false}
            aria-autocomplete="list"
            aria-controls="cmd-palette-list"
          />
          <kbd className="border border-border bg-muted px-1.5 py-0.5 font-mono text-type-xs text-muted-foreground">
            esc
          </kbd>
        </div>
        <ul id="cmd-palette-list" className="max-h-72 overflow-y-auto py-0.5" role="listbox">
          {results.length === 0 && (
            <li className="px-3 py-2 font-mono text-type-xs text-muted-foreground">
              No match — enter a ticker to switch symbol
            </li>
          )}
          {results.map((d, i) => (
            <li key={d.functionId + d.codes.join()}>
              <button
                type="button"
                role="option"
                aria-selected={i === hi}
                className={cn(
                  'flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left font-mono text-type-xs transition-colors',
                  i === hi ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-muted/60',
                )}
                onMouseEnter={() => setHi(i)}
                onClick={() => run(d)}
              >
                <span className="truncate">
                  <span className="term-code">
                    {d.codes[0] ?? d.functionId}
                  </span>
                  <span className="ml-2 text-muted-foreground">{d.label}</span>
                </span>
                {d.heavy && (
                  <span className="shrink-0 text-type-2xs text-warn">heavy</span>
                )}
              </button>
            </li>
          ))}
        </ul>
        <div className="border-t border-border px-3 py-1 font-mono text-type-2xs text-muted-foreground">
          Ctrl/Cmd+K · registry · not trade advice
        </div>
      </div>
    </div>
  );
}
