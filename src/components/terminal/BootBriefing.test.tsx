import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BootBriefing } from './BootBriefing';

vi.mock('../../lib/macrovol/api', () => ({
  macrovolApi: {
    ratesSummary: vi.fn(async () => ({
      sofr: 3.58,
      effr: 3.63,
      usy2: 4.19,
      usy10: 4.55,
      spread_2s10s: 0.35,
      spread_3m10y: 0.69,
      as_of: '2026-07-10T00:00:00Z',
    })),
    macroSummary: vi.fn(async () => ({
      cpi_yoy: 2.8,
      core_pce_yoy: 2.6,
      unemployment: 4.2,
      nfp_mom: 120,
    })),
  },
}));

describe('BootBriefing', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows rates/macro basics and allows enter', async () => {
    const onEnter = vi.fn();
    render(<BootBriefing heavyReady={false} onEnter={onEnter} />);

    await waitFor(() => {
      expect(screen.getByText('SOFR')).toBeTruthy();
      expect(screen.getByText(/3\.58%/)).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /enter terminal/i }));
    expect(onEnter).toHaveBeenCalled();
  });

  it('auto-enters when heavyReady after brief delay', async () => {
    const onEnter = vi.fn();
    render(<BootBriefing heavyReady onEnter={onEnter} />);
    await waitFor(() => expect(screen.getByText('SOFR')).toBeTruthy());
    await vi.advanceTimersByTimeAsync(5_000);
    await waitFor(() => expect(onEnter).toHaveBeenCalled());
  });
});
