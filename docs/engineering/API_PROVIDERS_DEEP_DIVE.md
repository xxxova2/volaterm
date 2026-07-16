# API providers deep dive — utilization & what to add

**Date:** 2026-07-15  
**Goal:** Use the data we already pay for (or get free) closer to **100% of product value**, not 100% of every endpoint.  
**Rules (unchanged):** keys server-only · shared cache · budget gates · fail-closed · source + as-of badges · no synthetic “live” levels.

This is an engineering inventory of **what is wired today**, **what each provider can still give**, and **what is worth building** for VOLATERM’s three machines (plumbing · vol · positioning).

---

## 1. Provider map (reality, not marketing)

| Provider | Auth / env | Role in stack | Free / scarce constraint | Code home |
|----------|------------|---------------|--------------------------|-----------|
| **yfinance** (Python) | none | **Primary equity option chain** + history/info | Rate-limit / delay (not OPRA) | `fetch_options.py`, `/api/options`, `/api/yf/*` |
| **FMP** | `FMP_API_KEY` | Spot, treasury, profile, news, earnings, history; options if plan allows | ~250 req/day free-ish; options often paid | `api/_shared.js`, `fmpClient.ts`, proxy `/api/fmp/stable/*` |
| **FRED** | `FRED_API_KEY` (macrovol) | Rates, plumbing, macro prints, global yields | Generous free; cache hard | `macrovol-api/services/fred_client.py` |
| **NY Fed markets API** | public | SOFR/EFFR/TGCR/BGCR/OBFR latest | Public JSON | `nyfed_client.py`, STIR |
| **Deribit** | public | **Primary BTC/ETH options** + funding | Public | `deribitClient.ts`, `/api/deribit/*` |
| **Bybit** | public | Perp mark vs index basis | Public | `perp_basis.py` |
| **CoinGecko** | public | Crypto spot backup | Soft rate limits | `coingecko.py` |
| **Frankfurter / ECB** | public | FX board | Public | `fx_board.py` |
| **Treasury FiscalData** | public | Auction calendar | Public | `fiscal_auctions.py` |
| **SEC EDGAR** | public (+ UA) | Filings context | Polite rate | `sec_context.py` |
| **Finnhub** | `FINNHUB_API_KEY` | News, earnings, quote | ~60 calls/min free; we budget soft daily | `server.js` `/api/finnhub/*` |
| **Alpha Vantage** | `ALPHA_VANTAGE_API_KEY` | Quote + daily + overview | **~25/day** — hard budget | `api/deskFeeds.js` |
| **TradingView via RapidAPI** | `RAPIDAPI_KEY` | SPY/BTC snapshot only | **~150/month** | `deskFeeds.js` |
| **FlashAlpha Lab** | `FLASHALPHA_API_KEY` | External GEX levels | **5/day free**, stocks not SPY | `flashalphaClient.ts`, `/api/flashalpha/*` |
| **Massive** (Polygon-style) | `MASSIVE_API_KEY` | **Key present in env; not wired in code** | Low RPM free | Docs only (`API_PROVIDERS_EVAL.md`) |
| **OPRA transport** | `OPRA_*` | Skeleton only | Paid | `opraTransport.ts`, `/api/opra/*` |
| **Japan MoF CSV** | public | JGB curve | Public | `jgb_curve.py` |

**Count:** ~15 sources. **Paid-key path that is dead code:** Massive. **Paid-key path under-used:** Finnhub surface, FRED credit/liquidity series, FlashAlpha GEX profile, AV overview, FMP allowlist depth.

---

## 2. Utilization scorecard (honest)

Utilization = “product uses the fields / endpoints we already fetch or could fetch under existing budget without new vendors.”

