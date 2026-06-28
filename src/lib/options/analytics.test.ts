/**
 * Tests for options analytics functions
 */

import { describe, it, expect } from 'vitest';
import {
  portfolioGreeks,
  impliedMove,
  maxPainStrike,
  gammaExposure,
  ivRank,
} from './analytics';
import type { VolSnapshot } from './types';

describe('Portfolio Greeks', () => {
  it('should calculate portfolio Greeks correctly', () => {
    const snapshot: VolSnapshot = {
      symbol: 'TEST',
      spot: 100,
      riskFreeRate: 0.05,
      dividendYield: 0.01,
      timestamp: Date.now(),
      expiries: [
        {
          expiry: '2024-01-01',
          dte: 30,
          atmIV: 0.2,
          calls: [
            {
              strike: 100,
              expiry: '2024-01-01',
              type: 'call',
              bid: 2.0,
              ask: 2.5,
              last: 2.25,
              mid: 2.25,
              iv: 0.2,
              delta: 0.5,
              gamma: 0.1,
              theta: -0.05,
              vega: 0.3,
              vanna: 0.02,
              charm: -0.01,
              volga: 0.05,
              speed: -0.01,
              rho: 0.1,
              veta: -0.02,
              color: -0.01,
              zomma: 0.02,
              ultima: -0.01,
              openInterest: 1000,
              volume: 500,
            },
          ],
          puts: [],
        },
      ],
    };

    const greeks = portfolioGreeks(snapshot);
    
    expect(greeks.delta).toBeCloseTo(0.5, 4);
    expect(greeks.gamma).toBeCloseTo(0.1, 4);
    expect(greeks.theta).toBeCloseTo(-0.05, 4);
    expect(greeks.vega).toBeCloseTo(0.3, 4);
  });

  it('should handle empty snapshots', () => {
    const snapshot: VolSnapshot = {
      symbol: 'TEST',
      spot: 100,
      riskFreeRate: 0.05,
      dividendYield: 0.01,
      timestamp: Date.now(),
      expiries: [],
    };

    const greeks = portfolioGreeks(snapshot);
    
    expect(greeks.delta).toBe(0);
    expect(greeks.gamma).toBe(0);
    expect(greeks.theta).toBe(0);
    expect(greeks.vega).toBe(0);
  });
});

describe('Implied Move', () => {
  it('should calculate implied move from straddle', () => {
    const snapshot: VolSnapshot = {
      symbol: 'TEST',
      spot: 100,
      riskFreeRate: 0.05,
      dividendYield: 0.01,
      timestamp: Date.now(),
      expiries: [
        {
          expiry: '2024-01-01',
          dte: 30,
          atmIV: 0.2,
          calls: [
            {
              strike: 100,
              expiry: '2024-01-01',
              type: 'call',
              bid: 2.0,
              ask: 2.5,
              last: 2.25,
              mid: 2.25,
              iv: 0.2,
              delta: 0.5,
              gamma: 0.1,
              theta: -0.05,
              vega: 0.3,
              vanna: 0.02,
              charm: -0.01,
              volga: 0.05,
              speed: -0.01,
              rho: 0.1,
              veta: -0.02,
              color: -0.01,
              zomma: 0.02,
              ultima: -0.01,
              openInterest: 1000,
              volume: 500,
            },
          ],
          puts: [
            {
              strike: 100,
              expiry: '2024-01-01',
              type: 'put',
              bid: 2.0,
              ask: 2.5,
              last: 2.25,
              mid: 2.25,
              iv: 0.2,
              delta: -0.5,
              gamma: 0.1,
              theta: -0.05,
              vega: 0.3,
              vanna: 0.02,
              charm: -0.01,
              volga: 0.05,
              speed: -0.01,
              rho: -0.1,
              veta: -0.02,
              color: -0.01,
              zomma: 0.02,
              ultima: -0.01,
              openInterest: 1000,
              volume: 500,
            },
          ],
        },
      ],
    };

    const move = impliedMove(snapshot);
    
    expect(move.straddle).toBeCloseTo(4.5, 4); // 2.25 + 2.25
    expect(move.move).toBeCloseTo(3.6, 4); // 4.5 * 0.8
    expect(move.movePct).toBeCloseTo(0.036, 4); // 3.6 / 100
    expect(move.probTouch).toBe(0.5);
  });

  it('should handle empty snapshots', () => {
    const snapshot: VolSnapshot = {
      symbol: 'TEST',
      spot: 100,
      riskFreeRate: 0.05,
      dividendYield: 0.01,
      timestamp: Date.now(),
      expiries: [],
    };

    const move = impliedMove(snapshot);
    
    expect(move.move).toBe(0);
    expect(move.movePct).toBe(0);
    expect(move.probTouch).toBe(0);
    expect(move.straddle).toBe(0);
  });
});

