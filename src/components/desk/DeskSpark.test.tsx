import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { DeskSpark } from './DeskSpark';

describe('DeskSpark', () => {
  it('renders nothing with fewer than 2 points', () => {
    const { container } = render(<DeskSpark values={[1]} />);
    expect(container.querySelector('svg')).toBeNull();
  });

  it('renders polyline for a path', () => {
    const { container } = render(<DeskSpark values={[1, 2, 1.5, 3]} />);
    expect(container.querySelector('svg')).toBeTruthy();
    expect(container.querySelector('polyline')).toBeTruthy();
  });

  it('maps title to aria-label (SVG has no title prop in React types)', () => {
    const { container } = render(
      <DeskSpark values={[1, 2, 3]} title="spot path" />,
    );
    expect(container.querySelector('svg')?.getAttribute('aria-label')).toBe('spot path');
  });
});
