import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { sectionsForTab, tabLabel, findSectionMeta } from './deskNav';

describe('deskNav', () => {
  it('labels desks', () => {
    expect(tabLabel('rates')).toBe('Macros & Rates');
    expect(tabLabel('vol')).toBe('Vol Structure');
  });

  it('returns rates sections with apis', () => {
    const secs = sectionsForTab('rates');
    expect(secs.length).toBeGreaterThan(5);
    expect(secs.find((s) => s.id === 'sec-stir')?.apis).toContain('yfinance');
    expect(secs.find((s) => s.id === 'sec-dv01')?.label).toMatch(/DV01/i);
  });

  it('finds section meta', () => {
    expect(findSectionMeta('sec-macro', 'rates')?.label).toBe('Macro');
    expect(findSectionMeta('vol-sub-smile', 'vol')?.label).toBe('Smile');
  });
});

describe('jumpDeskSection', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="sec-macro"></div>
      <div id="sec-snapshot"></div>
      <div id="sec-stir"></div>
    `;
    // jsdom may not implement scrollIntoView
    Element.prototype.scrollIntoView = () => {};
  });
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('jumps to next present section', async () => {
    const { jumpDeskSection } = await import('./deskNav');
    const next = jumpDeskSection('rates', 1);
    expect(next).toBeTruthy();
    expect(['sec-macro', 'sec-snapshot', 'sec-stir']).toContain(next!);
  });
});
