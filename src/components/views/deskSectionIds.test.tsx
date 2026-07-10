/**
 * Section registry ids must remain on clickable mode buttons after DeskChrome extraction
 * so jumpDeskSection can .click() them.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { useTerminalStore } from '../../store/terminalStore';
import {
  buildSnapshot,
  buildSurfaceGrid,
} from '../../lib/options/synthetic';
import { sviReadout } from '../../lib/options/surfaceTools';
import { diagnoseArbitrage } from '../../lib/options/noarb';
import {
  VOL_SECTIONS,
  GREEKS_SECTIONS,
  POSITIONING_SECTIONS,
  RATES_SECTIONS,
  jumpDeskSection,
  sectionsForTab,
} from '../../config/deskNav';
import { VolStructureView } from './VolStructureView';
import { GreeksView } from './GreeksView';
import { PositioningView } from './PositioningView';
import { RatesView } from './RatesView';
import { DeskContextBar } from '../terminal/DeskContextBar';

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver =
  ResizeObserverStub as unknown as typeof ResizeObserver;

class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
(globalThis as unknown as { IntersectionObserver: typeof IntersectionObserverStub }).IntersectionObserver =
  IntersectionObserverStub as unknown as typeof IntersectionObserver;

function seedSnapshot() {
  const snapshot = buildSnapshot('SPY', Date.now(), 100, 0, 0);
  const surface = buildSurfaceGrid(snapshot);
  useTerminalStore.setState({
    symbol: 'SPY',
    snapshot,
    surface,
    sviReadout: sviReadout(surface, snapshot.spot),
    arbResult: diagnoseArbitrage(surface, snapshot.spot),
    historicalFrames: [],
    frameIndex: 0,
    isPlaying: false,
    speed: 1,
    source: 'demo',
    liveAvailable: false,
    loading: false,
    lastUpdate: Date.now(),
    activeTab: 'vol',
    displayMode: 'strike',
    selectedExpiry: null,
    playbackInterval: null,
    refreshInterval: null,
    chainAvailable: true,
    chainUsed: 'yfinance',
    lastChainUpdate: Date.now(),
  });
}

describe('desk section ids after DeskChrome extraction', () => {
  beforeEach(() => {
    seedSnapshot();
    Element.prototype.scrollIntoView = () => {};
  });
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('VolStructureView mounts all VOL_SECTIONS button ids', async () => {
    render(<VolStructureView />);
    for (const s of VOL_SECTIONS) {
      const el = document.getElementById(s.id);
      expect(el, s.id).toBeTruthy();
      expect(el!.tagName).toBe('BUTTON');
      expect(el!.getAttribute('data-desk-section')).toBe('1');
    }
    const active = document.getElementById('vol-sub-surface');
    expect(active?.getAttribute('data-desk-section-active')).toBe('1');
    expect(active?.className).toContain('bg-primary/20');
  });

  it('GreeksView mounts all GREEKS_SECTIONS button ids with soft active', () => {
    useTerminalStore.setState({ activeTab: 'greeks' });
    render(<GreeksView />);
    for (const s of GREEKS_SECTIONS) {
      const el = document.getElementById(s.id);
      expect(el, s.id).toBeTruthy();
      expect(el!.tagName).toBe('BUTTON');
    }
    const heat = document.getElementById('greeks-sub-heatmap');
    expect(heat?.getAttribute('data-desk-section-active')).toBe('1');
    expect(heat?.className).toContain('bg-primary/20');
  });

  it('PositioningView mounts all POSITIONING_SECTIONS button ids (dealer default)', () => {
    useTerminalStore.setState({ activeTab: 'positioning' });
    render(<PositioningView />);
    for (const s of POSITIONING_SECTIONS) {
      const el = document.getElementById(s.id);
      expect(el, s.id).toBeTruthy();
      expect(el!.tagName).toBe('BUTTON');
    }
    const dealer = document.getElementById('pos-sub-dealer');
    expect(dealer?.getAttribute('data-desk-section-active')).toBe('1');
    expect(dealer?.className).toContain('bg-primary/20');
  });

  it('RatesView jump chips + section anchors stay in registry', () => {
    useTerminalStore.setState({ activeTab: 'rates' });
    // macrovol correlations fetch — ignore network
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    render(<RatesView />);
    // Section DOM ids (scroll targets)
    expect(document.getElementById('sec-macro')).toBeTruthy();
    // DeskModeBar renders one tab chip per registry entry (not just registry tautology)
    const tabs = screen.getAllByRole('tab');
    expect(tabs.length).toBe(RATES_SECTIONS.length);
    for (const s of RATES_SECTIONS) {
      expect(sectionsForTab('rates').some((x) => x.id === s.id)).toBe(true);
      expect(tabs.some((t) => t.textContent?.includes(s.label) || t.textContent?.includes(s.short ?? ''))).toBe(
        true,
      );
    }
    // Desk chrome label present; non-sticky Rates strip is not frosted
    expect(document.querySelector('[data-desk-chrome-label]')?.textContent).toMatch(/RATES/i);
    const chrome = document.querySelector('[data-desk-chrome]');
    expect(chrome?.getAttribute('data-desk-chrome-frosted')).toBeNull();
    expect(chrome?.className).toContain('bg-card/40');
    expect(chrome?.className).not.toContain('supports-[backdrop-filter]:bg-background/80');
  });

  it('jumpDeskSection .click() switches vol mode', () => {
    render(<VolStructureView />);
    expect(document.getElementById('vol-sub-surface')?.getAttribute('data-desk-section-active')).toBe(
      '1',
    );
    let next: string | null = null;
    act(() => {
      next = jumpDeskSection('vol', 1);
    });
    expect(next).toBe('vol-sub-smile');
    // click handler setSub → soft active moves
    expect(document.getElementById('vol-sub-smile')?.getAttribute('data-desk-section-active')).toBe(
      '1',
    );
  });

  it('DeskContextBar hides [ ] section when tab has no section registry', () => {
    useTerminalStore.setState({ activeTab: 'home' });
    const { rerender } = render(<DeskContextBar />);
    expect(document.body.textContent).not.toMatch(/\[\s*\] section/);

    act(() => {
      useTerminalStore.setState({ activeTab: 'rates' });
    });
    rerender(<DeskContextBar />);
    // sm:flex hides on narrow; still in DOM
    expect(document.body.textContent).toMatch(/\[\s*\] section/);
  });

  it('mode chip click updates active without solid primary fill', () => {
    render(<VolStructureView />);
    fireEvent.click(document.getElementById('vol-sub-term')!);
    const term = document.getElementById('vol-sub-term')!;
    expect(term.getAttribute('data-desk-section-active')).toBe('1');
    expect(term.className).toContain('bg-primary/20');
    expect(term.className).not.toContain('text-primary-foreground');
  });
});