describe('Max Pain Strike', () => {
  it('should calculate max pain strike correctly', () => {
    const snapshot: VolSnapshot = {
      symbol: 'TEST',
      spot: 100,
      riskFreeRate: 0.05,
      dividendYield: 0.01,
      timestamp: Date.now(),
      expiries: [
        {
          expiry: '2024-01-01',
          dte: 30,
          atmIV: 0.2,
          calls: [
            {
              strike: 95,
              expiry: '2024-01-01',
              type: 'call',
              bid: 6.0,
              ask: 6.5,
              last: 6.25,
              mid: 6.25,
              iv: 0.2,
              delta: 0.8,
              gamma: 0.1,
              theta: -0.05,
              vega: 0.3,
              vanna: 0.02,
              charm: -0.01,
              volga: 0.05,
              speed: -0.01,
              rho: 0.1,
              veta: -0.02,
              color: -0.01,
              zomma: 0.02,
              ultima: -0.01,
              openInterest: 100,
              volume: 50,
            },
            {
              strike: 105,
              expiry: '2024-01-01',
              type: 'call',
              bid: 1.0,
              ask: 1.5,
              last: 1.25,
              mid: 1.25,
              iv: 0.2,
              delta: 0.2,
              gamma: 0.1,
              theta: -0.05,
              vega: 0.3,
              vanna: 0.02,
              charm: -0.01,
              volga: 0.05,
              speed: -0.01,
              rho: 0.1,
              veta: -0.02,
              color: -0.01,
              zomma: 0.02,
              ultima: -0.01,
              openInterest: 100,
              volume: 50,
            },
          ],
          puts: [
            {
              strike: 95,
              expiry: '2024-01-01',
              type: 'put',
              bid: 1.0,
              ask: 1.5,
              last: 1.25,
              mid: 1.25,
              iv: 0.2,
              delta: -0.2,
              gamma: 0.1,
              theta: -0.05,
              vega: 0.3,
              vanna: 0.02,
              charm: -0.01,
              volga: 0.05,
              speed: -0.01,
              rho: -0.1,
              veta: -0.02,
              color: -0.01,
              zomma: 0.02,
              ultima: -0.01,
              openInterest: 100,
              volume: 50,
            },
            {
              strike: 105,
              expiry: '2024-01-01',
              type: 'put',
              bid: 6.0,
              ask: 6.5,
              last: 6.25,
              mid: 6.25,
              iv: 0.2,
              delta: -0.8,
              gamma: 0.1,
              theta: -0.05,
              vega: 0.3,
              vanna: 0.02,
              charm: -0.01,
              volga: 0.05,
              speed: -0.01,
              rho: -0.1,
              veta: -0.02,
              color: -0.01,
              zomma: 0.02,
              ultima: -0.01,
              openInterest: 100,
              volume: 50,
            },
          ],
        },
      ],
    };

    const maxPain = maxPainStrike(snapshot);
    
    // With symmetric OI at 95 and 105, max pain should be near the middle (100)
    expect(maxPain).toBeGreaterThanOrEqual(95);
    expect(maxPain).toBeLessThanOrEqual(105);
  });

  it('should handle empty snapshots', () => {
    const snapshot: VolSnapshot = {
      symbol: 'TEST',
      spot: 100,
      riskFreeRate: 0.05,
      dividendYield: 0.01,
      timestamp: Date.now(),
      expiries: [],
    };

    const maxPain = maxPainStrike(snapshot);
    expect(maxPain).toBeNull();
  });
});

