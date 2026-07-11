/**
 * Deep-link section jump after desk mount (sessionStorage desk.jump).
 * Button-mode desks (vol/pos/greeks) use element.click(); rates scrolls into view.
 */

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
 * Apply a section jump against the live DOM (optionally scoped to a root).
 */
export function applyDeskJump(sectionId: string, root: ParentNode = document): boolean {
  const el = resolveElement(sectionId, root);
  if (!el) return false;

  const isSubMode =
    sectionId.startsWith('vol-sub-')
    || sectionId.startsWith('greeks-sub-')
    || sectionId.startsWith('pos-sub-');

  if (isSubMode) {
    el.click();
  } else {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
