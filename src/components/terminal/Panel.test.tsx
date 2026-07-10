import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Panel } from './Panel';

describe('Panel', () => {
  it('renders title with density-aware text-panel-title class', () => {
    render(
      <Panel title="Option Chain" subtitle="near ATM">
        <div>body</div>
      </Panel>,
    );
    const heading = screen.getByRole('heading', { name: 'Option Chain' });
    expect(heading.className).toMatch(/text-panel-title/);
    expect(heading.className).toMatch(/font-semibold/);
    expect(screen.getByText('near ATM')).toBeTruthy();
    expect(screen.getByText('body')).toBeTruthy();
  });

  it('renders API sources and as-of next to title', () => {
    render(
      <Panel title="STIR" apis={['FRED']} asOf="12:00:00Z">
        <span>strip</span>
      </Panel>,
    );
    expect(screen.getByRole('heading', { name: 'STIR' }).className).toMatch(/text-panel-title/);
    expect(screen.getByTestId('api-sources')).toBeTruthy();
    expect(screen.getByTitle('As of')).toHaveTextContent('12:00:00Z');
  });
});