describe('IV Rank', () => {
  it('should calculate IV rank correctly', () => {
    const frames = [
      {
        snapshot: {
          symbol: 'TEST',
          spot: 100,
          riskFreeRate: 0.05,
          dividendYield: 0.01,
          timestamp: Date.now(),
          expiries: [
            {
              expiry: '2024-01-01',
              dte: 30,
              atmIV: 0.15,
              calls: [],
              puts: [],
            },
          ],
        },
      },
      {
        snapshot: {
          symbol: 'TEST',
          spot: 100,
          riskFreeRate: 0.05,
          dividendYield: 0.01,
          timestamp: Date.now(),
          expiries: [
            {
              expiry: '2024-01-01',
              dte: 30,
              atmIV: 0.20,
              calls: [],
              puts: [],
            },
          ],
        },
      },
      {
        snapshot: {
          symbol: 'TEST',
          spot: 100,
          riskFreeRate: 0.05,
          dividendYield: 0.01,
          timestamp: Date.now(),
          expiries: [
            {
              expiry: '2024-01-01',
              dte: 30,
              atmIV: 0.25,
              calls: [],
              puts: [],
            },
          ],
        },
      },
    ];

    // Current IV is 0.20 (middle value)
    const result = ivRank(frames, 1);
    
    expect(result.rank).toBeCloseTo(0.5, 4);
    expect(result.percentile).toBeCloseTo(66.67, 2); // 2 out of 3 values are <= 0.20
  });

  it('should handle insufficient data', () => {
    const frames = [
      {
        snapshot: {
          symbol: 'TEST',
          spot: 100,
          riskFreeRate: 0.05,
          dividendYield: 0.01,
          timestamp: Date.now(),
          expiries: [],
        },
      },
    ];

    const result = ivRank(frames, 0);
    
    expect(result.rank).toBe(0.5);
    expect(result.percentile).toBe(50);
  });
});

describe('Gamma Exposure', () => {
  it('should calculate gamma exposure correctly', () => {
    const snapshot: VolSnapshot = {
      symbol: 'TEST',
      spot: 100,
      riskFreeRate: 0.05,
      dividendYield: 0.01,
      timestamp: Date.now(),
      expiries: [
        {
          expiry: '2024-01-01',
          dte: 30,
          atmIV: 0.2,
          calls: [
            {
              strike: 100,
              expiry: '2024-01-01',
              type: 'call',
              bid: 2.0,
              ask: 2.5,
              last: 2.25,
              mid: 2.25,
              iv: 0.2,
              delta: 0.5,
              gamma: 0.1,
              theta: -0.05,
              vega: 0.3,
              vanna: 0.02,
              charm: -0.01,
              volga: 0.05,
              speed: -0.01,
              rho: 0.1,
              veta: -0.02,
              color: -0.01,
              zomma: 0.02,
              ultima: -0.01,
              openInterest: 1000,
              volume: 500,
            },
          ],
          puts: [
            {
              strike: 100,
              expiry: '2024-01-01',
              type: 'put',
              bid: 2.0,
              ask: 2.5,
              last: 2.25,
              mid: 2.25,
              iv: 0.2,
              delta: -0.5,
              gamma: 0.1,
              theta: -0.05,
              vega: 0.3,
              vanna: 0.02,
              charm: -0.01,
              volga: 0.05,
              speed: -0.01,
              rho: -0.1,
              veta: -0.02,
              color: -0.01,
              zomma: 0.02,
              ultima: -0.01,
              openInterest: 500,
              volume: 250,
            },
          ],
        },
      ],
    };

    const gex = gammaExposure(snapshot);
    
    expect(gex.points).toHaveLength(1);
    expect(gex.points[0]?.strike).toBe(100);
    expect(gex.totalGEX).toBeGreaterThan(0);
    expect(gex.gammaFlip).toBeGreaterThanOrEqual(100);
  });

  it('should handle empty snapshots', () => {
    const snapshot: VolSnapshot = {
      symbol: 'TEST',
      spot: 100,
      riskFreeRate: 0.05,
      dividendYield: 0.01,
      timestamp: Date.now(),
      expiries: [],
    };

    const gex = gammaExposure(snapshot);
    
    expect(gex.points).toHaveLength(0);
    expect(gex.totalGEX).toBe(0);
    expect(gex.gammaFlip).toBeNull();
  });
});
