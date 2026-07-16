import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { SecurityDesCard } from './SecurityDesCard';
import { HistIvStrip } from './HistIvStrip';
import { LaunchpadGrid } from '../terminal/LaunchpadGrid';

describe('W5 home chrome kit', () => {
  it('DES shows print labels and GP spark when path present', () => {
    render(
      <SecurityDesCard
        symbol="SPY"
        spot={500}
        dayChgPct={0.01}
        atmIv={0.18}
        ivRankPct={55}
        gexShort="LONG"
        gexRegimeLabel="Long gamma"
        gexRegimeTone="up"
        nearestDte={7}
        chainLabel="yfinance"
        quotePath={[
          { t: 'a', close: 490 },
          { t: 'b', close: 500 },
          { t: 'c', close: 505 },
        ]}
      />,
    );
    const card = screen.getByTestId('security-des-card');
    expect(card.textContent).toContain('ATM IV');
    expect(card.textContent).toContain('IV rank');
    expect(card.textContent).toContain('GP');
    expect(card.querySelector('svg')).toBeTruthy();
  });

  it('HIVG strip shows denser H/L prints and spark', () => {
    render(
      <HistIvStrip
        symbol="SPY"
        series={[
          { atmIv: 0.16, timestamp: 1 },
          { atmIv: 0.2, timestamp: 2 },
          { atmIv: 0.18, timestamp: 3 },
        ]}
        ivRankPct={40}
      />,
    );
    const strip = screen.getByTestId('hist-iv-strip');
    expect(strip.textContent).toContain('HIVG');
    expect(strip.textContent).toContain('hist ATM IV');
    expect(strip.textContent).toContain('H');
    expect(strip.textContent).toContain('L');
    expect(strip.querySelector('svg')).toBeTruthy();
  });

  it('Launchpad shows LPAD chrome and function codes', () => {
    render(<LaunchpadGrid />);
    const grid = screen.getByTestId('launchpad-grid');
    expect(grid.textContent).toContain('LPAD');
    expect(grid.textContent).toMatch(/SMILE|GEX|TERM|DES|HOME/i);
  });
});
