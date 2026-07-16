# Free-tier max value playbook

**Date:** 2026-07-15  
**Principle:** Every API we run is free-tier. Clients must get **as much useful free data as the envelope allows**, without burning quotas when many people open the site.

---

## 1. How we avoid multi-call-per-visitor (non-negotiable)

```
Browser  →  GET /api/* only  →  Node shared cache (getOrFetch + TTL)
                                    ↓ miss only
                              Upstream (FRED / Finnhub / AV / …)
                                    ↑
                         Background warmer (single process)
```

| Rule | Implementation |
|------|----------------|
| Keys never in browser | All `*_API_KEY` stay on Node / MacroVol |
| One upstream fill per TTL | `api/upstreamCache.js` → `getOrFetch` + single-flight `inflight` |
| Scarce APIs warmer-owned | Alpha Vantage ~90 min; TradingView ~6 h; FA levels 6 h |
| Generous APIs still cached | Finnhub quote 2 min, news 5 min, eco 6 h, rec/peers 24 h |
| Macro light paths double-cached | MacroVol TTL + Node `MACRO_LIGHT_PREFIXES` |
| Budget headroom | 85% of free daily/monthly caps before soft-stop |
| Fail-closed | Empty/`—`, never synthetic “live” levels |

**If 100 clients open Home in one minute:** they hit **one** warm board, not 100 Finnhub/FRED storms.

---

## 2. MacroVol is not a second app

`macrovol-api/` is the **embedded Python rates/macro/greeks engine** (old MacroVol product brain), proxied as `/api/macrovol/*`.  
There is **no** cross-app “sync” — one terminal, two runtimes (Node + Python). Do not invent a third layer.

---

## 3. Free-tier envelope

| Provider | Free envelope | How we treat it |
|----------|---------------|-----------------|
| **FRED** | Very generous, free key | Batch `/macro/summary` + `/macro/stress`; 5 min shared |
| **NY Fed** | Public JSON | Rates corridor / STIR |
| **yfinance** | Unofficial free | Shared 3 min option chain |
| **Deribit / Bybit / CoinGecko / Frankfurter / FiscalData / SEC** | Public | Shared MacroVol boards |
| **Finnhub** | Free key, high RPM | Quote, news, earnings, eco, rec, peers — shared TTL |
| **FMP** | ~250/day free-ish | Quote/profile/news/history; ETF holdings 24h; options often paid |
| **Alpha Vantage** | **25/day** | Warmer only: quote + daily + overview for desk symbols |
| **TradingView RapidAPI** | ~150/month | Snapshot only, multi-hour TTL |
| **FlashAlpha** | **5/day**, stocks not SPY | Levels only, 6 h cache (no auto GEX) |
| **Massive** | Low free RPM | Optional prev-bar backup (server only) |

---

## 4. Backend vs UI (honest)

### Backend + warmer (shared cache)

| Feature | Endpoint | Cache |
|---------|----------|-------|
| FRED stress pack | MacroVol `/api/macro/stress` | 5m + Node light |
| Eco calendar | `/api/finnhub/economic-calendar` | 6 h |
| Recommendation / peers | `/api/finnhub/recommendation`, `/peers` | 24 h |
| Desk pack | `/api/desk/pack` | Composes **cached** children |
| AV overview + RV20 | warmer + pack derived | 90 min AV; RV20 = **0 extra calls** |
| Massive prev | `/api/massive/prev/:sym` | 1 h (no browser client yet) |

### UI productized (mounted for clients)

| Surface | Component | Data |
|---------|-----------|------|
| Shell free board | `SharedDeskStrip` in `TerminalLayout` | `/api/desk/pack` (eco, rec, peers, RV20, budgets, AV spark) |
| Symbol DES + HIVG | `SecurityDesFromStore` → `SecurityDesCard` | Store: chain ATM IV series, GEX regime, FMP quote/history |
| ETF top weights | `EtfHoldingsStrip` | FMP `etf/holdings` when SPY/QQQ/IWM/DIA |
| News / events | `NewsStrip` on Vol + Positioning | Finnhub news/earnings + SEC via MacroVol |
| Rates stress | `StressStrip` + Boot VIX/HY | `/macro/stress` |
| FA levels | `FlashAlphaStrip` | stocks only; not SPY free |

---

## 5. API → desk tree (clear map)

```
Node server.js  (keys + warmer + getOrFetch)
├── /api/options/*          → Vol / Positioning chain (yfinance)
├── /api/fmp/stable/*       → spot, history, profile, ETF holdings
├── /api/finnhub/*          → quote, news, earnings, eco, rec, peers
├── /api/alphavantage/*     → scarce quote/daily/overview (warmer)
├── /api/tradingview/*      → rare snapshot (warmer)
├── /api/desk/pack          → SharedDeskStrip (compose only)
├── /api/flashalpha/*       → Positioning FA levels
├── /api/deribit/*          → Crypto desk
├── /api/massive/prev/*     → optional backup (server)
└── /api/macrovol/*         → macrovol-api :8765
      ├── rates/* macro/*   → Rates desk, BootBriefing, StressStrip
      ├── greeks/surface    → helpers
      └── crypto/sec/…      → satellites
```

Warmer symbols: **SPY** equities, **BTC** crypto only — do not expand lightly.

---

## 6. Operator checklist

1. Set free keys in server `.env` / `macrovol-api/.env` (never commit).  
2. Run **one** Node process that owns the warmer (Railway).  
3. Run MacroVol on `MACROVOL_API_URL` (default `127.0.0.1:8765`).  
4. Watch `/api/cache/status` budgets (AV day, FH soft, TV month).  
5. Do **not** put Finnhub/AV keys in `VITE_*`.  
6. If AV hits 25/day: lengthen warmer stagger; do **not** grow `DESK_WARM_SYMBOLS`.

---

## 7. Still free value left (later, still cache-first)

| Item | Note |
|------|------|
| Finnhub candles → HV | Only if AV daily empty for non-SPY; do **not** replace HIVG |
| FlashAlpha GEX profile | Manual/budgeted only — free 5/day total with levels |
| Massive as history fallback | When FMP+YF empty |
| More FRED series in stress batch | Extend pack, not new pollers |
| BootBriefing → `/api/boot/briefing` only | Optional coalesce (light paths already OK) |

---

## Related

- `docs/engineering/API_LANDSCAPE_2026-07.md` — free-API / QuantLib / gs-quant research map  
- `docs/engineering/API_PROVIDERS_DEEP_DIVE.md`  
- `docs/engineering/API_PROVIDERS_EVAL.md`  
- `api/upstreamCache.js`  
- `server.js` warmer + `/api/desk/pack`  

