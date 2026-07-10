/**
 * Save / apply named desk section layouts (localStorage).
 */
import { useState } from 'react';
import {
  applyLayout,
  captureCurrentLayout,
  deletePreset,
  loadPresets,
  savePresets,
  type DeskLayoutPreset,
} from '../../lib/market/deskLayout';
import { cn } from '../../lib/utils';

export function DeskLayoutControls({ className }: { className?: string }) {
  const [presets, setPresets] = useState<DeskLayoutPreset[]>(() => loadPresets());
  const [name, setName] = useState('My desk');

  const refresh = () => setPresets(loadPresets());

  return (
    <div className={cn('flex flex-wrap items-center gap-1 font-mono text-type-2xs', className)}>
      <span className="text-muted-foreground">Layouts</span>
      <input
        className="w-24 rounded border border-border bg-background px-1 py-0.5"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="name"
      />
      <button
        type="button"
        className="rounded border border-border px-1.5 py-0.5 hover:border-primary"
        onClick={() => {
          const p = captureCurrentLayout(name);
          const next = [p, ...loadPresets()].slice(0, 12);
          savePresets(next);
          refresh();
        }}
      >
        Save
      </button>
      {presets.map((p) => (
        <span key={p.id} className="inline-flex items-center gap-0.5 rounded border border-border">
          <button
            type="button"
            className="px-1.5 py-0.5 hover:bg-muted/40"
            title="Apply (reload sections to pick up)"
            onClick={() => {
              applyLayout(p);
              // Soft reload so CollapsibleSection re-reads storage
              window.location.reload();
            }}
          >
            {p.name}
          </button>
          <button
            type="button"
            className="px-1 text-muted-foreground hover:text-down"
            onClick={() => {
              deletePreset(p.id);
              refresh();
            }}
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}
