import { useState, useRef, useEffect, useCallback } from 'react';
import { Search } from 'lucide-react';
import { PRESETS } from '../../lib/options/synthetic';

const SUGGESTIONS = Object.keys(PRESETS);

interface SymbolDialogProps {
  onSelect: (symbol: string) => void;
  onClose: () => void;
}

export function SymbolDialog({ onSelect, onClose }: SymbolDialogProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const submit = useCallback((sym: string) => {
    onSelect(sym);
    onClose();
  }, [onSelect, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh] bg-background/70 backdrop-blur-sm" onMouseDown={onClose}>
      <div
        className="w-full max-w-md rounded-lg border border-border bg-card shadow-2xl"
        onMouseDown={e => e.stopPropagation()}
      >
        <form
          onSubmit={e => {
            e.preventDefault();
            if (query.trim()) submit(query.trim().toUpperCase());
          }}
          className="flex items-center gap-2 border-b border-border px-3 py-3"
        >
          <Search className="size-4 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value.toUpperCase())}
            placeholder="Enter symbol (e.g. SPY, QQQ, NVDA)"
            className="w-full bg-transparent font-mono text-sm uppercase tracking-wide outline-none placeholder:text-muted-foreground"
            maxLength={6}
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">↵</kbd>
        </form>
        <div className="p-2">
          <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Quick symbols</div>
          <div className="grid grid-cols-3 gap-1">
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => submit(s)}
                className="rounded-md border border-transparent px-2 py-2 text-left font-mono text-sm text-foreground transition-colors hover:border-border hover:bg-muted"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
