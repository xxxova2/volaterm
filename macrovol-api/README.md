# MacroVol API (embedded)

FastAPI backend: **FRED** macro/rates + **yfinance** Greeks/IV surface/STIR.

## Run

```bash
# Preferred: put key in macrovol-api/.env
# FRED_API_KEY=...   https://fred.stlouisfed.org/docs/api/api_key.html

# From repo root
npm run macrovol-api
# or
python3 -m uvicorn main:app --app-dir macrovol-api --host 127.0.0.1 --port 8765
```

`ALLOW_STIR_FALLBACK=0` (default) — never mix stale SR3/ZQ fallbacks with live quotes.

## Proxy

Node `server.js`: `/api/macrovol/*` → `MACROVOL_API_URL` (default `http://127.0.0.1:8765`) `/api/*`.

## Data quality notes

| Topic | Rule |
|-------|------|
| Short Tsy curve | `DGS1MO` / `DGS3MO` / `DGS6MO` (not `DGS1M`) |
| Spreads T10Y2Y / T10Y3M | FRED **percentage points** (×100 = bps) |
| Risk-free `r` | Defaults to **live SOFR/100** for surface & greeks |
| Source labels | `FRED` vs `FRED+fallback` — no silent fake “live” |
| GEX | Naive call+/put− dealer convention; not inventory |
| Charm | Per calendar day; exposure = charm × OI × 100 × S |

## Key routes

- `GET /api/rates/summary|plumbing|curve|basis|correlations|curve-history`
- `GET /api/rates/shape` — curve shape + sparklines (2s10s, 5s30s, fly)
- `GET /api/rates/dv01` — generic par-Treasury DV01 book + key-rate scenario
- `GET /api/rates/term-structure?T=` — interpolated r(T) decimal
- `GET /api/macro/summary` · `/api/macro/series/{id}`
- `GET /api/greeks/{ticker}` · `/api/greeks/{ticker}/history` (default r = term structure)
- `GET /api/surface/{ticker}` (default r = term structure)
- `GET /api/stir/strip` — strip + path chart vs SOFR
