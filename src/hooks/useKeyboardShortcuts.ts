import { useEffect, useRef } from 'react';

type ShortcutMap = Record<string, () => void>;

export function useKeyboardShortcuts(shortcuts: ShortcutMap) {
  const ref = useRef(shortcuts);
  ref.current = shortcuts;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      // Preserve [ ] before lowercasing (toLowerCase is fine for these)
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
      // Arrow keys
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
      ref.current[key]?.();
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
