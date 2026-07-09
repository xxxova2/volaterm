import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { YieldCurveCompare, type CurveComparePoint } from './YieldCurveCompare';

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver =
  ResizeObserverStub as unknown as typeof ResizeObserver;

const SAMPLE: CurveComparePoint[] = [
  { label: '1M', today: 3.67, historical: 4.35, delta_bps: -68 },
  { label: '3M', today: 3.87, historical: 4.42, delta_bps: -55 },
  { label: '2Y', today: 4.21, historical: 3.88, delta_bps: 33 },
  { label: '10Y', today: 4.56, historical: 4.35, delta_bps: 21 },
  { label: '30Y', today: 5.06, historical: 4.86, delta_bps: 20 },
];

describe('YieldCurveCompare', () => {
  it('renders dual-curve title for today vs last year', () => {
    render(
      <YieldCurveCompare
        points={SAMPLE}
        todayAsOf="2026-07-09"
        compareAsOf="2025-07-03"
        source="FRED (9/9)"
      />,
    );
    expect(screen.getByText(/UST YIELD CURVE · TODAY VS LAST YEAR/i)).toBeTruthy();
    expect(screen.getByText(/white = live/i)).toBeTruthy();
  });

  it('shows empty state when fewer than 2 points', () => {
    render(<YieldCurveCompare points={[{ label: '10Y', today: 4.5, historical: null }]} />);
    expect(screen.getByText(/Awaiting FRED UST curve/i)).toBeTruthy();
  });

  it('renders tenor delta strip from live vs historical', () => {
    render(
      <YieldCurveCompare
        points={SAMPLE}
        todayAsOf="2026-07-09"
        compareAsOf="2025-07-03"
      />,
    );
    // 1M down 68bp from last year
    expect(screen.getByText(/1M/)).toBeTruthy();
    expect(screen.getByText(/-68bp/)).toBeTruthy();
  });
});
