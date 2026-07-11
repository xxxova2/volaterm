import { describe, it, expect, beforeEach, vi } from 'vitest';
import { applyDeskJump, setDeskJump, DESK_JUMP_KEY, consumeDeskJumpOnMount } from './deskJump';

describe('deskJump', () => {
  beforeEach(() => {
    sessionStorage.clear();
    document.body.innerHTML = '';
  });

  it('setDeskJump writes session key', () => {
    setDeskJump('sec-stir');
    expect(sessionStorage.getItem(DESK_JUMP_KEY)).toBe('sec-stir');
  });

  it('applyDeskJump clicks sub-mode buttons', () => {
    const btn = document.createElement('button');
    btn.id = 'pos-sub-levels';
    const click = vi.fn();
    btn.click = click;
    document.body.appendChild(btn);
    expect(applyDeskJump('pos-sub-levels')).toBe(true);
    expect(click).toHaveBeenCalled();
  });

  it('applyDeskJump scrolls rates sections', () => {
    const sec = document.createElement('section');
    sec.id = 'sec-macro';
    sec.scrollIntoView = vi.fn();
    document.body.appendChild(sec);
    expect(applyDeskJump('sec-macro')).toBe(true);
    expect(sec.scrollIntoView).toHaveBeenCalled();
  });

  it('consumeDeskJumpOnMount clears key and applies after delay', () => {
    vi.useFakeTimers();
    const sec = document.createElement('section');
    sec.id = 'sec-fx';
    sec.scrollIntoView = vi.fn();
    document.body.appendChild(sec);
    setDeskJump('sec-fx');
    const cleanup = consumeDeskJumpOnMount(document, 80);
    expect(sessionStorage.getItem(DESK_JUMP_KEY)).toBeNull();
    vi.advanceTimersByTime(80);
    expect(sec.scrollIntoView).toHaveBeenCalled();
    cleanup();
    vi.useRealTimers();
  });
});