| Provider | What we use today | Utilization | Main waste / gap |
|----------|-------------------|-------------|------------------|
| **yfinance chain** | bid/ask/last/IV/OI/volume → surface, greeks, GEX | **High (~80%)** | Multi-expiry latency; delayed; no official OPRA size |
| **FRED** | SOFR, DFF, IORB, DGS*, T10Y*, RRPONTSYD, WRESBAL, CPI/PCE/NFP/…, WALCL, global 10Y | **Medium (~55%)** | HY/IG, term SOFR, BEI, VIX, dollar index, NFCI in fallback only or unused |
| **NY Fed** | Latest rate prints | **High** | Could surface TGCR/BGCR more on home strip |
| **FMP** | quote, treasury, profile, news, earnings, history; options fallback | **Medium (~50%)** | ETF holdings barely productized; economic calendar not allowed; batch quotes unused |
| **Finnhub** | `/quote`, `/company-news`/`/news`, `/calendar/earnings` | **Low (~25%)** | Candles, recommendation, peers, economic calendar, basic financials, WS unused |
| **Alpha Vantage** | GLOBAL_QUOTE, TIME_SERIES_DAILY, OVERVIEW (warmer) | **Low–med (~35%)** | Overview rarely UI-first; no RSI/MACD/HV from free technicals; budget too tight to poll |
| **TradingView Rapid** | Rare snapshot | **Low (by design)** | Correct scarcity; do not expand polling |
| **FlashAlpha** | `/exposure/levels` only | **Low (~40% of free plan)** | `fetchFAGEX` client exists, **not used in UI**; free ≠ SPY |
| **Massive** | **Nothing** | **0%** | Key without adapter |
| **Deribit** | chain + funding + index | **High** | Futures strip under-exposed vs options |
| **Bybit / CG / FX / Fiscal / SEC** | Single-purpose boards | **High for scope** | Fine as satellites |

---

## 3. Per-provider: already get vs should add

### 3.1 FRED (+ MacroVol) — highest ROI free depth

**Already:** corridor (SOFR/EFFR/IORB), curve CMT, RRP volume, reserves, macro prints, global 10Y, STIR vs SOFR.

**Sitting unused or only in `FALLBACK_DATA`:**

| Series ID | Meaning | Product use |
|-----------|---------|-------------|
| `BAMLH0A0HYM2` | ICE BofA HY OAS | Credit stress machine — home/rates risk strip |
| `BAMLC0A0CM` | IG OAS | Same |
| `TSFR1M` / `TSFR3M` / `TSFR6M` | Term SOFR | Term structure beyond overnight |
| `VIXCLS` | VIX | Live chart in vol desk (we ship static PNGs in Academy only) |
| `T5YIE` / `T10YIE` | Breakeven inflation | G/I/L “I” leg without waiting for CPI |
| `DFII5` / `DFII10` | Real yields | Macro narrative |
| `DTWEXBGS` | Broad USD | Liquidity / FX transmission |
| `NFCI` or `ANFCI` | Chicago Fed financial conditions | One-number “stress” |
| `M2SL` / `RRPONTSYD` history already partial | Liquidity stock | Already RRP; M2 optional |

**Add (concrete):**

1. Extend `/api/macro/summary` or new `/api/macro/stress` with HY OAS, IG OAS, VIX, BEI, USD index, NFCI.  
2. Wire into **boot briefing + rates home** as “risk regime” chips.  
3. Academy can hot-link live series later instead of only static FRED PNGs.

**Why first:** zero new vendor, key already live, perfect fit for G/I/L + plumbing story.

---

### 3.2 Finnhub — most unused free surface under one key

**Used:** quote, company/general news, earnings calendar (+ hist earnings fallback).

**Free-tier endpoints we do *not* call (high value for desk):**

| Endpoint | Use in VOLATERM |
|----------|-----------------|
| `/stock/candle` | HV / realized vol path; validate our HistIvStrip without burning FMP history |
| `/stock/recommendation` | Analyst tilt chip on symbol (context, not signal) |
| `/stock/peers` | Quick relative vol peers on surface |
| `/stock/metric` or basic financials | PE/beta backup when FMP profile fails |
| `/stock/profile2` | Profile redundancy |
| `/calendar/economic` *(check plan)* | **Event blindness** — biggest product gap vs Bloomberg ECO |
| `/stock/insider-transactions` | Event risk near earnings |
| WebSocket trades (50 symbols free) | Optional future tape; not day-1 |

**Add (concrete, budget-safe):**

1. **Economic calendar strip** on Rates + boot (cache 6–12h, one shared pull).  
2. **Daily candles → realized vol** for term desk HV panel (1 call / symbol / day cached).  
3. **Recommendation + peers** on DES / quote card (TTL 24h).  

