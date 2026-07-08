export interface FmpQuote {
  symbol: string;
  name: string;
  price: number;
  changePercentage: number;
  change: number;
  dayLow: number;
  dayHigh: number;
  yearHigh: number;
  yearLow: number;
  volume: number;
  marketCap: number;
  priceAvg50: number;
  priceAvg200: number;
  exchange: string;
  open: number;
  previousClose: number;
  timestamp: number;
}

export interface FmpTreasuryRate {
  date: string;
  year1: number;
  year2: number;
  year3: number;
  year5: number;
  year7: number;
  year10: number;
  year20: number;
  year30: number;
}

export interface FmpEtfHolding {
  symbol: string;
  name: string;
  shares: number;
  asset: string;
  weight: number;
  marketValue: number;
}

/** A single option contract as returned by FMP's `options/symbol` endpoint. */
export interface FmpOptionContract {
  optionType?: 'call' | 'put';
  type?: 'call' | 'put';
  strike?: number | string;
  bid?: number | string;
  ask?: number | string;
  last?: number | string;
  close?: number | string;
  openInterest?: number | string;
  volume?: number | string;
  impliedVolatility?: number | string;
  expirationDate?: string;
}

/** FMP groups contracts by expiration date. */
export interface FmpExpiryGroup {
  expirationDate?: string;
  data?: FmpOptionContract[];
}

/**
 * The `options/symbol` endpoint returns an array of expiry groups, but we
 * normalise defensively (flat contract arrays and the legacy object shape are
 * also handled) so a minor FMP schema change won't break the parser.
 */
export type FmpOptionsResponse = (FmpExpiryGroup | FmpOptionContract)[];

export interface FmpQuoteResponse extends Array<FmpQuote> {}
export interface FmpTreasuryResponse extends Array<FmpTreasuryRate> {}
export interface FmpEtfHoldingResponse extends Array<FmpEtfHolding> {}

/** A single OHLCV daily bar from FMP `historical-price-eod/light`. */
export interface FmpPriceBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** Company profile from FMP `profile` (most fields optional — Free plan varies). */
export interface FmpProfile {
  symbol: string;
  companyName: string;
  price?: number;
  beta?: number;
  sector?: string;
  industry?: string;
  website?: string;
  description?: string;
  ceo?: string;
  exchange?: string;
  marketCap?: number;
  mktCap?: number;
  range?: string;
  dcfDiff?: number;
  image?: string;
  ipoDate?: string;
  isActivelyTrading?: boolean;
  fullTimeEmployees?: number;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
}

/** A single news item from FMP `news/stock-latest`. */
export interface FmpNewsItem {
  symbol?: string;
  publishedDate?: string;
  title?: string;
  image?: string;
  site?: string;
  text?: string;
  url?: string;
}

/** A single earnings entry from FMP `earnings-calendar`. */
export interface FmpEarnings {
  symbol?: string;
  date?: string;
  fiscalDateEnding?: string;
  eps?: number;
  epsEstimated?: number;
  revenue?: number;
  revenueEstimated?: number;
}
