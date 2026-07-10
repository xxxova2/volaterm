import { describe, it, expect, beforeEach } from 'vitest';
import {
  evaluateAlerts,
  loadAlertRules,
  saveAlertRules,
  clearAlertEvents,
  type AlertRule,
} from './alerts';

describe('desk alerts', () => {
  beforeEach(() => {
    localStorage.clear();
    clearAlertEvents();
  });

  it('fires price_above when spot crosses threshold', () => {
    const rules: AlertRule[] = [{
      id: 'r1',
      kind: 'price_above',
      symbol: 'SPY',
      threshold: 500,
      enabled: true,
      cooldownMs: 60_000,
      lastFiredAt: null,
    }];
    saveAlertRules(rules);
    const fired = evaluateAlerts({
      symbol: 'SPY',
      spot: 505,
      ivRankPct: 40,
      totalGex: 1e9,
      gammaFlip: 490,
    }, rules);
    expect(fired.length).toBe(1);
    expect(fired[0]!.message).toMatch(/505/);
  });

  it('respects cooldown', () => {
    const rules: AlertRule[] = [{
      id: 'r1',
      kind: 'price_below',
      symbol: 'SPY',
      threshold: 600,
      enabled: true,
      cooldownMs: 60_000,
      lastFiredAt: Date.now(),
    }];
    const fired = evaluateAlerts({
      symbol: 'SPY',
      spot: 500,
      ivRankPct: null,
      totalGex: null,
      gammaFlip: null,
    }, rules);
    expect(fired.length).toBe(0);
  });

  it('loads default gex_flip rule when empty', () => {
    const r = loadAlertRules();
    expect(r.some((x) => x.kind === 'gex_flip')).toBe(true);
  });
});
