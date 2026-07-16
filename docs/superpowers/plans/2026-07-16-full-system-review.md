# Full System Review Plan — VOLATERM / trading-terminal-pro

**Review ID:** `bc8048e0`  
**Date:** 2026-07-16  
**Mode:** Hybrid product + engineering review (not PR-only)  
**Scope intent:** Desk visual waves W1–W6 + surrounding app (frontend, API, macrovol, math, browser visuals, sync)  
**Deliverable:** Single findings report with severity, evidence, and recommended fixes. No drive-by code changes unless user asks to fix.

---

## 0. Goals (success criteria)

| # | Goal | Evidence of done |
|---|------|------------------|
| G1 | Surface real bugs (crash, wrong math, stale data, broken routes) | Repro steps or failing test / console error |
| G2 | Verify desk kit waves W1–W6 still green | Kit tests pass; browser smoke per desk |
| G3 | Math integrity on options / rates / greeks paths | Unit tests + spot-check formulas vs known values |
| G4 | API / proxy / cache correctness | Health + sample endpoints; fail-closed behavior |
| G5 | Frontend sync: store ↔ UI ↔ feeds | Symbol/mode changes propagate; no ghost Live badges |
| G6 | Visual density: Thalex craft + BBG desk vs Academy publication | Screenshots / DOM token checks |
| G7 | Backend logical review (Node server + macrovol FastAPI) | Route map, error paths, cache TTL honesty |
| G8 | Produce prioritized fix backlog | P0/P1/P2 list with owners (code paths) |

**Out of scope unless blocking:** New features, full Greeks redesign, Crypto Thalex embed redesign, vendor switches.

---

## 1. Draft plan (v1)

### Track A — Inventory & blast radius
1. Map routes: `deskNav`, `functionRegistry`, `tabs`, `renderDeskView`
2. List kit surfaces: Trade tools, Flow, Smile/Term/Fit, Rates, Home chrome, Academy
3. List APIs: `server.js`, `api/*`, `macrovol-api/main.py`, client wrappers
4. Diff awareness: large staged+unstaged tree; treat as **working tree truth**, not only commits

### Track B — Automated verification
1. `npx vitest run` on kit clusters + options/analytics + rates + academy
2. `npm run type-check` (or `tsc --noEmit`)
3. Optional: `npm run lint` if fast
4. macrovol: `pytest` / unit tests if present for greeks/iv

### Track C — Logical / math search
1. Grep for: `Live ·`, fake live, hard-coded mock as real, `Math.random` in production paths
2. Options: BS, greeks, IV, surface metrics, reprice — run tests; spot-check edge cases (T=0, deep ITM)
3. Rates: SOFR/yield axes, compare mode units (bp vs %)
4. Positioning/GEX: sign conventions, dealer mode labels
5. Cache stampede / stale: `upstreamCache`, `greeksCache`, store TTL

### Track D — Sync / state bugs
1. `terminalStore` symbol / desk / section changes
2. Spot stream vs static spot tools (`useSpotPath`, `useSpotStream`)
3. Shared strips (DES, HistIV, ThreeVol) vs underlying symbol
4. Academy news “Board · SYM” honesty vs Finnhub fail-closed

### Track E — Frontend review
1. Dead imports / broken lazy routes
2. Accessibility: tabs, focus, empty states
3. Console errors on main desks (browser)
4. CSS token leaks: desk black-field on Academy; terminal chrome on publication surfaces

### Track F — API / backend review
1. Health endpoints (3001, 8765)
2. Proxy paths: FMP, deskFeeds, Finnhub, Yahoo, FRED
3. Error mapping: 4xx/5xx → UI messages (no silent empty)
4. Auth/env: `.env.example` vs required keys; no secrets in client bundle
5. Rate limits / cache headers honesty

### Track G — Browser visual smoke
1. Home / Launchpad
2. Trade: one chart tool + one matrix tool
3. Flow / Positioning
4. Smile + Term
5. Rates curves + compare
6. Academy: archive list, article, news, glossary
7. Capture console + network failures

### Track H — Synthesis
1. Dedupe findings across tracks
2. Severity: **P0** crash/wrong money math/data lie · **P1** broken desk/sync · **P2** visual/slop · **P3** nits
3. Write report + optional fix plan

---

## 2. Weakness critique (reread of v1)

| Weakness | Why it hurts | Mitigation in v2 |
|----------|--------------|------------------|
| Scope is “whole repo” → shallow review | Miss deep bugs in one area | Cap deep dives: **desk kit + options math + rates + feeds + academy**; sample rest |
| No time box / parallelization | Serial browser + tests waste hours | Run automated tracks first in parallel; browser after green baseline |
| “All working / using all” ambiguous | Over-promise every vendor | Define **must-work paths** vs **optional when key missing** |
| Math track without oracles | False confidence | Prefer existing oracle tests (`test_quantlib`, greeks tests); flag missing oracles |
| Diff is huge (staged mix of docs+code) | Noise drowns bugs | Separate **product code** review from **docs-only** noise |
| No explicit “regression of W1–W6 acceptance” | Visual waves could have regressed silently | Checklist from each wave plan’s done criteria |
| Missing production `server.js` vs Vite proxy parity | Dev works, prod fails | Compare Vite proxy + server routes |
| No race / double-fetch review | Sync bugs | Check abort controllers / effect deps on symbol change |
| Browser without fixed symbol/fixtures | Flaky live market | Prefer mock-friendly routes; record fail-closed when keys absent |
| No security pass | API keys in frontend | Quick check: client-side secret patterns, CORS |
| Single reviewer bias | Miss class of bugs | Parallel subagents: math, API, FE kit |

