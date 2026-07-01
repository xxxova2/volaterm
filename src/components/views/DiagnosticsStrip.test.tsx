import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { DiagnosticsStrip } from './DiagnosticsStrip';
import type { SVIReadout } from '../../lib/options/surfaceTools';
import type { NoArbResult } from '../../lib/options/noarb';

describe('DiagnosticsStrip', () => {
  it('renders placeholder dashes and a clean badge when both props are null', () => {
    render(<DiagnosticsStrip sviReadout={null} arbResult={null} />);

    const strip = screen.getByTestId('diagnostics-strip');
    expect(strip).toBeInTheDocument();
    expect(strip.getAttribute('data-arb-clean')).toBe('true');

    const rmse = screen.getByTestId('diagnostics-svi-rmse');
    const calendar = screen.getByTestId('diagnostics-calendar');
    const butterfly = screen.getByTestId('diagnostics-butterfly');

    expect(rmse.textContent).toBe('\u2014');
    expect(calendar.textContent).toBe('\u2014');
    expect(butterfly.textContent).toBe('\u2014');

    const badge = screen.getByTestId('diagnostics-arb-badge');
    expect(badge.getAttribute('data-arb-clean')).toBe('true');
    expect(badge.textContent?.toLowerCase()).toContain('clean');
  });

  it('renders SVI RMSE percent, violation counts, and a red badge when arbitrage is present', () => {
    const sviReadout: SVIReadout = {
      expiry: '2024-12-20',
      params: { a: 0.04, b: 0.5, rho: -0.3, m: 0.0, sigma: 0.2 },
      rmse: 0.0123,
      samples: 100,
    };
    const arbResult: NoArbResult = {
      calendar: { flags: [], violations: 2 },
      butterfly: { flags: [], violations: 0 },
      clean: false,
    };

    render(<DiagnosticsStrip sviReadout={sviReadout} arbResult={arbResult} />);

    const strip = screen.getByTestId('diagnostics-strip');
    expect(strip).toBeInTheDocument();

    // RMSE contains "%" because fmtPct formats as a percentage.
    const rmse = screen.getByTestId('diagnostics-svi-rmse');
    expect(rmse.textContent).toMatch(/%/);
    // 0.0123 * 100 = 1.23 → "1.23%"
    expect(rmse.textContent).toContain('1.23');

    // Calendar count is 2 and Butterfly count is 0.
    const calendar = screen.getByTestId('diagnostics-calendar');
    const butterfly = screen.getByTestId('diagnostics-butterfly');
    expect(calendar.textContent).toBe('2');
    expect(butterfly.textContent).toBe('0');

    // Strip and badge reflect the dirty arbitrage state.
    expect(strip.getAttribute('data-arb-clean')).toBe('false');
    const badge = screen.getByTestId('diagnostics-arb-badge');
    expect(badge.getAttribute('data-arb-clean')).toBe('false');
    expect(badge.textContent?.toLowerCase()).toContain('arb');
  });
});
