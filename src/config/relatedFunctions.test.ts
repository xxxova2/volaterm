import { describe, expect, it } from 'vitest';
import {
  currentFunctionLabel,
  functionMenuSections,
  primaryCodeForTab,
  relatedFunctions,
} from './relatedFunctions';

describe('relatedFunctions', () => {
  it('primaryCodeForTab returns known codes', () => {
    expect(primaryCodeForTab('positioning')).toBe('POS');
    expect(primaryCodeForTab('rates')).toBe('RATES');
    expect(primaryCodeForTab('vol')).toBe('VOL');
  });

  it('relatedFunctions lists same-desk sections first', () => {
    const rel = relatedFunctions('positioning', null);
    expect(rel.length).toBeGreaterThan(3);
    // GEX / dealer should appear
    const codes = rel.flatMap((d) => d.codes);
    expect(codes.some((c) => c === 'GEX' || c === 'DEAL')).toBe(true);
    // Peer desk tops included
    expect(codes).toContain('RATES');
  });

  it('functionMenuSections for rates has STIR mode on red bar', () => {
    const secs = functionMenuSections('rates');
    // Red bar = 4 modes (Funding / UST / STIR / World), not 17 sec-* chips
    expect(secs.some((s) => s.id === 'rates-mode-stir')).toBe(true);
  });

  it('currentFunctionLabel prefers section', () => {
    const r = currentFunctionLabel('vol', 'vol-sub-smile');
    expect(r.code === 'SMILE' || r.label.toLowerCase().includes('smile')).toBe(true);
  });
});
