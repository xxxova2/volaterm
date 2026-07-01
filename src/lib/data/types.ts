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

export interface FmpQuoteResponse extends Array<FmpQuote> {}
export interface FmpTreasuryResponse extends Array<FmpTreasuryRate> {}
export interface FmpEtfHoldingResponse extends Array<FmpEtfHolding> {}
