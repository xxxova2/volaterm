import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ShortcutsOverlay } from './ShortcutsOverlay';

describe('ShortcutsOverlay', () => {
  it('lists L as Refresh LIVE feeds (not Live/Demo toggle)', () => {
    render(<ShortcutsOverlay onClose={() => {}} />);
    expect(screen.getByText('Refresh LIVE feeds')).toBeTruthy();
    expect(screen.queryByText(/Toggle Live\/Demo/i)).toBeNull();
    expect(screen.queryByText(/Live\/Demo/i)).toBeNull();
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(<ShortcutsOverlay onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
