import { useCallback, useState } from 'react';

/**
 * Boolean state persisted in localStorage. Survives reloads; fails open on SSR/privacy mode.
 */
export function usePersistedBool(key: string, defaultValue: boolean): [boolean, (next: boolean | ((v: boolean) => boolean)) => void] {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw === '1' || raw === 'true') return true;
      if (raw === '0' || raw === 'false') return false;
    } catch {
      /* private mode */
    }
    return defaultValue;
  });

  const set = useCallback(
    (next: boolean | ((v: boolean) => boolean)) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next;
        try {
          localStorage.setItem(key, resolved ? '1' : '0');
        } catch {
          /* ignore */
        }
        return resolved;
      });
    },
    [key],
  );

  return [value, set];
}
