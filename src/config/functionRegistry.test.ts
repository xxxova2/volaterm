import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  resolveFunctionId,
  searchFunctions,
  openFunction,
  listFunctions,
} from './functionRegistry';
import { DESK_JUMP_KEY } from '../lib/market/deskJump';

vi.mock('../store/terminalStore', () => {
  const state = {
    setActiveTab: vi.fn(),
    setSymbol: vi.fn(),
    setDeskContext: vi.fn(),
  };
  return {
    useTerminalStore: Object.assign(() => state, {
      getState: () => state,
    }),
  };
});

describe('functionRegistry', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it('maps GEX and SOFR codes to exact functionIds', () => {
    expect(resolveFunctionId('GEX')?.functionId).toBe('positioning:pos-sub-dealer');
    expect(resolveFunctionId('SOFR')?.functionId).toBe('rates:sec-stir');
    expect(resolveFunctionId('SMILE')?.functionId).toBe('vol:vol-sub-smile');
    expect(resolveFunctionId('3D')?.heavy).toBe(true);
  });

  it('openFunction writes desk.jump and setActiveTab', async () => {
    const { useTerminalStore } = await import('../store/terminalStore');
    const r = openFunction('GEX');
    expect(r.ok).toBe(true);
    expect(sessionStorage.getItem(DESK_JUMP_KEY)).toBe('pos-sub-dealer');
    expect(useTerminalStore.getState().setActiveTab).toHaveBeenCalledWith('positioning');
  });

  it('searchFunctions finds SOFR', () => {
    const hits = searchFunctions('sofr');
    expect(hits.some((h) => h.codes.includes('SOFR'))).toBe(true);
  });

  it('listFunctions includes all tabs', () => {
    const ids = listFunctions().map((f) => f.functionId);
    expect(ids).toContain('home');
    expect(ids).toContain('rates');
    expect(ids).toContain('positioning:pos-sub-levels');
  });
});