---

## 3. Enhanced plan (v2) — EXECUTE THIS

### Phase 0 — Freeze context (10 min)
1. Record ports: Vite 3000, API 3001, macrovol 8765 (already listening)
2. Capture `git status` summary counts (code vs docs)
3. Write findings file: `docs/superpowers/plans/2026-07-16-full-system-review-findings-bc8048e0.md`

### Phase 1 — Must-work path matrix (define “using all”)

| Path | Must work | When key missing |
|------|-----------|------------------|
| App shell, nav, desks | Yes | N/A |
| Trade tools (local math) | Yes offline | N/A |
| Spot path / hist when Yahoo/proxy ok | Best effort | Honest empty |
| Rates FRED/curves | Best effort | Empty + message |
| Academy MD archive | Yes (local docs) | N/A |
| Academy Finnhub news | Optional | Fail-closed, no fake Live |
| Macrovol IV/greeks | Best effort | Error banner |
| Positioning GEX | Best effort | Empty state |

### Phase 2 — Automated gate (parallel)

```text
A2.1  vitest: desk kit + academy + volSecondary + homeChrome + positioning kit
A2.2  vitest: options analytics, reprice, surfaceMetrics, chartTheme
A2.3  vitest: rates curves tests, deskNav, functionRegistry
A2.4  type-check (tsc --noEmit)
A2.5  macrovol unit tests (greeks, iv, quantlib if runnable)
A2.6  node api tests: upstreamCache, fmp slug if present
```

**Gate:** Note failures as P0/P1 before browser (don’t claim green).

### Phase 3 — Static deep search (parallel greps + file reads)

| Search class | Patterns / files |
|--------------|------------------|
| Fake live / honesty | `Live ·`, `isLive`, `mock`, `DEMO` |
| NaN / infinity paths | `toFixed`, missing `Number.isFinite` |
| Sync antipatterns | missing deps, no abort, race on symbol |
| API double sources | two clients for same feed |
| Token leaks | Academy using desk black / `bg-black` wrongly |
| Dead routes | registry IDs not in renderDeskView |
| Math hotspots | `bs.ts`, greeks, `analytics.ts`, `reprice.ts`, rates transforms |

### Phase 4 — Logic review (human/agent, targeted)

1. **Options:** reprice path, combo PnL, BE matrix spot highlight consistency  
2. **Rates:** axis units, compare series alignment, SOFR labeling  
3. **Positioning:** GEX sign, session heatmap vs strip  
4. **Feeds:** deskFeeds vs finnhub vs flashalpha — who owns what  
5. **Cache:** TTL vs UI “as of” labels  

### Phase 5 — Browser visual + network (Chrome DevTools MCP)

Order (fixed symbol e.g. SPY where applicable):

1. `/` or home → Launchpad density  
2. Trade desk → Simulator + Break-even  
3. Flow / Positioning  
4. Smile → Term  
5. Rates  
6. Academy → News → Glossary → open one MD article  

For each: screenshot mental note, console errors, failed XHR (4xx/5xx), wrong chrome.

### Phase 6 — API live probes (curl)

```text
GET /api/health (or equivalent)
GET macrovol /health
Sample deskFeeds / history / rates endpoints with short timeout
Confirm fail-closed JSON shape when unconfigured
```

### Phase 7 — Code review subagent (local product delta)

Focus on **src/**, **api/**, **macrovol-api/**, **server.js** (skip pure docs noise).  
Persona: correctness, regressions, security of secrets.

### Phase 8 — Synthesis report

Structure:

1. Executive summary (ship-ready? confidence)  
2. Automated results table  
3. P0 / P1 / P2 findings with file:line + evidence  
4. Wave W1–W6 acceptance checklist  
5. “Using all” vendor matrix (configured vs unused)  
6. Recommended next actions (fix order, not implement unless asked)

---

## 4. Execution rules

- **Evidence before claims** (verification-before-completion).  
- **Read-only** for this review pass — no “while we’re here” refactors.  
- Prefer **surgical greps + tests + browser** over full-repo rewrite.  
- If blocked (no API key), document as **environmental**, not product bug, unless UI lies.  
- Land findings in one markdown file; optional copy under `docs/superpowers/plans/`.

---

## 5. Wave acceptance mini-checklist (W1–W6)

| Wave | Accept |
|------|--------|
| W1 Trade | DeskToolShell + DeskChart + 12 tools; no slop defaults |
| W2 Flow | Positioning kit density; honest empty |
| W3 Vol | Smile/Term/Fit secondary charts kit |
| W4 Rates | Axes + compare polish |
| W5 Home | Chrome density Launchpad/header/strips |
| W6 Academy | `academy-*` tokens only; Board · SYM; no desk black field |

---

## 6. After review (user decision)

- Fix P0s only  
- Fix P0+P1  
- Commit waves  
- Defer  

Do not auto-fix after report unless user says so.
