/**
 * Related functions for a desk — same-tab sections first, then peer desks.
 * Mirrors Bloomberg "Related Functions Menu" (sibling analysis on loaded security).
 */
import {
  listFunctions,
  type FunctionDescriptor,
} from './functionRegistry';
import { sectionsForTab, tabLabel } from './deskNav';
import { TABS } from '../components/terminal/tabs';
import type { ActiveTab } from '../lib/options/types';

/** Primary mnemonic for the active tab (toolbar box). */
export function primaryCodeForTab(tab: ActiveTab): string {
  const top = listFunctions().find(
    (f) => f.tab === tab && !f.sectionId && !f.shell && f.codes.length > 0,
  );
  if (top?.codes[0]) return top.codes[0];
  const any = listFunctions().find((f) => f.tab === tab && f.codes.length > 0);
  return any?.codes[0] ?? tab.toUpperCase();
}

/** Descriptor for current tab (+ optional section). */
export function currentFunctionLabel(
  tab: ActiveTab,
  sectionId?: string | null,
): { code: string; label: string } {
  if (sectionId) {
    const d = listFunctions().find(
      (f) => f.tab === tab && f.sectionId === sectionId,
    );
    if (d) {
      return {
        code: d.codes[0] ?? primaryCodeForTab(tab),
        label: d.label,
      };
    }
  }
  return {
    code: primaryCodeForTab(tab),
    label: tabLabel(tab),
  };
}

/**
 * Related menu rows: same-desk sections, then other desk tops.
 * Excludes pure shell actions.
 */
export function relatedFunctions(
  tab: ActiveTab,
  sectionId?: string | null,
  limit = 24,
): FunctionDescriptor[] {
  const all = listFunctions().filter((f) => !f.shell);
  const out: FunctionDescriptor[] = [];
  const seen = new Set<string>();

  const push = (d: FunctionDescriptor) => {
    if (seen.has(d.functionId)) return;
    seen.add(d.functionId);
    out.push(d);
  };

  // Same-tab section functions first
  for (const s of sectionsForTab(tab)) {
    const d = all.find((f) => f.tab === tab && f.sectionId === s.id);
    if (d) push(d);
  }

  // Same-tab top-level
  const top = all.find((f) => f.tab === tab && !f.sectionId);
  if (top) push(top);

  // Peer desk tops (not current)
  for (const t of TABS) {
    if (t.id === tab) continue;
    const d = all.find(
      (f) => f.tab === t.id && !f.sectionId && f.codes.length > 0,
    );
    if (d) push(d);
  }

  // Drop the exact current open if we have many
  const filtered = out.filter((d) => {
    if (!sectionId) return true;
    return !(d.tab === tab && d.sectionId === sectionId);
  });

  return filtered.slice(0, limit);
}

/** Section chips for the red function menu bar (current desk only). */
export function functionMenuSections(tab: ActiveTab): {
  id: string;
  label: string;
  code?: string;
}[] {
  return sectionsForTab(tab).map((s) => {
    const d = listFunctions().find(
      (f) => f.tab === tab && f.sectionId === s.id,
    );
    return {
      id: s.id,
      label: s.short ?? s.label,
      code: d?.codes[0],
    };
  });
}
