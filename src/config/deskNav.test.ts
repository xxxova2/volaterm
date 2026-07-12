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
    expect(secs.find((s) => s.id === 'sec-japan')?.label).toMatch(/Japan/i);
    expect(secs.find((s) => s.id === 'sec-fx')?.apis).toContain('Frankfurter');
    expect(secs.find((s) => s.id === 'sec-auctions')?.apis).toContain('FiscalData');
    expect(secs.find((s) => s.id === 'sec-global')?.apis).toContain('FRED');
    expect(secs.find((s) => s.id === 'sec-dv01')).toBeUndefined();
  });

  it('positioning includes strategy section', () => {
    const secs = sectionsForTab('positioning');
    expect(secs.find((s) => s.id === 'pos-sub-strategy')?.label).toMatch(/Strategy/i);
  });

  it('finds section meta', () => {
    expect(findSectionMeta('sec-macro', 'rates')?.label).toBe('US Macro');
    expect(findSectionMeta('sec-mm-strip', 'rates')?.label).toMatch(/Money/i);
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
    Element.prototype.scrollIntoView = () => {};
  });
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('jumps to next rates section via store', async () => {
    const { jumpDeskSection, useTerminalStore } = await import('./deskNav');
    const store = await import('../store/terminalStore');
    store.useTerminalStore.setState({ activeTab: 'rates', deskSectionId: 'sec-macro' });
    const next = jumpDeskSection('rates', 1);
    expect(next).toBeTruthy();
    expect(store.useTerminalStore.getState().deskSectionId).toBe(next);
  });

  it('sets store section for vol-sub mode buttons when jumping', async () => {
    const { jumpDeskSection } = await import('./deskNav');
    const store = await import('../store/terminalStore');
    store.useTerminalStore.setState({ activeTab: 'vol', deskSectionId: 'vol-sub-surface' });
    const next = jumpDeskSection('vol', 1);
    expect(next).toBe('vol-sub-smile');
    expect(store.useTerminalStore.getState().deskSectionId).toBe('vol-sub-smile');
  });
});
