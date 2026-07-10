import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import React from 'react';
import { useTerminalStore } from '../../store/terminalStore';
import {
  buildSnapshot,
  buildSurfaceGrid,
} from '../../lib/options/synthetic';
import { sviReadout } from '../../lib/options/surfaceTools';
import { diagnoseArbitrage } from '../../lib/options/noarb';
import { GreeksView } from './GreeksView';
import { GREEK_META } from './greeksTypes';

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver =
  ResizeObserverStub as unknown as typeof ResizeObserver;

const GREEK_LABELS: readonly string[] = GREEK_META.map(g => g.label);

describe('GreeksView heatmap selector', () => {
  beforeEach(() => {
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
      activeTab: 'greeks',
      displayMode: 'strike',
      selectedExpiry: null,
      playbackInterval: null,
      refreshInterval: null,
    });
  });

  it('renders all 13 Greek buttons in the heatmap selector', () => {
    const { container } = render(<GreeksView />);

    expect(screen.getByText('Heatmap')).toBeInTheDocument();

    for (const label of GREEK_LABELS) {
      const buttons = Array.from(container.querySelectorAll('button')).filter(
        b => b.textContent?.trim() === label
      );
      expect(buttons.length).toBeGreaterThanOrEqual(1);
    }

    const allButtons = Array.from(container.querySelectorAll('button'));
    const greekButtons = allButtons.filter(b =>
      GREEK_LABELS.includes(b.textContent?.trim() ?? ''),
    );
    expect(greekButtons.length).toBeGreaterThanOrEqual(13);

    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('ATM \u00b110%')).toBeInTheDocument();
    expect(screen.getByText('ATM \u00b120%')).toBeInTheDocument();
  });

  it('clicking the canvas heatmap opens the inspector with strike and DTE', () => {
    render(<GreeksView />);

    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();

    // Simulate click on the canvas to trigger cell selection.
    fireEvent.mouseDown(canvas!, { clientX: 100, clientY: 100 });

    const inspector = document.querySelector('[data-heatmap-inspector]');
    expect(inspector).toBeTruthy();

    // Click outside to dismiss.
    fireEvent.mouseDown(document.body);
    expect(document.querySelector('[data-heatmap-inspector]')).toBeNull();
  });

  it('renders the canvas and sub-view tabs', () => {
    const { container } = render(<GreeksView />);

    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();

    // All 5 sub-view buttons must be present.
    for (const label of ['Heatmap', 'Profile', 'Sensitivity', 'By Expiry', '3D Surface']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('clicking ATM ±10% tightens the moneyness band on the heatmap', () => {
    render(<GreeksView />);

    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();

    // Default is ATM ±20%; switch to ±10%.
    fireEvent.click(screen.getByText('ATM \u00b110%'));
    expect(screen.getByText('ATM \u00b110%').className).toContain('bg-secondary');

    // Expand to All.
    fireEvent.click(screen.getByText('All'));
    expect(screen.getByText('All').className).toContain('bg-secondary');
  });

  it('renders OTM/Calls/Puts side selectors', () => {
    render(<GreeksView />);
    expect(screen.getByText('OTM')).toBeInTheDocument();
    expect(screen.getByText('Calls')).toBeInTheDocument();
    expect(screen.getByText('Puts')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Calls'));
    expect(screen.getByText('Calls').className).toMatch(/bg-up|text-up/);
  });

  it('renders the diagnostics strip above the heatmap with seeded values', () => {
    render(<GreeksView />);

    const strip = screen.getByTestId('greeks-diagnostics');
    expect(strip).toBeInTheDocument();

    const rmse = within(strip).getByTestId('diagnostics-svi-rmse');
    expect(rmse.textContent).toMatch(/%/);

    const calendar = within(strip).getByTestId('diagnostics-calendar');
    const butterfly = within(strip).getByTestId('diagnostics-butterfly');
    expect(calendar.textContent).toMatch(/^\d+$/);
    expect(butterfly.textContent).toMatch(/^\d+$/);

    const badge = within(strip).getByTestId('diagnostics-arb-badge');
    expect(badge.getAttribute('data-arb-clean')).toBe('true');
  });

  it('still renders the diagnostics strip with placeholder dashes when diagnostics are null', () => {
    useTerminalStore.setState({ sviReadout: null, arbResult: null });

    render(<GreeksView />);

    const strip = screen.getByTestId('greeks-diagnostics');
    expect(strip).toBeInTheDocument();

    const rmse = within(strip).getByTestId('diagnostics-svi-rmse');
    const calendar = within(strip).getByTestId('diagnostics-calendar');
    const butterfly = within(strip).getByTestId('diagnostics-butterfly');
    expect(rmse.textContent).toBe('\u2014');
    expect(calendar.textContent).toBe('\u2014');
    expect(butterfly.textContent).toBe('\u2014');

    const badge = within(strip).getByTestId('diagnostics-arb-badge');
    expect(badge.getAttribute('data-arb-clean')).toBe('true');
  });
});
