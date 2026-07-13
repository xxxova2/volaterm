import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChartZoom } from './ChartZoom';

describe('ChartZoom', () => {
  it('opens expanded view on Zoom click and closes on Esc / outside', () => {
    render(
      <ChartZoom title="Test chart">
        <div data-testid="chart-body">body</div>
      </ChartZoom>,
    );

    expect(screen.getByTestId('chart-body')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /zoom test chart/i }));

    expect(screen.getByRole('dialog', { name: /test chart/i })).toBeInTheDocument();
    // Single mount: children only in the portal while zoomed
    expect(screen.getAllByTestId('chart-body').length).toBe(1);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes when backdrop is clicked', () => {
    render(
      <ChartZoom title="GEX">
        <span>inner</span>
      </ChartZoom>,
    );
    fireEvent.click(screen.getByRole('button', { name: /zoom gex/i }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('can hide the zoom button', () => {
    render(
      <ChartZoom title="Hidden" hideButton>
        <span>x</span>
      </ChartZoom>,
    );
    expect(screen.queryByRole('button', { name: /zoom/i })).not.toBeInTheDocument();
  });
});
