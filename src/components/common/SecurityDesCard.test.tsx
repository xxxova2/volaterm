import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { SecurityDesCard } from './SecurityDesCard';

describe('SecurityDesCard', () => {
  it('renders summary stats from fixture props', () => {
    render(
      <SecurityDesCard
        symbol="SPY"
        spot={500.25}
        dayChgPct={0.0123}
        atmIv={0.182}
        ivRankPct={62}
        gexShort="LONG"
        gexRegimeLabel="Long gamma"
        gexRegimeTone="up"
        nearestDte={7}
        chainLabel="yfinance"
        quotePath={[{ t: '05-01', close: 480 }, { t: '05-02', close: 495 }]}
      />,
    );

    const card = screen.getByTestId('security-des-card');
    expect(card).toBeInTheDocument();
    expect(card.textContent).toContain('SPY');
    expect(card.textContent).toContain('ATM IV');
    expect(card.textContent).toContain('IV rank');
    expect(card.textContent).toContain('Nearest');
    expect(card.textContent).toContain('GEX');
    expect(card.textContent).toContain('chain');
    expect(card.textContent).toContain('GP');
  });

  it('hides the GP spark when quotePath is empty', () => {
    render(
      <SecurityDesCard
        symbol="QQQ"
        spot={420}
        dayChgPct={-0.02}
        atmIv={0.2}
        ivRankPct={40}
        nearestDte={14}
      />,
    );
    expect(screen.queryByText('GP')).toBeNull();
    expect(screen.queryByText('chain')).toBeNull();
  });

  it('shows dashes for missing numeric fields instead of crashing', () => {
    render(<SecurityDesCard symbol="AAPL" />);
    const card = screen.getByTestId('security-des-card');
    expect(card).toBeInTheDocument();
    expect(card.textContent).toContain('—');
  });
});