**Do not:** poll candles every refresh cycle (burns 60/min carelessly under multi-user).

---

### 3.3 FMP — widen allowlist only where free plan works

**Allowlist today** (`FMP_ALLOWED_ENDPOINTS`):

`quote`, `treasury-rates`, `etf/holdings`, `options/symbol`, `historical-price-eod/light`, `profile`, `news/stock-latest`, `earnings-calendar`

**Under-used in product:**

- `etf/holdings` — client exists; SPY composition / sector risk barely desk-visible  
- Dual news (FMP + Finnhub) without clear primary/fallback story in UI  

**Worth adding to allowlist (if free plan returns 200):**

| Endpoint | Product |
|----------|---------|
| `economic-calendar` | Same ECO story as Finnhub (prefer one source) |
| Batch `quote` multi-symbol | Watchlist in **one** request (saves daily budget) |
| `market-risk-premium` | Optional academic / rates footnote |
| Index quotes (`^VIX` or FMP VIX symbol if available) | Vol regime without FRED lag |

**Options:** keep as paid fallback only; never pretend free OPRA.

---

### 3.4 Alpha Vantage — extract more per scarce call

**Budget:** ~25/day total. Warmer already uses quote + daily + overview for SPY.

**Waste:** overview is fetched but not a first-class DES card; technical indicators (RSI, SMA) available but unused.

**Add (1–2 calls/day max):**

1. Surface **OVERVIEW** on Security DES (sector, beta, 52w, div yield) — data already budgeted.  
2. Optional `REALIZED_VOL` / technical if still free — else compute RV from daily bars we already have (prefer compute, zero extra API).  
3. **Never** expand to multi-symbol polling on free.

---

### 3.5 FlashAlpha — finish the half-built integration

**Wired:** levels → store → `FlashAlphaStrip`  
**Client exists unused:** `fetchFAGEX` / `/api/flashalpha/exposure/gex/:symbol`

**Constraints (confirmed eval):** free = **5/day**, individual names not SPY/ETFs.

**Add:**

1. On **single-name** symbols only: daily cached GEX profile compare vs our OI-inferred GEX (badge `external · flashalpha`).  
2. Hard server budget 1–2 symbols/day; no 15m poll.  
3. For SPY: keep **our** GEX only; do not burn FA free quota.

---

### 3.6 Massive — wire or drop the key

**Status:** env placeholder + probe doc; **zero runtime adapter**.

**Add (minimal):**

1. Server `/api/massive/prev/:symbol` → prev daily OHLCV.  
2. Fallback when FMP history and yfinance history both fail.  
3. Or **remove key from ops checklist** until needed (dead secrets are risk).

---

### 3.7 Deribit / Bybit / CoinGecko

**Already strong.** Incremental:

| Add | Why |
|-----|-----|
| Deribit futures strip next to options | Funding + basis narrative already half there |
| Expose more ticker fields we already fetch (OI, mark IV) in crypto surface chrome | 100% of payload |
| CoinGecko 24h% already in boot — keep | Fine |

---

### 3.8 TradingView RapidAPI

**Leave as last-resort snapshot.** Expanding = budget death. Correct design.

---

### 3.9 OPRA / Polygon paid

Skeleton only. **Product decision**, not free utilization. Do not fake live OPRA with Yahoo.

---

## 4. Cross-cutting product gaps (data we could show, no new vendor)

These map to **three machines** and Academy claims:

| Gap today | Best source we already have | UI home |
|-----------|----------------------------|---------|
| **Event blindness** (CPI/NFP/FOMC week) | Finnhub or FMP economic calendar | Rates + boot |
| **Credit stress** | FRED HY/IG OAS | Rates strip / boot |
| **Live VIX** | FRED `VIXCLS` or Finnhub/FMP index | Vol / home |
| **Realized vol vs IV** | AV daily or Finnhub candles → compute RV | Term / HistIvStrip |
| **DES fundamentals** | AV overview + FMP profile (merge) | Security card |
| **External GEX check** | FlashAlpha (single names) | Positioning |
| **Quote redundancy** | Massive prev bar | Failover only |
| **Watchlist efficiency** | FMP batch quote | Watchlist |
| **ETF risk** | FMP etf/holdings | SPY/QQQ context |

---

