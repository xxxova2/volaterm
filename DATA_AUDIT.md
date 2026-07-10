# Data Reality + Math Audit

**Date:** 2026-07-10  
**Scope:** All primary desk data sources + formulas built on them.  
**Policy:** Fail-closed (no synthetic market levels labeled as live).

---

## Equity options source decision

| Candidate | Verdict | Notes |
|-----------|---------|--------|
| **yfinance `option_chain()`** | **Selected (primary equities)** | Live via `fetch_options.py` → `GET /api/options/:symbol`. Smoke (SPY): 2.5k+ quotes, 12 expiries, bid/ask/last/IV/OI/volume. **Latency:** often 5–90s cold (multi-expiry). **Reliability:** intermittent Yahoo rate-limits; delayed (not OPRA live). Cached 3 min server-side. |
| FMP options | Secondary if `FMP_API_KEY` set | Paid; often 403 without plan. Used only as fallback in `LiveProvider`. |
| Deribit | **Primary crypto (BTC/ETH)** | Public API; real chain + funding. |
| CBOE DataShop / ORATS / Tradier / Polygon | Not wired | Require paid keys / contracts; better for production OPRA. |
| Synthetic | **Never as live** | Demo provider only; LIVE path returns `null` if no real chain. |

**UI:** Empty chain states state the source and that no synthetic chain is shown.

---

## Audit table

| Source | Real or Mocked | Endpoint | Feeds Which Calculation | Formula Verified Correct (Y/N) | Notes |
|--------|----------------|----------|-------------------------|-------------------------------|-------|
| SOFR | **Real** | FRED `SOFR` via MacroVol `/api/rates/summary`, `/basis`, `/plumbing`; NYFed `https://markets.newyorkfed.org/api/rates/all/latest.json` | Money-market strip, basis spreads, STIR vs SOFR, risk-free seed | **Y** | Print in percent. Spreads: `(a−b)×100` → bps. |
| EFFR | **Real** | FRED `DFF`; NYFed EFFR | SOFR−EFFR, EFFR−IORB, corridor | **Y** | Same units as SOFR (%). |
| IORB | **Real** | FRED `IORB` | SOFR−IORB, EFFR−IORB, RRP derived rate | **Y** | |
| OBFR | **Real** | NYFed latest (via STIR `nyfed.ref_print`) | SOFR−OBFR on MM strip | **Y** | Added to primary strip; not previously surface-level. |
| TGCR / BGCR | **Real** | NYFed latest | NY Fed board table only | **Y** | Display only. |
| RRP rate | **Derived (disclosed)** | `IORB − 10 bp` (NY Fed convention) unless `RATES_RRP_OVERRIDE` | Plumbing strip | **Y** | UI note marks derived; not a FRED series. |
| RRP volume | **Real** | FRED `RRPONTSYD` | Plumbing chart ($B) | **Y** | |
| Reserve balances | **Real** | FRED `WRESBAL` | Plumbing chart; UI shows /1000 → $T | **Y** | FRED unit = $ millions; chart divides by 1000 → trillions. |
| UST CMT curve | **Real** | FRED `DGS*` series `/api/rates/curve` | Curve strip, dual chart, shape spreads | **Y** | Fail-closed nulls; no synthetic tenors. |
| 2s10s / 3m10y (FRED) | **Real** | FRED `T10Y2Y`, `T10Y3M` | Snapshot + UST strip | **Y** | FRED unit = **percentage points**; UI ×100 → bps. Documented in API `spread_note`. |
| Curve shape spreads | **Real calc** | Levels from FRED CMT; `/api/rates/shape` | Mini spread charts | **Y** | e.g. 2s10s = 10Y−2Y in bp; fly = 2×5Y − 2Y − 10Y. |
| Overnight basis spreads | **Real calc** | SOFR/EFFR/IORB | MM strip + basis history | **Y** | `(a−b)×100` bps. **Fixed:** removed hardcoded 3.62/3.65 fallbacks (was silent mock). |
| Basis z-score | **Real calc** | Window population z on bps history | Basis section | **Y** | \(z=(x−μ)/σ_{pop}\) over returned window — not rolling fixed window; labeled. |
| SOFR futures (SR3/SR1) | **Real + settled** | yfinance CME symbols; expired legs FRED SOFR compound | STIR path chart | **Y** | Implied rate = `100 − price` (price quote). Settled legs disclosed. Fallback only if `ALLOW_STIR_FALLBACK=1` (default off). |
| Fed Funds futures (ZQ) | **Real** | yfinance | STIR board | **Y** | Same price→rate convention when live. |
| Treasury futures | **Real** | yfinance `ZT=F`… | STIR / premium context | **Y** | Prices, not yields — not converted to CTD yield. |
| Global 10Y | **Real** | FRED DGS10 + OECD-style long rates DE/UK/FR/JP | Global board; spreads vs US | **Y** | `(foreign−US)×100` bps. Monthly lag on non-US series disclosed in note. |
| JGB curve | **Real** | MoF Japan CSV | Japan panel | **Y** | Fail-closed; no demo curve. |
| US−JP 10Y carry context | **Real calc** | FRED DGS10 / JP series / DEXJPUS | Japan panel | **Y** | Spread = US10 − JP10 (pp). FX = DEXJPUS. |
| FX board | **Real** | Frankfurter / ECB | FX section | **Y** | Spot rates; fail-closed. |
| Fiscal auctions | **Real** | Treasury FiscalData | Auction card under curves | **Y** | Calendar only. |
| US macro (CPI/PCE/NFP/…) | **Real** | FRED series + `/api/macro/summary` | Macro panel | **Y** | YoY: `(latest/yearAgo−1)×100` on index levels when series ≥13 obs. NFP MoM in thousands (PAYEMS first difference). |
| Fed balance sheet | **Real** | FRED `WALCL` | Macro panel | **Y** | FRED unit = $ millions; UI now shows **$ trillions** (`value / 1e6`). Fixed 2026-07-10. |
| Rates correlations | **Real** | yfinance returns via MacroVol | Corr sections | **Y** | Pearson on returns; not levels. |
| Asset correlations | **Real** | same | RatesView bottom | **Y** | |
| Equity option chain | **Real (delayed)** | yfinance `/api/options/:sym` (primary); FMP fallback | Chain, surface, greeks, GEX | **Y** | Mid = (bid+ask)/2 else last. IV: Newton then bisection on BS; feed IV only if solve fails. |
| Crypto option chain | **Real** | Deribit public | BTC/ETH chain + surface | **Y** | |
| Perp basis | **Real** | Bybit public | Crypto board | **Y** | mark − index; annualization labeled in API. |
| Finnhub news/earnings | **Real if keyed** | Finnhub via Node `/api/finnhub/*` | News strip | **Y** | Key server-only. |
| SEC EDGAR | **Real** | SEC public | Equity context | **Y** | |
| CoinGecko spot | **Real** | MacroVol crypto spot | Crypto backup spot | **Y** | |
| FMP treasury / quote | **Real if keyed** else unused | FMP | Spot / rfr enrichment | **Y** | No silent fake quotes. |
| Demo / synthetic surface | **Mock (demo mode only)** | Local generator | Never LIVE | **Y** | LIVE fail-closed if no chain. |
| Default r in MacroVol greeks/surface | **Real or 503** | `_default_r()` → live SOFR; else front CMT; else HTTP 503 | MacroVol surface/greeks r | **Y** | Removed silent 0.04 stub (2026-07-10). |
| RRP derived | **Derived** | IORB−10bp | Plumbing | **Y** | Disclosed. |

