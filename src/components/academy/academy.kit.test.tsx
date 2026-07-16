import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MarkdownArticle } from './MarkdownArticle';
import { GlossaryPanel } from './GlossaryPanel';
import { AcademyNews } from './AcademyNews';

vi.mock('../../lib/data/finnhubClient', () => ({
  fetchFinnhubNews: vi.fn(async () => ({
    items: [
      {
        id: 1,
        headline: 'Vol market opens quiet',
        source: 'Desk Wire',
        datetime: 1_700_000_000,
        url: 'https://example.com/a',
      },
    ],
    error: null,
  })),
  fetchFinnhubEarnings: vi.fn(async () => ({
    next: { date: '2026-08-01', hour: 'amc', eps_estimate: 1.2 },
  })),
}));

vi.mock('../../lib/macrovol/api', () => ({
  macrovolApi: {
    secContext: vi.fn(async () => ({
      filings: [{ form: '10-Q', filing_date: '2026-05-01', url: 'https://example.com/sec' }],
    })),
  },
}));

describe('W6 Academy publication kit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('MarkdownArticle renders prose with academy-md classes', () => {
    render(
      <MarkdownArticle
        markdown={`# Title\n\nHello **world** and \`delta\`.\n\n## Section\n\n- one\n- two\n`}
        docPath="/docs/academy/demo.md"
        skipFirstH1
      />,
    );
    const root = screen.getByTestId('academy-md');
    expect(root.className).toContain('academy-md');
    expect(root.querySelector('.academy-md-h2')?.textContent).toBe('Section');
    expect(root.querySelector('.academy-md-p')?.textContent).toMatch(/Hello/);
    expect(root.querySelector('.academy-md-code')?.textContent).toBe('delta');
    expect(root.querySelector('.academy-md-ul')).toBeTruthy();
  });

  it('GlossaryPanel uses publication search and term rows', () => {
    render(
      <GlossaryPanel
        entries={[
          { term: 'Gamma', definition: 'Second derivative of price.', category: 'options' },
          { term: 'SOFR', definition: 'Secured overnight financing rate.', category: 'macro' },
        ]}
      />,
    );
    const panel = screen.getByTestId('academy-glossary');
    expect(panel.querySelector('.academy-glossary-search')).toBeTruthy();
    expect(panel.textContent).toContain('Gamma');
    expect(panel.textContent).toContain('SOFR');
    expect(panel.textContent).toMatch(/Options & Greeks/);
  });

  it('AcademyNews uses Board badge not Live and academy news chrome', async () => {
    render(<AcademyNews symbol="SPY" />);
    const root = await screen.findByTestId('academy-news');
    expect(root.textContent).toMatch(/Board · SPY/);
    expect(root.textContent).not.toMatch(/\bLive\b/);
    expect(root.querySelector('.academy-section-h')?.textContent).toMatch(/News/);
    expect(await screen.findByText('Vol market opens quiet')).toBeTruthy();
    expect(root.querySelector('.academy-news-list')).toBeTruthy();
  });
});