## 5. Budget logic (do not “use 100% of endpoints”)

“100% of the data” means **100% of useful fields under the free envelope**, not firing every REST path.

| Provider | Safe shared cadence | Anti-pattern |
|----------|---------------------|--------------|
| FRED | 5–15 min TTL, many series per summary call batch | Uncached `/macro/series/{any}` hammering |
| Finnhub | Quote 1–5 min shared; news 15–30 min; eco cal 6–12h | Per-tab candle spam |
| FMP | Quote ~12s client cache; history 1h; profile 24h | Options poll on free |
| AV | SPY pack 1–2×/day via warmer | Multi-symbol GLOBAL_QUOTE loop |
| FA | 1 levels/day/name, 6h cache | 15m GEX |
| TV | few/month | Anything periodic |

Existing: `api/upstreamCache.js` budgets + warmer in `server.js` — **keep and extend**, do not bypass.

---

## 6. Priority roadmap (build order)

### P0 — max product value, zero new keys (1–2 days)

1. **FRED stress pack:** HY OAS, IG OAS, VIX, 5Y/10Y BEI, USD broad → `/api/macro/stress` + boot chips.  
2. **Use Alpha Vantage OVERVIEW in DES** (already fetched/cached).  
3. **Compute RV from AV/FMP daily bars** already in pack (no new endpoint).  

### P1 — Finnhub depth (2–3 days)

4. Economic calendar shared strip.  
5. Candles → realized vol for term desk.  
6. Peers + recommendation on symbol change (24h TTL).  

### P2 — Positioning integrity

7. FlashAlpha GEX profile for single names (budgeted).  
8. Side-by-side vs OI GEX with convention disclaimer.  

### P3 — Resilience

9. Massive prev-bar fallback **or** delete dead key.  
10. FMP batch quotes for watchlist.  
11. ETF holdings panel for SPY/QQQ.  

### Explicit non-goals (for now)

- OPRA live without budget  
- TradingView as primary rates feed  
- Polling FlashAlpha for SPY on free  
- “Use every Alpha Vantage function”  

---

## 7. Overlap matrix (who owns what truth)

| Truth | Primary | Backup | Never use for this |
|-------|---------|--------|--------------------|
| Equity option chain | yfinance | FMP options (paid) | Synthetic in LIVE |
| Crypto option chain | Deribit | — | Yahoo |
| Spot equity | FMP → yfinance → Finnhub → AV | Massive | TV as primary |
| Overnight USD | NY Fed + FRED | — | RapidAPI |
| Curve | FRED DGS* | FMP treasury | — |
| News | Finnhub | FMP news | — |
| Earnings | Finnhub + FMP calendar | — | — |
| GEX internal | Our OI model | — | FlashAlpha as sole source |
| GEX external check | FlashAlpha (names) | — | Free SPY |
| FX spot | Frankfurter | — | — |
| Perp basis | Bybit | — | — |

---

## 8. Success metrics

| Metric | Target |
|--------|--------|
| FRED series used in UI that exist in product thesis (credit, VIX, BEI) | ≥ 4 new chips |
| Finnhub endpoints used | 3 → ≥ 6 |
| Dead keys with zero adapter | 0 (wire Massive or remove) |
| Free budget incidents (429 / exhausted day) | no increase vs baseline |
| Fields fetched but never rendered (AV overview, FA GEX, ETF holdings) | → rendered or stop fetching |

---

## 9. Bottom line

You already run a **multi-provider desk stack**. The biggest gap is not “more APIs” — it is:

1. **FRED left on the table** (credit, VIX, inflation expectations, USD) while Academy talks about them with static charts.  
2. **Finnhub used as news-only** while free candles/calendar would kill event blindness and improve HV/IV.  
3. **Half-wired clients** (FlashAlpha GEX, AV overview, FMP holdings, Massive key).  

Ship P0–P1 first. That is how you get closer to **100% of useful data** without burning free tiers or adding slop endpoints.

---

## Related

- `docs/engineering/API_PROVIDERS_EVAL.md` — FlashAlpha + Massive probe (2026-07-13)  
- `DATA_AUDIT.md` — formula + real-vs-mock table  
- `UPSCALE_PLAN.md` — completed free-API phases 1–4  
- `.env.example` — env contract  
