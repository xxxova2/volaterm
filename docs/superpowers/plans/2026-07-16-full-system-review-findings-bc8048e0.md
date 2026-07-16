# Full System Review Findings — `bc8048e0`

**Date:** 2026-07-16  
**Plan:** `docs/superpowers/plans/2026-07-16-full-system-review.md` (v2 enhanced)  
**Reviewer notes:** `/tmp/grok-1000/grok-review-bc8048e0.md`  
**Mode:** Read-only (no product code fixes in this pass)

---

## 1. Executive summary

**Ship readiness for W1–W6 visual polish: yes**, with **known P0/P1 logic debt outside the pure chrome waves**. Automated gates are green; local health endpoints respond; secrets stay server-side; Academy publication chrome is correctly separated from desk black-field kit.

**Dominant risks are not “sloppy charts” — they are data-sync and pricing-basis honesty:**

1. **Stale-symbol enrichment** after symbol switch (DES/history/news can lag or paint the previous underlier).  
2. **Year-fraction split-brain**: chain/reprice use continuous 16:00 ET; many Trade tools still use bare `dte/365`.  
3. **MacroVol proxy can cache non-2xx bodies** (fail-sticky errors).  
4. **`computeGreeks` lacks T/σ guards** → possible NaN propagation.

Browser MCP **could not run** (Chrome binary missing on host). Visual W1–W6 acceptance relies on kit tests + static token review, not live screenshots.

---

## 2. Plan → critique → enhancement (what we ran)

### Draft (v1) weaknesses caught

| Weakness | Mitigation applied |
|----------|-------------------|
| Whole-repo shallow pass | Deep dives: store sync, T basis, cache, greeks, academy tokens |
| No “must-work” matrix | Phase 1 path matrix (offline Trade math vs optional Finnhub) |
| Math without oracles | Ran BS/greeks units/reprice/analytics vitest (48/48); Python greeks import OK; pytest not installed |
| Docs noise in dirty tree | Focused product `src/`, `api/`, `macrovol-api/`, `server.js` |
| Single reviewer | Parallel automated gates + dedicated read-only code reviewer |
| No browser fallback | Documented Chrome MCP failure; used API curls + unit/kit tests |

### Evidence gates (fresh this session)

| Gate | Result |
|------|--------|
| `tsc --noEmit` | **Pass** |
| Vitest desk/academy/options/chartTheme cluster | **51 files, 223 tests pass** |
| Vitest rates/nav/deskSection/api | **9 files, 52 tests pass** |
| Math subset (BS, greeks units, reprice, analytics) | **48/48 pass** |
| `GET :3001/api/health` | **200** `{"status":"ok"}` |
| `GET :8765/health` | **200** |
| `GET :3000/` (Vite) | **200** |
| boot briefing / rates summary / finnhub news | **200** with real payloads |
| options SPY / yf history | **200** structured JSON |
| macrovol pytest | **Blocked** — `No module named pytest` (import of greeks module still OK) |
| Chrome DevTools MCP | **Blocked** — Chrome stable binary not on host |

Working tree: ~**84 files / +4.6k −1.7k** vs HEAD (product + docs mix); branch **ahead of origin/master by 17** commits (W1 Trade commits landable; W2–W6 largely uncommitted in working tree).

---

## 3. Findings (prioritized)

### P0 — Fix soon (wrong underlier or sticky bad API)

#### P0.1 Stale enrichment writes after symbol change
- **Where:** `src/store/terminalStore.ts` ~790–848 `fetchLiveEnrichment`
- **What:** After `Promise.all` of quote/history/profile/news, state is set **without** `liveFetchGen` / current-symbol check. Chain load is gen-gated; enrichment is not.
- **Impact:** Fast AAPL→SPY can show SPY chain with AAPL quote/history/news/DES.
- **Fix:** Capture `gen` + `upper` at start; after await, abort if mismatch. Same gate on poll spot refresh.

