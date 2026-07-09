import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { classifyFreshness, FreshnessChip, formatRelative } from './Freshness';

describe('classifyFreshness', () => {
  it('marks fresh timestamps live', () => {
    const iso = new Date().toISOString();
    expect(classifyFreshness(iso, { delayedMin: 15, staleMin: 30 })).toBe('live');
  });

  it('defaults stale at 30m (DataBadge alignment)', () => {
    const iso = new Date(Date.now() - 45 * 60_000).toISOString();
    expect(classifyFreshness(iso)).toBe('stale');
  });

  it('marks missing as unknown', () => {
    expect(classifyFreshness(null)).toBe('unknown');
  });

  it('marks demo and down overrides', () => {
    expect(classifyFreshness(new Date().toISOString(), { demo: true })).toBe('demo');
    expect(classifyFreshness(undefined, { down: true })).toBe('down');
  });

  it('formats relative time', () => {
    const iso = new Date(Date.now() - 90_000).toISOString();
    expect(formatRelative(iso)).toMatch(/m ago|s ago/);
  });
});

describe('FreshnessChip', () => {
  it('renders LIVE label', () => {
    render(<FreshnessChip kind="live" />);
    expect(screen.getByText('LIVE')).toBeInTheDocument();
  });
});
