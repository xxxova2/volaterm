/**
 * Section registry ids must remain the single source of truth for desk sections
 * so jumpDeskSection / red function bar / deep-links all drive one store value.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
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

function seedSnapshot(tab: 'vol' | 'greeks' | 'positioning' | 'rates' = 'vol') {
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
    activeTab: tab,
    displayMode: 'strike',
    selectedExpiry: null,
    playbackInterval: null,
    refreshInterval: null,
    chainAvailable: true,
    chainUsed: 'yfinance',
    lastChainUpdate: Date.now(),
  });
}

describe('desk section ids are store-driven (no duplicate in-view bars)', () => {
  beforeEach(() => {
    seedSnapshot();
    Element.prototype.scrollIntoView = () => {};
  });
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('VolStructureView renders with VOL_SECTIONS in registry; active from store', () => {
    useTerminalStore.setState({ activeTab: 'vol', deskSectionId: 'vol-sub-surface' });
    render(<VolStructureView />);
    for (const s of VOL_SECTIONS) {
      expect(sectionsForTab('vol').some((x) => x.id === s.id)).toBe(true);
    }
    expect(useTerminalStore.getState().deskSectionId).toBe('vol-sub-surface');
  });

  it('GreeksView registry is Desk + IV (G1.0 shell)', () => {
    useTerminalStore.setState({ activeTab: 'greeks', deskSectionId: 'greeks-desk' });
    render(<GreeksView />);
    expect(GREEKS_SECTIONS.map((s) => s.id)).toEqual(['greeks-desk', 'greeks-iv']);
    for (const s of GREEKS_SECTIONS) {
      expect(sectionsForTab('greeks').some((x) => x.id === s.id)).toBe(true);
    }
    expect(useTerminalStore.getState().deskSectionId).toBe('greeks-desk');
  });

  it('PositioningView registry + store section (dealer default)', () => {
    useTerminalStore.setState({ activeTab: 'positioning', deskSectionId: 'pos-sub-dealer' });
    render(<PositioningView />);
    for (const s of POSITIONING_SECTIONS) {
      expect(sectionsForTab('positioning').some((x) => x.id === s.id)).toBe(true);
    }
    expect(useTerminalStore.getState().deskSectionId).toBe('pos-sub-dealer');
  });

  it('RatesView sections stay in registry; no DeskSubNav duplicate bar', () => {
    useTerminalStore.setState({ activeTab: 'rates' });
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    render(<RatesView />);
    // Section anchors still render as scroll targets
    expect(document.getElementById('sec-macro')).toBeTruthy();
    // No in-view DeskModeBar/DeskSubNav duplicate of the red bar
    expect(screen.queryByRole('tab')).toBeNull();
    expect(RATES_SECTIONS.length).toBe(sectionsForTab('rates').length);
    // Desk chrome label present; non-sticky Rates strip is not frosted
    expect(document.querySelector('[data-desk-chrome-label]')?.textContent).toMatch(/RATES/i);
    const chrome = document.querySelector('[data-desk-chrome]');
    expect(chrome?.getAttribute('data-desk-chrome-frosted')).toBeNull();
    expect(chrome?.className).toContain('bg-card/40');
    expect(chrome?.className).not.toContain('supports-[backdrop-filter]:bg-background/80');
  });

  it('jumpDeskSection sets store section (vol)', () => {
    useTerminalStore.setState({ activeTab: 'vol', deskSectionId: 'vol-sub-surface' });
    render(<VolStructureView />);
    let next: string | null = null;
    act(() => {
      next = jumpDeskSection('vol', 1);
    });
    expect(next).toBe('vol-sub-smile');
    expect(useTerminalStore.getState().deskSectionId).toBe('vol-sub-smile');
  });

  it('DeskContextBar hides [ ] section when tab has no section registry', () => {
    useTerminalStore.setState({ activeTab: 'home' });
    const { rerender } = render(<DeskContextBar />);
    expect(document.body.textContent).not.toMatch(/\[\s*\] section/);

    act(() => {
      useTerminalStore.setState({ activeTab: 'rates' });
    });
    rerender(<DeskContextBar />);
    expect(document.body.textContent).toMatch(/\[\s*\] section/);
  });

  it('setDeskSection clears when id not in current tab registry', () => {
    useTerminalStore.setState({ activeTab: 'vol', deskSectionId: 'vol-sub-surface' });
    act(() => {
      useTerminalStore.getState().setDeskSection('sec-macro');
    });
    expect(useTerminalStore.getState().deskSectionId).toBeNull();
  });
});
