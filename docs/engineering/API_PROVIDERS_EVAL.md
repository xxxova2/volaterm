# Third-party API evaluation (2026-07-13)

**Secrets:** never commit keys. Use Railway / local `.env` only. Keys pasted in chat should be **rotated**.

**Landscape (2026-07):** free-API roundups, Trading Economics, QuantLib, gs-quant —  
see `docs/engineering/API_LANDSCAPE_2026-07.md` (have / skip / P1 map).

---

## FlashAlpha Lab (`lab.flashalpha.com`)

| Item | Finding |
|------|---------|
| Auth | `X-Api-Key` header |
| Free plan | **`daily_limit: 5`** (confirmed via `/v1/account`) — **not** 5/hour |
| Free coverage | **Individual stocks only** (AAPL, MSFT…). **SPY/QQQ/ETFs require Basic+** |
| Useful free endpoints | `/v1/exposure/levels/{symbol}`, single-expiry `/v1/exposure/gex/{symbol}?expiration=` |
| Public (no key) | `/v1/surface/{symbol}` vol grid returned data for AAPL |
| Cache on free | Docs: ~15 min server cache |
| Probe result | Levels for AAPL 200: flip ~317, call wall 330, put wall 300 (as_of sample) |
| Quota after probes | `remaining: 0` for the day |

### Fit for VOLATERM

- **Helps:** external GEX levels for single names; optional cross-check of our OI-inferred GEX; public surface as research input.
- **Does not help (free):** multi-visitor SPY home board; **poll every 15 min** (that would be ~96 calls/day → paid tier).
- **Ship rule:** if integrated later → **server-only**, shared cache **≥4–6h**, max **1–2 calls/day** per symbol, badge `source: flashalpha`, never browser key. Prefer Basic plan before production SPY.

### Recommendation

**Do not wire aggressive polling before deploy.** Document only; optional post-deploy feature with hard daily budget when plan upgrades or surface public path is carefully rate-limited.

---

## Massive (`api.massive.com`)

| Item | Finding |
|------|---------|
| Auth | Query `apiKey=` (Polygon-compatible style) |
| Probe | `GET /v2/aggs/ticker/AAPL/prev` → **200**, OHLC+volume |
| Also | Same key works on `api.polygon.io` path style for aggs (same JSON) |
| Free tier (marketing) | Stocks tickers, low RPM (e.g. ~5/min), limited history — verify dashboard |

### Fit for VOLATERM

- **Helps:** equity daily/prev bar backup or alternate to FMP for spot path / GP spark.
- **Does not replace:** full option chains, MacroVol rates, Greeks surfaces.
- **Ship rule:** server-only env `MASSIVE_API_KEY`; optional provider behind existing quote/history adapters.

### Recommendation

**Useful as stock bar backup.** Wire later as optional FMP fallback; not a blocker for deploy.

---

## Rate-limit myth check

| Claim | Reality (this eval) |
|-------|---------------------|
| FlashAlpha 5 calls / hour | **False** — free is **5 / day** |
| Poll GEX every 15 min free | **Not OK** on free |
| Free SPY GEX | **Blocked** (Basic+) |

---

## Env placeholders (see `.env.example`)

```bash
# FLASHALPHA_API_KEY=   # server-only; free = 5/day, stocks only
# MASSIVE_API_KEY=      # server-only; stock aggs
```
