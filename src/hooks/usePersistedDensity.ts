import { usePersistedBool } from './usePersistedBool';

export type UiDensity = 'dense' | 'readable';

/** Persist density as bool under the hood; map to dense/readable. */
export function densityFromStorage(): UiDensity {
  try {
    const raw = localStorage.getItem('ui.density');
    if (raw === 'readable') return 'readable';
    if (raw === 'dense') return 'dense';
  } catch {
    /* ignore */
  }
  return 'dense';
}

export function writeDensity(d: UiDensity) {
  try {
    localStorage.setItem('ui.density', d);
  } catch {
    /* ignore */
  }
}

/** Optional helper if a component wants local toggle without store. */
export function useLocalDenseDefault(defaultDense = true): [boolean, (v: boolean) => void] {
  return usePersistedBool('ui.density.dense', defaultDense);
}
