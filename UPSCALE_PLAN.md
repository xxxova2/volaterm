# Trading Terminal Pro — Upscale Plan

**Date:** 2026-07-10  
**Scope:** Free-API enrichment · product roadmap vs peer desks · cleanup (DV01 removed)

Sources: [public-apis/public-apis](https://github.com/public-apis/public-apis) Finance / Crypto / Currency / Government / News lists; peer products (SpotGamma, GEXStream, MenthorQ, thinkorswim, IBKR TWS, tastytrade, Finnhub, FRED, FiscalData).

---

## 0. Done in this pass

| Action | Status |
|--------|--------|
| Remove DV01 book from Macros UI, nav, rates load path, client API | **Done** |
| Backend DV01 helpers left in `rate_risk` (no public UI route) | Optional cleanup |

---

## 1. Free APIs (wired)

| API | Status |
|-----|--------|
| Frankfurter FX board | **Done** |
| CoinGecko crypto spot backup | **Done** |
| FiscalData Treasury auctions | **Done** |
| Finnhub news + earnings (server key) | **Done** |
| SEC EDGAR filings context | **Done** |
| FRED global 10Y (US/DE/UK/FR/JP) | **Done** |
| Bybit linear perp basis | **Done** |

### Integration rules (still in force)

1. Provider adapters + server proxy (keys never in browser).
2. UI shows source chip + as-of.
3. Rate-limit + cache (Node TTL / MacroVol TTL).
4. Fail-closed: empty → `—` / EmptyState, never synthetic market levels.

---

## 2. Product upscale (peer gaps)

### A–C Positioning / Vol / Greeks — **Phase 3 done**

Sticky GEX · session spark · HV/IV · watchlist · regime labels · unit note on Greeks desk.

### D. Macros & Rates

- Auction calendar + FX carry + **Global 10Y (Bund/Gilt/FR/JP)** — **Done**
- Event blindness: Finnhub earnings + SEC 8-K context — **Done**

### E. Crypto

- CoinGecko backup + Deribit−CG basis — **Done**
- **Perp mark vs index board (Bybit)** — **Done**

### F. UX / workstation

- Watchlist — **Done**
- **Browser alerts** (price / IVR / GEX flip) — **Done**
- **Saved desk layouts** — **Done**
- **Strategy builder** (read-only mid + net greeks; full tools on MM Desk) — **Done**

---

## 3. Phased roadmap

### Phase 1 — Cleanup & trust

- [x] Delete DV01 UI / nav / client fetch  
- [x] Remove MacroVol `/api/rates/dv01` endpoint from trader UI path  
- [x] Source badges on new boards (Global yields · Perp · News)  
- [x] Unify Greeks chain note: “same units; source may differ”

### Phase 2 — Free data injections

1. [x] **FX board** — Frankfurter  
2. [x] **Crypto spot backup** — CoinGecko  
3. [x] **Treasury FiscalData** — auctions  
4. [x] **SEC / earnings** — SEC filings + Finnhub next report  
5. [x] **Finnhub news strip** on Home  

### Phase 2.5 — Depth pass

1. [x] FX carry score chips  
2. [x] Auction × curve narrative  
3. [x] Deribit−CoinGecko basis bps  
4. [x] Boot briefing: FX · auction · BTC 24h  
5. [x] Gamma regime labels  

### Phase 3 — Pro positioning

1. [x] Sticky GEX levels  
2. [x] Session GEX history spark  
3. [x] HV/IV overlay on Term  
4. [x] Watchlist + ATM IV rank  

### Phase 4 — Desk polish

1. [x] Strategy builder (read-only P&L + Greeks on Home + Positioning)  
2. [x] Multi-curve rates (EU/UK/FR/JP 10Y via FRED)  
3. [x] Perp basis crypto board (Bybit)  
4. [x] Alerts + saved layouts  

---

## 4. Suggested API env keys

```bash
# Server (.env at repo root — never commit real keys)
FINNHUB_API_KEY=
FMP_API_KEY=
# MacroVol
FRED_API_KEY=
# Optional later
ALPHAVANTAGE_API_KEY=
TWELVE_DATA_API_KEY=
```

---

## 5. What we will not do

- Fake / demo market data when live feeds fail  
- Paid OPRA full tape without a budget decision  
- DV01 toy book in UI  
- Silent mixing of fallback hardcoded yields  
- Finnhub (or any) API keys in browser bundles  

---

## 6. Success metrics

| Metric | Target | Status |
|--------|--------|--------|
| Free API adapters with cache + EmptyState | ≥ 4 | FX · CG · Fiscal · Finnhub · SEC · Global · Perp |
| GEX walls visible without leaving Positioning | Yes | Done |
| Greeks unit mismatch | Zero (note + shared charm convention) | Done |
| DV01 in UI | Gone | Done |

---

## 7. Next action

**Roadmap complete for Phases 1–4.** Optional follow-ups: Alpha Vantage HV bars, Tradier chain, browser WebSocket tape, deeper Bund/Gilt multi-tenor curves when free series exist.
