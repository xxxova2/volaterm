# Security Review — trading-terminal-pro

Reviewed: full stack — Fastify server (`server.js`), Node API helpers (`api/`), FastAPI macro service (`macrovol-api/`), Python fetchers, config files, and git history.

Overall the code is **better than average**, but there are two concrete issues worth fixing.

---

## Critical / High

### 1. Unauthenticated debug endpoints reachable through the public proxy — **FIXED**
**Was:** Node catch-all `/api/macrovol/*` forwarded debug routes; FastAPI debug always on.

**Now:**
- Node rejects `/api/macrovol/debug/*` with 404 before proxy (`isMacroDebugPath` in `server.js`).
- FastAPI debug routes require `MACROVOL_DEBUG=1` (default off).
- Error hint no longer recommends `--host 0.0.0.0`.

### 2. Live API keys sitting in `.env` on disk
`.env` contains real keys (Finnhub, Alpha Vantage, RapidAPI, Massive, FlashAlpha). Good news: `.gitignore`/`.dockerignore` are correct and git history contains **none** of them (verified), and `.env.example` is clean. Risk is if the folder is copied, backed up, zipped, or `.gitignore` is ever removed — the keys could leak or be pushed.

**Fix:** rotate all five keys now (treat as exposed), and rely on the platform secret stores that are already wired (Render `sync:false`, Vercel env). Keep the real `.env` out of any archive. *(Ops action — not a code change.)*

---

## Medium

### 3. Broad CORS + key-presence disclosure — **FIXED**
- CORS no longer accepts arbitrary `*.up.railway.app`; only localhost, `CORS_ORIGIN` list, and exact `RAILWAY_PUBLIC_DOMAIN` / `RAILWAY_STATIC_URL`.
- `/api/health` no longer returns key status. `/api/cache/status` only includes `keys` when `EXPOSE_KEY_STATUS=1`.

---

## Low / Hygiene

### 4. FastAPI CORS `allow_origins=["*"]` (main.py:27)
Safe **only** because the service is meant to be localhost-only. The `0.0.0.0` hint (server.js:1281) is the footgun that would make this exploitable.

### 5. No security headers / HTTPS enforcement
Fastify sets no CSP, HSTS, or `X-Content-Type-Options`. Add an `onSend` hook, and enforce HTTPS at the edge (Vercel/Render).

### 6. Unbounded FRED series fetch
`/api/macro/series/{series_id}` (main.py) forwards any FRED series id. Public data, but unauthenticated + uncached — easy to hammer. Add an allowlist or cache.

---

## What's done well (keep it)

- **SSRF contained:** FMP proxy uses a strict endpoint allowlist (`api/_shared.js`, `FMP_ALLOWED_ENDPOINTS`); macrovol target host is fixed to `127.0.0.1`; `validateSymbol` regex in `server.js` constrains all symbol inputs. No path/URL injection to internal hosts.
- **No command injection:** Python fetchers are called via `execFile` with **array args** (`server.js:248,289`) and validated symbols — no shell.
- **No XSS sinks:** no `dangerouslySetInnerHTML`/`innerHTML`/`eval`/`new Function` in the frontend; React escapes by default.
- **Fail-closed market data:** synthetics only injected when explicitly allowed; otherwise `null`/`503` (good for a finance app where fake numbers are dangerous).
- **Secrets handled correctly** in CI/deploy: `.env` excluded from git and Docker; Render/Vercel use dashboard secrets.

---

## Recommended priority order
1. ~~Gate/block the `debug/*` endpoints~~ **done** (proxy 404 + `MACROVOL_DEBUG=1`).
2. Rotate the five `.env` keys (ops — still required).
3. ~~Tighten CORS + remove key-presence from public health~~ **done** (`EXPOSE_KEY_STATUS=1` for ops cache status).
4. Add security headers; keep FastAPI on localhost only.