#### P0.2 SSE spot ticks vs store symbol during teardown
- **Where:** `src/hooks/useSpotStream.ts` ~54–110
- **What:** Filters tick.symbol vs effect symbol, but not `getState().symbol` before write; window between `setSymbol` and EventSource close can write previous underlier into `fmpSpot` / `fmpQuote`.
- **Fix:** Require `getState().symbol` match before any setState.

#### P0.3 MacroVol proxy caches error responses
- **Where:** `server.js` ~1597–1617 + `api/upstreamCache.js` `getOrFetch` always `store.set` on loader resolve
- **What:** Loader returns `{ status, body }` for **any** HTTP status; getOrFetch treats that as success and caches it. 5xx sticky until TTL.
- **Fix:** Only cache `status` 2xx; on 5xx throw (allow last good stale) or short negative cache.

### P1 — Pricing honesty / NaN safety

#### P1.1 Trade tools use `dte/365` while live chain uses continuous T
- **Where:** `optionGrid.ts`, `breakEven.ts`, `portfolio.ts`, `greeksPnl.ts`, `subjective.ts`, `surfaceTools.ts`, `basis.ts`, `hedging.ts`, … vs `reprice.ts` / `yahoo.ts` using `yearFractionFromSlice` / `yearFractionToExpiry`
- **Impact:** 0DTE midday Grid/BE/PnL can disagree with Vol desk greeks for same quote.
- **Fix:** Route pricing T through `yearFractionFromSlice`; keep calendar dte for labels only; add 0DTE fixture test.

#### P1.2 `computeGreeks` no T/σ/finite guards
- **Where:** `src/lib/options/greeks.ts` ~36–48
- **What:** Divides by `volSqrtT` immediately; Python returns `None` for `T<=0` or `σ<=0`.
- **Impact:** NaN δ/γ → polluted GEX if bad IV/T slips through.
- **Fix:** Mirror Python early return; harden unit tests.

#### P1.3 “Live” badge on quote-only
- **Where:** `SidePanel.tsx` `liveAvailable || chainAvailable → 'Live'`
- **Impact:** Green Live without chain surface.
- **Fix:** “Spot only” / “Waiting” / require `chainAvailable`.

### P2 — Operational / UX

| ID | Issue | Notes |
|----|--------|-------|
| P2.1 | Stale-on-error without payload `stale: true` flag | Clients hard to label “stale FRED” |
| P2.2 | Recharts `width(0) height(0)` noise in tests | Kit works; jsdom layout artifact |
| P2.3 | RatesPanel `act(...)` warnings in tests | Hygiene |
| P2.4 | THREE.js multi-instance warning | Greeks 3D path |
| P2.5 | Synthetic spot path for PnL tools | Documented fallback; OptionPnl shows `synth` — OK if always labeled |
| P2.6 | macrovol pytest not installed in env | Gaps oracle CI |
| P2.7 | No browser visual proof this host | Install Chrome or use remote smoke |

### P3 — Nits

| ID | Issue |
|----|--------|
| P3.1 | Greeks10 formula chips omit market unit scaling (vega/100, theta/365) |
| P3.2 | `X-MacroVol-Upstream` header exposes internal URL |
| P3.3 | IV Newton: add `Number.isFinite(vol)` mid-loop |

---

## 4. Wave acceptance W1–W6

| Wave | Status | Notes |
|------|--------|-------|
| W1 Trade | **Kit OK / T basis partial** | Shell + 12 tools + tests; bare dte/365 remains in math helpers |
| W2 Flow | **OK** | Kit tests pass; GEX signs aligned TS↔Python (reviewer) |
| W3 Vol secondary | **OK** | Kit green; enrichment race can desync chrome |
| W4 Rates | **OK** | Axes/compare tests green; progressive load + cancelled flags |
| W5 Home | **OK** | homeChrome kit green |
| W6 Academy | **OK** | `Board · SYM`, academy tokens, kit bans fake Live |

