import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DeskField, DeskSelect } from './DeskField';

describe('DeskField', () => {
  it('renders amber input and calls onChange', () => {
    const onChange = vi.fn();
    render(<DeskField label="Drift μ" value={0.1} onChange={onChange} step={0.01} />);
    expect(screen.getByText('Drift μ')).toBeTruthy();
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '0.2' } });
    expect(onChange).toHaveBeenCalled();
  });

  it('renders select options', () => {
    render(
      <DeskSelect
        label="Type"
        value="call"
        onChange={() => {}}
        options={[
          { value: 'call', label: 'Calls' },
          { value: 'put', label: 'Puts' },
        ]}
      />,
    );
    expect(screen.getByText('Type')).toBeTruthy();
    expect(screen.getByDisplayValue('Calls')).toBeTruthy();
  });
});
