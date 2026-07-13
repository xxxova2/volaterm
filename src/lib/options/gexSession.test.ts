import { describe, it, expect, beforeEach } from 'vitest';
import {
  classifyGammaRegime,
  buildGexLevels,
  recordGexSession,
  loadGexSession,
} from './gexSession';

describe('classifyGammaRegime', () => {
  it('customer GEX+ (call-heavy) → dealer short-γ amplify', () => {
    const r = classifyGammaRegime(1e9, 100, 95);
    expect(r.id).toBe('short_gamma');
    expect(r.tone).toBe('down');
    expect(r.short).toBe('GEX+');
  });

  it('customer GEX− (put-heavy) → dealer long-γ dampen', () => {
    const r = classifyGammaRegime(-1e9, 90, 100);
    expect(r.id).toBe('long_gamma');
    expect(r.tone).toBe('up');
    expect(r.short).toBe('GEX−');
  });

  it('mixed when customer sign and flip disagree', () => {
    // GEX+ but below flip
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
    expect(lv?.regime.id).toBe('short_gamma');
    expect(lv?.aboveFlip).toBe(true);
  });
});

describe('recordGexSession charm profiles', () => {
  beforeEach(() => {
    try {
      localStorage.clear();
    } catch {
      /* ignore */
    }
  });

  it('stores gex + charm profiles via opts object', () => {
    const s = recordGexSession('SPY', 500, 1e9, 495, {
      minGapMs: 0,
      profile: [{ k: 500, g: 1e6 }, { k: 510, g: -2e6 }],
      charmProfile: [{ k: 500, g: 3e5 }, { k: 490, g: -1e5 }],
      totalCharm: 2e5,
    });
    expect(s.points.length).toBeGreaterThanOrEqual(1);
    const last = s.points[s.points.length - 1]!;
    expect(last.profile?.some((p) => p.k === 500)).toBe(true);
    expect(last.charmProfile?.some((p) => p.k === 490)).toBe(true);
    expect(last.totalCharm).toBe(2e5);
    const loaded = loadGexSession('SPY');
    expect(loaded?.points.length).toBeGreaterThanOrEqual(1);
  });

  it('keeps legacy (minGapMs, profile) call signature', () => {
    const s = recordGexSession('QQQ', 400, -1e8, null, 0, [{ k: 400, g: 1 }]);
    expect(s.points[0]?.profile?.[0]?.k).toBe(400);
  });
});
