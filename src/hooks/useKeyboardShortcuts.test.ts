import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';

function fireKey(init: KeyboardEventInit) {
  window.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, ...init }));
}

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fires bare letter shortcuts', () => {
    const r = vi.fn();
    renderHook(() => useKeyboardShortcuts({ r }));
    fireKey({ key: 'r' });
    expect(r).toHaveBeenCalled();
  });

  it('does not fire bare k when meta is held (Cmd+K isolation)', () => {
    const k = vi.fn();
    const modk = vi.fn();
    renderHook(() => useKeyboardShortcuts({ k, 'mod+k': modk }));
    fireKey({ key: 'k', metaKey: true });
    expect(k).not.toHaveBeenCalled();
    expect(modk).toHaveBeenCalled();
  });

  it('does not fire tab1 when alt is held', () => {
    const tab1 = vi.fn();
    renderHook(() => useKeyboardShortcuts({ tab1 }));
    fireKey({ key: '1', altKey: true });
    expect(tab1).not.toHaveBeenCalled();
  });
});
