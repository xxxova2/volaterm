import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { DeskChartFrame, deskAxisLabel } from './DeskChart';

describe('DeskChart', () => {
  it('renders black frame with axis title captions', () => {
    render(
      <DeskChartFrame xTitle="Days" yTitle="PnL ($)" height={120}>
        <div data-testid="plot">plot</div>
      </DeskChartFrame>,
    );
    expect(screen.getByText(/PnL/)).toBeTruthy();
    expect(screen.getByText(/Days/)).toBeTruthy();
    expect(screen.getByTestId('plot')).toBeTruthy();
  });

  it('deskAxisLabel builds Recharts label props', () => {
    const lab = deskAxisLabel('Spot');
    expect(lab.value).toBe('Spot');
    expect(lab.position).toBeTruthy();
  });
});
