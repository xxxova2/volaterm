/**
 * Deep-link section jump after desk mount (sessionStorage desk.jump).
 * Button-mode desks (vol/pos/greeks) and scroll desks (rates) all resolve to a
 * single store value via setDeskSection — no DOM .click() needed.
 */

import { useTerminalStore } from '../../store/terminalStore';

export const DESK_JUMP_KEY = 'desk.jump';

function resolveElement(sectionId: string, root: ParentNode = document): HTMLElement | null {
  if (root === document || root instanceof Document) {
    return (root as Document).getElementById(sectionId);
  }
  try {
    return (root as Element).querySelector(`#${CSS.escape(sectionId)}`);
  } catch {
    return (root as Element).querySelector(`[id="${sectionId}"]`);
  }
}

/**
 * Apply a section jump: set the store's active desk section (which both the
 * red function bar and the desk view subscribe to). For non-sub-mode sections
 * (rates sections), also scroll the matching element into view.
 */
export function applyDeskJump(sectionId: string, root: ParentNode = document): boolean {
  useTerminalStore.getState().setDeskSection(sectionId);

  const isSubMode =
    sectionId.startsWith('vol-sub-')
    || sectionId.startsWith('greeks-sub-')
    || sectionId.startsWith('pos-sub-');

  if (!isSubMode) {
    const el = resolveElement(sectionId, root);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return !!el;
  }
  return true;
}

/** Write jump intent for the next desk mount. */
export function setDeskJump(sectionId: string): void {
  try {
    sessionStorage.setItem(DESK_JUMP_KEY, sectionId);
  } catch {
    /* private mode */
  }
}

/**
 * Consume sessionStorage desk.jump after mount (80ms for DOM paint).
 * Call from desk view useEffect([]).
 */
export function consumeDeskJumpOnMount(root?: ParentNode, delayMs = 80): () => void {
  let jump: string | null = null;
  try {
    jump = sessionStorage.getItem(DESK_JUMP_KEY);
    if (jump) sessionStorage.removeItem(DESK_JUMP_KEY);
  } catch {
    return () => {};
  }
  if (!jump) return () => {};

  const t = window.setTimeout(() => {
    applyDeskJump(jump!, root ?? document);
  }, delayMs);
  return () => clearTimeout(t);
}
