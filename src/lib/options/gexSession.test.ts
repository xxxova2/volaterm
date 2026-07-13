import { describe, it, expect, beforeEach } from 'vitest';
import { classifyGammaRegime, buildGexLevels } from './gexSession';

describe('classifyGammaRegime', () => {
  it('long gamma above flip', () => {
    const r = classifyGammaRegime(1e9, 100, 95);
    expect(r.id).toBe('long_gamma');
    expect(r.tone).toBe('up');
  });

  it('short gamma below flip', () => {
    const r = classifyGammaRegime(-1e9, 90, 100);
    expect(r.id).toBe('short_gamma');
    expect(r.tone).toBe('down');
  });

  it('mixed when signs disagree', () => {
    const r = classifyGammaRegime(1e9, 90, 100);
    expect(r.id).toBe('mixed');
  });

  it('unknown without gex', () => {
    expect(classifyGammaRegime(null).id).toBe('unknown');
  });
});

describe('buildGexLevels', () => {
  it('builds sticky pack', () => {
    const lv = buildGexLevels('SPY', 500, {
      totalGEX: 1e8,
      gammaFlip: 495,
      callWall: 510,
      putWall: 480,
      highVolLevel: 505,
    });
    expect(lv?.callWall).toBe(510);
    expect(lv?.highVolLevel).toBe(505);
    expect(lv?.regime.short).toBe('GEX+');
    expect(lv?.aboveFlip).toBe(true);
  });
});
