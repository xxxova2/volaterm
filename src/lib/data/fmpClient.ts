/**
 * FMP API client — calls the local proxy (/api/fmp/stable/*)
 * so the API key stays server-side.
 */

async function fmpFetch<T>(endpoint: string): Promise<T | null> {
  try {
    const res = await fetch(`/api/fmp/stable/${endpoint}`);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchFmpQuote(symbol: string) {
  return fmpFetch<import('./types').FmpQuoteResponse>(`quote?symbol=${symbol}`);
}

/** Returns the latest treasury yield curve. */
export async function fetchFmpTreasuryRates() {
  return fmpFetch<import('./types').FmpTreasuryResponse>('treasury-rates');
}

export async function fetchFmpEtfHoldings(symbol: string) {
  return fmpFetch<import('./types').FmpEtfHoldingResponse>(`etf/holdings?symbol=${symbol}`);
}
