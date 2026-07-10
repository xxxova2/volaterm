/**
 * Browser desk alerts — price / IV rank / GEX flip.
 * Rules + fire log in localStorage. No server dependency.
 */

import { classifyGammaRegime } from '../options/gexSession';

export type AlertKind = 'price_above' | 'price_below' | 'iv_rank_above' | 'iv_rank_below' | 'gex_flip';

export interface AlertRule {
  id: string;
  kind: AlertKind;
  symbol: string;
  /** Threshold for price / IV rank (IV rank is 0–100). */
  threshold?: number;
  enabled: boolean;
  /** Cooldown ms after fire (default 15 min). */
  cooldownMs?: number;
  lastFiredAt?: number | null;
}

export interface AlertEvent {
  id: string;
  ruleId: string;
  kind: AlertKind;
  symbol: string;
  message: string;
  at: number;
}

const RULES_KEY = 'desk.alerts.rules';
const EVENTS_KEY = 'desk.alerts.events';
const MAX_EVENTS = 40;

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function loadAlertRules(): AlertRule[] {
  try {
    const raw = localStorage.getItem(RULES_KEY);
    if (!raw) {
      const d = defaultRules('SPY');
      saveAlertRules(d);
      return d;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) {
      const d = defaultRules('SPY');
      saveAlertRules(d);
      return d;
    }
    return parsed;
  } catch {
    const d = defaultRules('SPY');
    try { saveAlertRules(d); } catch { /* ignore */ }
    return d;
  }
}

export function saveAlertRules(rules: AlertRule[]): void {
  try {
    localStorage.setItem(RULES_KEY, JSON.stringify(rules));
  } catch {
    /* ignore */
  }
}

export function defaultRules(symbol: string): AlertRule[] {
  return [
    {
      id: uid(),
      kind: 'gex_flip',
      symbol: symbol.toUpperCase(),
      enabled: true,
      cooldownMs: 15 * 60_000,
      lastFiredAt: null,
    },
  ];
}

export function loadAlertEvents(): AlertEvent[] {
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function pushEvent(ev: AlertEvent): void {
  const all = [ev, ...loadAlertEvents()].slice(0, MAX_EVENTS);
  try {
    localStorage.setItem(EVENTS_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

export function clearAlertEvents(): void {
  try {
    localStorage.removeItem(EVENTS_KEY);
  } catch {
    /* ignore */
  }
}

export interface AlertEvalInput {
  symbol: string;
  spot: number | null;
  ivRankPct: number | null;
  totalGex: number | null;
  gammaFlip: number | null;
}

/**
 * Evaluate rules against latest desk state. Returns newly fired events.
 * Updates lastFiredAt on rules in place and persists.
 */
export function evaluateAlerts(input: AlertEvalInput, rules?: AlertRule[]): AlertEvent[] {
  const list = rules ?? loadAlertRules();
  const now = Date.now();
  const fired: AlertEvent[] = [];
  const sym = input.symbol.toUpperCase();

  for (const rule of list) {
    if (!rule.enabled) continue;
    if (rule.symbol.toUpperCase() !== sym) continue;
    const cool = rule.cooldownMs ?? 15 * 60_000;
    if (rule.lastFiredAt && now - rule.lastFiredAt < cool) continue;

    let message: string | null = null;
    switch (rule.kind) {
      case 'price_above':
        if (input.spot != null && rule.threshold != null && input.spot >= rule.threshold) {
          message = `${sym} spot ${input.spot.toFixed(2)} ≥ ${rule.threshold}`;
        }
        break;
      case 'price_below':
        if (input.spot != null && rule.threshold != null && input.spot <= rule.threshold) {
          message = `${sym} spot ${input.spot.toFixed(2)} ≤ ${rule.threshold}`;
        }
        break;
      case 'iv_rank_above':
        if (input.ivRankPct != null && rule.threshold != null && input.ivRankPct >= rule.threshold) {
          message = `${sym} IV rank ${input.ivRankPct.toFixed(0)}% ≥ ${rule.threshold}`;
        }
        break;
      case 'iv_rank_below':
        if (input.ivRankPct != null && rule.threshold != null && input.ivRankPct <= rule.threshold) {
          message = `${sym} IV rank ${input.ivRankPct.toFixed(0)}% ≤ ${rule.threshold}`;
        }
        break;
      case 'gex_flip': {
        if (input.spot == null || input.gammaFlip == null || input.totalGex == null) break;
        const regime = classifyGammaRegime(input.totalGex, input.spot, input.gammaFlip);
        // Fire when spot is within 0.5% of flip or regime is short-γ unstable
        const dist = Math.abs(input.spot - input.gammaFlip) / input.spot;
        if (dist <= 0.005 || regime.tone === 'down' || regime.tone === 'warn') {
          message = `${sym} GEX ${regime.label} · flip ${input.gammaFlip.toFixed(0)} · spot ${input.spot.toFixed(2)}`;
        }
        break;
      }
      default:
        break;
    }

    if (!message) continue;
    rule.lastFiredAt = now;
    const ev: AlertEvent = {
      id: uid(),
      ruleId: rule.id,
      kind: rule.kind,
      symbol: sym,
      message,
      at: now,
    };
    fired.push(ev);
    pushEvent(ev);
    void notifyBrowser(message);
  }

  if (fired.length) saveAlertRules(list);
  return fired;
}

async function notifyBrowser(body: string): Promise<void> {
  try {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }
    if (Notification.permission === 'granted') {
      // eslint-disable-next-line no-new
      new Notification('Trading Terminal Pro', { body, silent: false });
    }
  } catch {
    /* ignore */
  }
}

export function alertKindLabel(kind: AlertKind): string {
  switch (kind) {
    case 'price_above': return 'Price ≥';
    case 'price_below': return 'Price ≤';
    case 'iv_rank_above': return 'IVR ≥';
    case 'iv_rank_below': return 'IVR ≤';
    case 'gex_flip': return 'GEX flip zone';
    default: return kind;
  }
}
