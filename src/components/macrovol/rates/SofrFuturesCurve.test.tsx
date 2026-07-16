import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SofrFuturesCurve, type SofrCurvePoint } from './SofrFuturesCurve';

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver =
  ResizeObserverStub as unknown as typeof ResizeObserver;

/** Sep24 settled → Dec30 live — matches extended strip pattern */
const EXTENDED_STRIP: SofrCurvePoint[] = [
  { x: 'Sep 24', rate: 4.7665, prior: 4.7665, source: 'settled', contract: 'SR3U4' },
  { x: 'Dec 24', rate: 4.3659, prior: 4.3659, source: 'settled', contract: 'SR3Z4' },
  { x: 'Mar 26', rate: 3.6365, prior: 3.6365, source: 'settled', contract: 'SR3H6' },
  { x: 'Jun 26', rate: 3.6775, prior: 3.6875, source: 'live', contract: 'SR3M6' },
  { x: 'Dec 26', rate: 4.03, prior: 4.07, source: 'live', contract: 'SR3Z6' },
  { x: 'Dec 30', rate: 4.035, prior: 4.07, source: 'live', contract: 'SR3Z0' },
];

describe('SofrFuturesCurve', () => {
  it('renders extended Sep24→Dec30 strip title and dual-path legend', () => {
    render(<SofrFuturesCurve data={EXTENDED_STRIP} />);
    expect(screen.getByText(/3 MONTH SOFR FUTURE · YIELD/i)).toBeTruthy();
    expect(screen.getByText(/Sep24→Dec30/i)).toBeTruthy();
    expect(screen.getByText(/white = live/i)).toBeTruthy();
  });

  it('shows empty state with fewer than 2 points', () => {
    render(<SofrFuturesCurve data={[{ x: 'Jun 26', rate: 3.67 }]} />);
    expect(screen.getByText(/Awaiting live 3M SOFR futures strip/i)).toBeTruthy();
  });

  it('shows Delivery and Yield axis captions', () => {
    render(<SofrFuturesCurve data={EXTENDED_STRIP} />);
    expect(screen.getAllByText('Delivery').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Yield/).length).toBeGreaterThanOrEqual(1);
  });
});
