import { useEffect, useRef } from 'react';

type ShortcutMap = Record<string, () => void>;

/**
 * Global keyboard shortcuts.
 * - Bare letter/number keys fire when no modifier (except Shift for `?`).
 * - `mod+k` (Ctrl/Cmd+K) registered explicitly for command palette.
 * - Inputs/selects ignored.
 */
export function useKeyboardShortcuts(shortcuts: ShortcutMap) {
  const ref = useRef(shortcuts);
  ref.current = shortcuts;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.target as HTMLElement)?.isContentEditable) return;

      const mod = e.metaKey || e.ctrlKey;

      // Command palette chord
      if (mod && !e.altKey && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        ref.current['mod+k']?.();
        return;
      }

      // Ignore bare-key handlers when modifiers held (prevents Cmd+K → board k, Alt+1 → tab1)
      if (mod || e.altKey) return;

      // Preserve [ ] before lowercasing
      const raw = e.key;
      if (raw === '[' || raw === ']') {
        e.preventDefault();
        ref.current[raw]?.();
        return;
      }
      const key = raw === ' ' ? 'space' : raw.toLowerCase();
      if (key >= '1' && key <= '9') {
        ref.current[`tab${key}`]?.();
        return;
      }
      if (raw === 'ArrowLeft') {
        ref.current.arrowleft?.();
        return;
      }
      if (raw === 'ArrowRight') {
        ref.current.arrowright?.();
        return;
      }
      if (raw === 'ArrowUp') {
        e.preventDefault();
        ref.current.arrowup?.();
        return;
      }
      if (raw === 'ArrowDown') {
        e.preventDefault();
        ref.current.arrowdown?.();
        return;
      }
      if (raw === 'Escape') {
        ref.current.escape?.();
        return;
      }
      // Shift+/ is often `?` — allow without treating Shift as a blocker for ?
      if (key === '?' || (e.shiftKey && raw === '/')) {
        ref.current['?']?.();
        return;
      }
      if (e.shiftKey && key !== '?') {
        // other shift combos: still allow letters that don't need shift on most layouts
        // but skip if it produced a symbol we don't map
      }
      ref.current[key]?.();
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
