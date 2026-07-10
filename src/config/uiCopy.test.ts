import { describe, it, expect } from 'vitest';
import { UI_COPY } from './uiCopy';

describe('UI_COPY', () => {
  it('exposes LIVE-only load strings', () => {
    expect(UI_COPY.load.chain).toBe('Building chain surface…');
    expect(UI_COPY.load.surface).toBe('Fitting surface…');
    expect(UI_COPY.load.rates).toBe('Loading rates… FRED · NYFed · MacroVol');
    expect(UI_COPY.load.crypto).toBe('Loading crypto books… Deribit');
  });

  it('exposes LIVE-only empty strings without demo CTAs', () => {
    expect(UI_COPY.empty.chain).toMatch(/yfinance\/FMP\/Deribit/);
    expect(UI_COPY.empty.macro).toMatch(/8765/);
    expect(UI_COPY.empty.demo).toMatch(/Refresh LIVE feeds/);
    expect(UI_COPY.empty.apiDown).toMatch(/MacroVol/);
    const joined = Object.values(UI_COPY.empty).join(' ');
    expect(joined.toLowerCase()).not.toMatch(/switch.*demo|toggle live for real/i);
  });
});