---

## 5. “Using all” vendor / path matrix

| Path | Observed this session |
|------|----------------------|
| App shell Vite :3000 | Up |
| Node API :3001 health, cache, boot, options, yf, finnhub news | Working |
| MacroVol :8765 health, rates, macro summary, OpenAPI docs | Working |
| FMP via enrichment/cache | Cache shows options/deribit/boot keys — in use |
| Finnhub news | Returns real headlines |
| FRED rates via macrovol | SOFR/EFFR/yields present |
| FlashAlpha / Massive / AV | Proxied in server; not deep-probed every path |
| Client secrets | No FMP/Finnhub keys in `src/` — server only |
| Academy local docs | Component path ready; browser not verified |

---

## 6. Frontend / API / backend logic (condensed)

### Frontend
- Desk kit components + tests solid; Recharts zero-size only in jsdom.
- Academy reskin complete; shared **shell** Live badge may still show over Academy tab (shell issue, not article).
- Rates cancel flags OK; store enrichment race is the main sync hole.
- Spot stream closes on symbol change (good) but lacks store-symbol recheck on tick.

### API (Node)
- Broad proxy surface (FMP, Finnhub, Deribit, YF, desk, macrovol) with rate buckets.
- Cache infrastructure real and used; **error-body caching** is the critical logic bug.
- Health + cache status operational.

### Backend (MacroVol)
- Healthy; rates/macro units annotated (`spread_unit`, macro `units`).
- Greeks calculator importable; full pytest suite not run (missing package).

### Math
- BS + market greeks unit goldens green.
- GEX conventions aligned.
- Split T basis is the largest systematic math debt.

---

## 7. Recommended fix order (when you say go)

1. **P0.1 + P0.2** gen/symbol gates (sync) — highest user-facing wrongness  
2. **P0.3** cache only 2xx for MacroVol/FMP loaders  
3. **P1.1** unify year fraction on Trade pricing  
4. **P1.2** `computeGreeks` guards  
5. **P1.3** Live badge honesty  
6. P2/P3 as capacity allows  

Optional hygiene: install `pytest` in macrovol env; full `vitest run`; commit W2–W6 + review plan docs.

---

## 8. What was not done

- Live browser screenshots / a11y walk (Chrome missing)  
- Exhaustive every-proxy smoke (FlashAlpha, Massive, earnings calendar, SSE long soak)  
- Full-repo lint  
- Code fixes (read-only by plan)

---

## 9. Bottom line

**Visual waves W1–W6 are in good automated shape.**  
**Do not treat the product as “all green on logic”** until P0 sync + error-cache and P1 T-basis/greeks guards are addressed.  

Say whether to **fix P0 only**, **P0+P1**, **commit waves**, or **another pass** (e.g. after Chrome available).

---

## 10. Fixes applied (2026-07-16, same session)

| ID | Fix |
|----|-----|
| P0.1 | `fetchLiveEnrichment` gen + symbol gate after await |
| P0.1b | Spot poll symbol gate; only patch matching snapshot.symbol |
| P0.2 | `useSpotStream` rechecks store symbol + closed flag |
| P0.3 | MacroVol loader throws on non-2xx; `getOrFetch` `cacheIf` + `stale` |
| P1.1 | Trade pricing → `yearFractionFromSlice` (grid, BE, portfolio, greeksPnl, subjective, surface SVI, basis, hedge) |
| P1.2 | `computeGreeks` T/σ/finite guards |
| P1.3 | SidePanel + SurfaceTools: Live / Spot only / Waiting |
| P2/P3 | IV Newton finite break; Greeks10 unit copy; X-MacroVol-Upstream gated; expiry close cache |

**Verify:** type-check pass; 208 tests (options+desk+SidePanel+SurfaceTools+upstreamCache) pass.
