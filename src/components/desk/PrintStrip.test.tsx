import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { PrintStrip } from './PrintStrip';

describe('PrintStrip', () => {
  it('renders label and value cells', () => {
    render(
      <PrintStrip
        items={[
          { label: 'E[PnL]', value: '+12.3', tone: 'up' },
          { label: 'Win', value: '55%' },
        ]}
      />,
    );
    expect(screen.getByText('E[PnL]')).toBeTruthy();
    expect(screen.getByText('+12.3')).toBeTruthy();
    expect(screen.getByText('Win')).toBeTruthy();
    expect(screen.getByText('55%')).toBeTruthy();
  });
});
