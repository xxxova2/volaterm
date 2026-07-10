import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { DeskModeBar, deskModeChipClass } from './DeskModeBar';
import { DeskChrome, DeskChromeLabel } from './DeskChrome';

describe('deskModeChipClass', () => {
  it('uses soft primary active grammar', () => {
    expect(deskModeChipClass(true)).toContain('bg-primary/20');
    expect(deskModeChipClass(true)).toContain('text-primary');
    expect(deskModeChipClass(true)).not.toContain('bg-primary text-primary-foreground');
    expect(deskModeChipClass(false)).toContain('text-muted-foreground');
  });
});

describe('DeskModeBar', () => {
  const items = [
    { id: 'vol-sub-surface', label: 'Surface', short: 'Surf' },
    { id: 'vol-sub-smile', label: 'Smile', short: 'Smile' },
  ];

  it('renders section button ids for jumpDeskSection .click()', () => {
    render(
      <DeskModeBar
        items={items}
        activeId="vol-sub-surface"
        onSelect={() => {}}
        asSectionButtons
      />,
    );
    const surface = document.getElementById('vol-sub-surface');
    const smile = document.getElementById('vol-sub-smile');
    expect(surface).toBeTruthy();
    expect(smile).toBeTruthy();
    expect(surface?.getAttribute('data-desk-section')).toBe('1');
    expect(surface?.getAttribute('data-desk-section-active')).toBe('1');
    expect(smile?.getAttribute('data-desk-section-active')).toBeNull();
  });

  it('applies soft active classes on the active chip', () => {
    render(
      <DeskModeBar
        items={items}
        activeId="vol-sub-smile"
        onSelect={() => {}}
        asSectionButtons
      />,
    );
    const smile = document.getElementById('vol-sub-smile')!;
    expect(smile.className).toContain('bg-primary/20');
    expect(smile.className).toContain('text-primary');
    expect(smile.className).not.toMatch(/bg-primary\s/);
  });

  it('fires onSelect when clicked (jump path)', () => {
    const onSelect = vi.fn();
    render(
      <DeskModeBar
        items={items}
        activeId="vol-sub-surface"
        onSelect={onSelect}
        asSectionButtons
      />,
    );
    fireEvent.click(document.getElementById('vol-sub-smile')!);
    expect(onSelect).toHaveBeenCalledWith('vol-sub-smile');
  });

  it('does not set registry ids when asSectionButtons is false', () => {
    render(
      <DeskModeBar
        items={[{ id: 'sec-macro', label: 'Macro' }]}
        activeId="sec-macro"
        onSelect={() => {}}
      />,
    );
    expect(document.getElementById('sec-macro')).toBeNull();
    expect(screen.getByRole('tab', { name: 'Macro' })).toBeInTheDocument();
  });
});

describe('DeskChrome', () => {
  it('renders label and trailing slot', () => {
    render(
      <DeskChrome label="VOL STRUCTURE" trailing={<span data-testid="trail">live</span>}>
        <button type="button">Surface</button>
      </DeskChrome>,
    );
    expect(screen.getByText('VOL STRUCTURE')).toBeInTheDocument();
    expect(screen.getByTestId('trail')).toBeInTheDocument();
    expect(document.querySelector('[data-desk-chrome]')).toBeTruthy();
  });

  it('DeskChromeLabel matches shared grammar', () => {
    render(<DeskChromeLabel>CRYPTO</DeskChromeLabel>);
    const el = screen.getByText('CRYPTO');
    expect(el.getAttribute('data-desk-chrome-label')).toBe('');
    expect(el.className).toContain('text-primary');
    expect(el.className).toContain('tracking-wider');
  });
});
