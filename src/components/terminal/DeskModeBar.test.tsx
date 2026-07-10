import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { DeskModeBar, deskModeChipClass } from './DeskModeBar';
import { DeskChrome, DeskChromeLabel } from './DeskChrome';

describe('deskModeChipClass', () => {
  it('uses neutral active chip grammar (no brand body text)', () => {
    expect(deskModeChipClass(true)).toContain('bg-secondary');
    expect(deskModeChipClass(true)).toContain('text-foreground');
    expect(deskModeChipClass(true)).not.toContain('text-primary');
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
    expect(smile.className).toContain('bg-secondary');
    expect(smile.className).toContain('text-foreground');
    expect(smile.className).not.toContain('text-primary');
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

  it('sticky default applies frosted stack', () => {
    render(<DeskChrome label="VOL">x</DeskChrome>);
    const el = document.querySelector('[data-desk-chrome]')!;
    expect(el.getAttribute('data-desk-chrome-frosted')).toBe('1');
    expect(el.className).toContain('bg-background/95');
    expect(el.className).toContain('supports-[backdrop-filter]:bg-background/80');
  });

  it('non-sticky consumers can set bg without supports-bg surviving', () => {
    render(
      <DeskChrome label="RATES" sticky={false} className="bg-card/40">
        x
      </DeskChrome>,
    );
    const el = document.querySelector('[data-desk-chrome]')!;
    expect(el.getAttribute('data-desk-chrome-frosted')).toBeNull();
    expect(el.className).toContain('bg-card/40');
    expect(el.className).not.toContain('supports-[backdrop-filter]:bg-background/80');
    expect(el.className).not.toContain('bg-background/95');
  });

  it('transparent embed does not keep frosted bg', () => {
    render(
      <DeskChrome label="MM DESK" sticky={false} className="border-0 bg-transparent p-0">
        x
      </DeskChrome>,
    );
    const el = document.querySelector('[data-desk-chrome]')!;
    expect(el.className).toContain('bg-transparent');
    expect(el.className).not.toContain('supports-[backdrop-filter]:bg-background/80');
  });

  it('DeskChromeLabel matches shared grammar', () => {
    render(<DeskChromeLabel>CRYPTO</DeskChromeLabel>);
    const el = screen.getByText('CRYPTO');
    expect(el.getAttribute('data-desk-chrome-label')).toBe('');
    expect(el.className).toContain('text-muted-foreground');
    expect(el.className).toContain('tracking-wider');
  });

  it('DeskChromeLabel size override uses text-type-* so twMerge drops default', () => {
    render(<DeskChromeLabel className="text-type-sm">BTC DESK</DeskChromeLabel>);
    const el = screen.getByText('BTC DESK');
    expect(el.className).toContain('text-type-sm');
    expect(el.className).not.toContain('text-type-xs');
  });
});
