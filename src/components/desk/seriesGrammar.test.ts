import { describe, it, expect } from 'vitest';
import { DESK_SERIES, DESK_LEGEND } from './seriesGrammar';

describe('seriesGrammar', () => {
  it('exposes legend labels for combo/long/short', () => {
    expect(DESK_LEGEND.combo).toMatch(/combo/i);
    expect(DESK_LEGEND.long).toMatch(/long|buy/i);
    expect(DESK_LEGEND.short).toMatch(/short|sell/i);
    expect(DESK_SERIES.long).not.toBe(DESK_SERIES.short);
  });
});
