import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { HistIvStrip } from './HistIvStrip';

describe('HistIvStrip', () => {
  const series = [
    { atmIv: 0.18, timestamp: 1 },
    { atmIv: 0.2, timestamp: 2 },
    { atmIv: 0.16, timestamp: 3 },
    { atmIv: 0.22, timestamp: 4 },
  ];

  it('renders now / high / low from a series', () => {
    render(<HistIvStrip symbol="SPY" series={series} ivRankPct={55} />);
    const strip = screen.getByTestId('hist-iv-strip');
    expect(strip).toBeInTheDocument();
    expect(strip.textContent).toContain('HIVG');
    expect(strip.textContent).toContain('hist ATM IV');
    expect(strip.textContent).toContain('H'); // high
    expect(strip.textContent).toContain('L'); // low
    expect(strip.textContent).toContain('rank');
  });

  it('shows current ATM (no dummy spark) and "buffering" hint when series < 2', () => {
    render(<HistIvStrip symbol="SPY" series={[{ atmIv: 0.19, timestamp: 1 }]} current={0.19} />);
    const strip = screen.getByTestId('hist-iv-strip');
    expect(strip.textContent).toContain('live ring buffering');
    expect(screen.queryByText('H')).toBeNull();
    expect(screen.queryByText('L')).toBeNull();
  });

  it('shows "awaiting live chain" when no series and no current', () => {
    render(<HistIvStrip symbol="SPY" series={[]} />);
    expect(screen.getByTestId('hist-iv-strip').textContent).toContain('awaiting live chain');
  });

  it('shows a buffering hint when no series and no current', () => {
    render(<HistIvStrip symbol="SPY" series={[]} />);
    expect(screen.getByTestId('hist-iv-strip').textContent).toContain('awaiting live chain');
  });

  it('renders the TERM control when onOpenTerm is provided', () => {
    const onOpenTerm = () => {};
    render(<HistIvStrip symbol="SPY" series={series} onOpenTerm={onOpenTerm} />);
    const btn = screen.getByRole('button', { name: /TERM/i });
    expect(btn).toBeInTheDocument();
  });
});
