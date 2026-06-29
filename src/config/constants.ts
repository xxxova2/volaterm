/**
 * Application configuration constants
 * Centralized configuration for visual settings, data limits, and operational parameters
 */

export const VISUAL_CONFIG = {
  /** 3D Surface visualization settings */
  surface: {
    MONEYNESS_MIN: 0.75,
    MONEYNESS_MAX: 1.30,
    WIDTH: 3.6,
    DEPTH: 3.2,
    VISUAL_HEIGHT: 1.7,
    IV_CAP: 0.6,
    UPSCALE: 4,
    X_TICKS: [0.80, 0.90, 1.00, 1.10, 1.20, 1.30],
  },
  
  /** Option chain display settings */
  optionChain: {
    ROW_HEIGHT: 22,
    ATM_THRESHOLD: 0.005, // 0.5% from spot for ATM highlighting
  },
} as const;

export const DATA_CONFIG = {
  /** Historical data generation */
  history: {
    DEFAULT_FRAMES: 64,
    FRAME_INTERVAL_MS: 7200000, // 2 hours
  },
  
  /** Synthetic data presets for common symbols */
  SYMBOL_PRESETS: {
    SPY: { spot: 548, iv30: 0.14 },
    QQQ: { spot: 480, iv30: 0.18 },
    IWM: { spot: 215, iv30: 0.22 },
    DIA: { spot: 420, iv30: 0.13 },
    AAPL: { spot: 220, iv30: 0.22 },
    NVDA: { spot: 125, iv30: 0.35 },
    TSLA: { spot: 350, iv30: 0.45 },
  },
  
  /** Default market parameters */
  market: {
    RISK_FREE_RATE: 0.0525,
    DIVIDEND_YIELD: 0.013,
  },
  
  /** Strike generation settings */
  strikes: {
    STEP_RATIO: 0.01, // 1% of spot price
    HALF_STRIKES: 50, // Number of strikes above/below ATM (wider, finer wings)
  },

  /** Expiry generation DTE values (weekly term structure through ~60d, then monthly) */
  EXPIRY_DTES: [1, 2, 3, 4, 5, 7, 14, 21, 30, 45, 60, 90, 120, 180, 270, 365],
} as const;

export const API_CONFIG = {
  /** Server settings */
  server: {
    DEFAULT_PORT: 3001,
    DEV_PORT: 3000,
  },
  
  /** Cache settings */
  cache: {
    TTL_MS: 30000, // 30 seconds
  },
  
  /** Rate limiting */
  rateLimit: {
    WINDOW_MS: 60000, // 1 minute
    MAX_REQUESTS: 30, // requests per minute
  },
  
  /** API timeouts */
  timeout: {
    PROBE_MS: 12000,
    FETCH_MS: 25000,
  },
} as const;

export const REFRESH_CONFIG = {
  /** Data refresh intervals */
  DEMO_INTERVAL_MS: 3000,
  LIVE_INTERVAL_MS: 5000,
  
  /** Playback speed settings */
  PLAYBACK_INTERVAL_MS: 700,
  SPEEDS: [0.5, 1, 2, 4],
} as const;

export const VALIDATION_CONFIG = {
  /** Symbol validation */
  symbol: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 5,
    PATTERN: /^[A-Z]+$/,
  },
  
  /** Input validation ranges */
  ranges: {
    MIN_IV: 0.01,
    MAX_IV: 3.0,
    MIN_SPOT: 0.01,
    MIN_DTE: 0,
  },
} as const;