---

## Math deep-dives (key formulas)

### Overnight spreads
\[
\text{spread}_{bps} = (r_a - r_b) \times 100
\]
with \(r\) in percent (e.g. 3.53). Confirmed vs FRED prints.

### Curve spreads (shape)
- **2s10s:** \(y_{10} - y_2\) → bp  
- **Fly 2s5s10s:** \(2 y_5 - y_2 - y_{10}\) → bp  
Units match FRED CMT percent yields.

### Black–Scholes IV
- Model: BSM with continuous dividend yield \(q\).
- Root: Newton on vega, bisection fallback; seed Brenner–Subrahmanyam-style.
- Greeks: θ per calendar day (`/365`), vega per vol point (`/100`), charm per day — documented in `greeks.ts`.

### SOFR futures rate
\[
r_{\%} = 100 - P_{\text{quote}}
\]
for price quotes above ~50 (CME convention).

### Macro YoY
\[
\text{YoY\%} = \left(\frac{\text{index}_t}{\text{index}_{t-12}} - 1\right) \times 100
\]
on monthly CPI/PCE index levels.

---

## Fixes applied in this pass

1. **Removed silent 3.62/3.65 hardcodes** from `/api/rates/basis` and `/api/rates/plumbing` (fail-closed nulls).
2. **Money-market data strip first** (SOFR 1d Δ, EFFR, IORB, OBFR, four ON spreads) then basis history charts.
3. **UST data strip then curve charts** (same series).
4. **Option A macro hierarchy** implemented in render + fetch order + sub-nav.
5. **Equity chain:** confirmed yfinance path live; empty UI no longer vague “no chain data”.
6. **Removed silent 0.04 r stub** — surface/greeks use SOFR → front CMT → 503.
7. **Fed BS display** — WALCL millions now shown as $ trillions (÷1e6) with correct label.

---

## Hierarchy justification (Option A — Relevance-first)

| Block | Why here |
|-------|----------|
| US Macro | USD reserve-currency prints set the global regime. |
| Money markets | Primary USD funding prints a trader reads in &lt;3s. |
| ON basis charts | Visual for the same MM spreads. |
| Plumbing | Liquidity stock (RRP/reserves) after rate corridor. |
| UST yields → charts | Discounting curve after overnight. |
| STIR / NY Fed | Path priced vs same SOFR. |
| Global 10Y | G10 by relevance to USD desk (US→DE→UK→FR→JP). |
| FX | Transmission of rate differentials. |
| Japan | BoJ/JGB carry special after generic DM. |
| Corr | Risk context last — not a trading object. |
