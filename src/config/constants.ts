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
    /** Crypto underlyings — high vol, no dividend; LIVE chain from Deribit */
    BTC: { spot: 95_000, iv30: 0.55 },
    ETH: { spot: 3_400, iv30: 0.65 },
    IBIT: { spot: 55, iv30: 0.50 },
    BITO: { spot: 18, iv30: 0.55 },
    MSTR: { spot: 350, iv30: 0.70 },
    COIN: { spot: 220, iv30: 0.55 },
  },
  
  /**
   * Fallback market parameters only — never preferred over live feeds.
   * LIVE path: r from FMP treasury / SOFR; q from profile / put-call parity.
   * Greeks API: r from SOFR+CMT via FRED (fail-closed); q from yfinance or caller.
   */
  market: {
    /** Stale static fallback when treasury/SOFR unavailable (demo/offline). */
    RISK_FREE_RATE: 0.0525,
    /** Stale static fallback when profile/parity yield unavailable. */
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
  
  /**
   * Rate limiting — must stay in sync with server.js @fastify/rate-limit.
   * Global cap is generous for SPA refresh bursts; key-proxy routes are tighter.
   */
  rateLimit: {
    WINDOW_MS: 60_000,
    /** Global max (static assets allow-listed). */
    MAX_REQUESTS: 600,
    /** FMP / Finnhub / desk key proxies. */
    UPSTREAM_MAX: 120,
    /** Alpha Vantage / TradingView (tight free quotas). */
    SCARCE_UPSTREAM_MAX: 30,
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
  /** Default live poll tick (orchestrator). Spot/chain have their own cadences. */
  LIVE_INTERVAL_MS: 10_000,
  /** Spot quote refresh while the US equity session is open. */
  LIVE_SPOT_OPEN_MS: 12_000,
  /** Spot quote refresh outside regular hours. */
  LIVE_SPOT_CLOSED_MS: 120_000,
  /** Full option-chain refresh while the session is open. */
  LIVE_CHAIN_OPEN_MS: 45_000,
  /** Full option-chain refresh outside regular hours. */
  LIVE_CHAIN_CLOSED_MS: 300_000,
  /** Age (ms) after which StatusBar flags data as stale. */
  STALE_AFTER_MS: 90_000,

  /** Playback speed settings */
  PLAYBACK_INTERVAL_MS: 700,
  SPEEDS: [0.5, 1, 2, 4],
} as const;

export const FMP_CONFIG = {
  /** Financial Modeling Prep API settings */
  BASE_URL: 'https://financialmodelingprep.com/stable',
  PROXY_PATH: '/api/fmp/stable',
  REFRESH_INTERVAL_MS: 30000,
} as const;

export const VALIDATION_CONFIG = {
  /** Symbol validation (equity tickers + short crypto aliases like BTC/ETH) */
  symbol: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 6,
    PATTERN: /^[A-Z][A-Z0-9.-]*$/,
  },
  
  /** Input validation ranges */
  ranges: {
    MIN_IV: 0.01,
    MAX_IV: 3.0,
    MIN_SPOT: 0.01,
    MIN_DTE: 0,
  },
} as const;
