import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { DeskToolShell } from './DeskToolShell';
import { PrintStrip } from './PrintStrip';

describe('DeskToolShell', () => {
  it('lays out controls, print strip, and body', () => {
    render(
      <DeskToolShell
        controls={<span>CTRL</span>}
        print={<PrintStrip items={[{ label: 'X', value: '1' }]} />}
      >
        <div>BODY</div>
      </DeskToolShell>,
    );
    expect(screen.getByText('CTRL')).toBeTruthy();
    expect(screen.getByText('X')).toBeTruthy();
    expect(screen.getByText('BODY')).toBeTruthy();
  });
});
