/**
 * Saved desk layout presets (localStorage) — which sections default open.
 * CollapsibleSection already persists per-section; this stores named snapshots.
 */

export interface DeskLayoutPreset {
  id: string;
  name: string;
  /** Map of storageKey → open */
  sections: Record<string, boolean>;
  createdAt: number;
}

const PRESETS_KEY = 'desk.layout.presets';
const ACTIVE_KEY = 'desk.layout.active';

export function loadPresets(): DeskLayoutPreset[] {
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw);
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

export function savePresets(presets: DeskLayoutPreset[]): void {
  try {
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets.slice(0, 12)));
  } catch {
    /* ignore */
  }
}

export function getActivePresetId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

export function setActivePresetId(id: string | null): void {
  try {
    if (id) localStorage.setItem(ACTIVE_KEY, id);
    else localStorage.removeItem(ACTIVE_KEY);
  } catch {
    /* ignore */
  }
}

/** Snapshot all desk.section.* keys currently in localStorage. */
export function captureCurrentLayout(name: string): DeskLayoutPreset {
  const sections: Record<string, boolean> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith('desk.section.')) continue;
      const v = localStorage.getItem(k);
      sections[k] = v === '1' || v === 'true';
    }
  } catch {
    /* ignore */
  }
  return {
    id: Math.random().toString(36).slice(2, 10),
    name: name.trim() || 'Layout',
    sections,
    createdAt: Date.now(),
  };
}

/** Apply a preset's section open flags into localStorage. */
export function applyLayout(preset: DeskLayoutPreset): void {
  try {
    for (const [k, open] of Object.entries(preset.sections)) {
      localStorage.setItem(k, open ? '1' : '0');
    }
    setActivePresetId(preset.id);
  } catch {
    /* ignore */
  }
}

export function deletePreset(id: string): void {
  const next = loadPresets().filter((p) => p.id !== id);
  savePresets(next);
  if (getActivePresetId() === id) setActivePresetId(null);
}
