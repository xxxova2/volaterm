import { useEffect } from 'react';

const SHORTCUTS = [
  { key: '1', action: 'Home desk' },
  { key: '2', action: 'Vol Structure' },
  { key: '3', action: 'Positioning' },
  { key: '4', action: 'Greeks' },
  { key: '5', action: 'MM Desk' },
  { key: '6 / B', action: 'Crypto (BTC·ETH)' },
  { key: '7', action: 'Macros & Rates' },
  { key: 'M', action: 'MM desk' },
  { key: 'V', action: 'Vol Structure' },
  { key: '[ ]', action: 'Prev / next section' },
  { key: 'D', action: 'Toggle dense / readable' },
  { key: 'R', action: 'Refresh data' },
  { key: 'S', action: 'Search symbol' },
  { key: 'Space', action: 'Play/pause history' },
  { key: '← →', action: 'Scrub frames' },
  { key: '↑ ↓ / j k', action: 'Board row focus (chain · SR3 · SERFF · cal)' },
  { key: 'y', action: 'Copy focused cell' },
  { key: 'c', action: 'Focus option chain' },
  { key: 'Esc', action: 'Close / clear focus' },
  { key: 'L', action: 'Toggle Live/Demo' },
  { key: '?', action: 'Toggle shortcuts' },
  { key: 'Tab', action: 'Cycle tabs' },
];

interface ShortcutsOverlayProps {
  onClose: () => void;
}

export function ShortcutsOverlay({ onClose }: ShortcutsOverlayProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === '?') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-card border border-border rounded-lg shadow-2xl p-5 w-96" onClick={e => e.stopPropagation()}>
        <h2 className="text-sm font-semibold text-foreground mb-3 font-mono">Keyboard Shortcuts</h2>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {SHORTCUTS.map(s => (
            <div key={s.key} className="flex items-center justify-between text-xs font-mono">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-foreground text-[10px]">{s.key}</kbd>
              <span className="text-muted-foreground">{s.action}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-4 text-center">Press Esc or ? to close</p>
      </div>
    </div>
  );
}
