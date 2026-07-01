export interface OptionQuote {
  strike: number;
  expiry: string;
  type: 'call' | 'put';
  bid: number;
  ask: number;
  last: number;
  mid: number;
  iv: number | null;
  delta: number | null;
  gamma: number | null;
  theta: number | null;
  vega: number | null;
  vanna: number | null;
  charm: number | null;
  volga: number | null;
  speed: number | null;
  rho: number | null;
  veta: number | null;
  color: number | null;
  zomma: number | null;
  ultima: number | null;
  openInterest: number;
  volume: number;
}

export interface OptionChain {
  symbol: string;
  spot: number;
  riskFreeRate: number;
  dividendYield: number;
  expiries: string[];
  quotes: OptionQuote[];
  timestamp: number;
}

export interface SurfaceGrid {
  expiries: string[];
  /** Days to expiration per row (parallel to `expiries`). Required for calendar arbitrage checks. */
  dtes: number[];
  strikes: number[];
  iv: (number | null)[][];
  bid: (number | null)[][];
  ask: (number | null)[][];
  delta: (number | null)[][];
}

export interface GEXPoint {
  strike: number;
  callGEX: number;
  putGEX: number;
  netGEX: number;
}

export interface GEXProfile {
  points: GEXPoint[];
  totalGEX: number;
  gammaFlip: number | null;
  callWall: number | null;
  putWall: number | null;
}

export interface TermStructurePoint {
  expiry: string;
  dte: number;
  atmIV: number;
  forwardIV: number | null;
}

export interface SVIParams {
  a: number;
  b: number;
  rho: number;
  m: number;
  sigma: number;
}

export interface SVIFit {
  params: SVIParams;
  rmse: number;
  samples: number;
}

export interface VolSnapshot {
  symbol: string;
  spot: number;
  riskFreeRate: number;
  dividendYield: number;
  timestamp: number;
  expiries: ExpirySlice[];
}

export interface ExpirySlice {
  expiry: string;
  dte: number;
  calls: OptionQuote[];
  puts: OptionQuote[];
  atmIV: number;
}

export interface HistoricalFrame {
  snapshot: VolSnapshot;
  surface: SurfaceGrid;
  timestamp: number;
}

export type DisplayMode = 'strike' | 'moneyness' | 'delta';
export type ActiveTab = 'surface' | 'smile' | 'term' | 'greeks' | 'gex' | 'chain' | 'dashboard' | 'arbitrage';

export interface GreeksProfile {
  strikes: number[];
  values: number[];
}

export interface SensitivityMatrix {
  spotShocks: number[];
  ivShocks: number[];
  delta: number[];
  gamma: number[];
  vega: number[];
  theta: number[];
}
