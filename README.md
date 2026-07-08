# VOLATERM — AAA+ Options Trading Terminal

Merged from three source projects into one unified institutional-grade options trading terminal.

## Quick Start

```bash
npm run dev
```

Launches Vite dev server (frontend) + Fastify API server (backend) concurrently.

## Features

**Core Terminal (8 tabs)**
- **Vol Surface** — 3D IV surface (Three.js, interactive OrbitControls, color-mapped by IV)
- **Smile/Skew** — IV smile curves per expiry (Recharts, toggle moneyness/strike)
- **Term Structure** — ATM IV vs DTE (sqrt scale, contango/backwardation indicators)
- **Greeks** — Full Greeks heatmap (1st/2nd/3rd order: Delta, Gamma, Theta, Vega, Rho, Vanna, Charm, Volga, Speed, Veta, Color, Zomma, Ultima)
- **Gamma Exposure** — Dealer GEX bar chart with flip point detection
- **Option Chain** — Virtualized chain (react-window v2), calls/puts side-by-side
- **Dashboard** — Portfolio Greeks, expected move, IV regime, key levels, OI by expiry
- **SPY Dist** — 30-year SPY daily return distribution with normal overlay, VaR/CVaR, percentile markers, VIX regime coloring

**Analytics & Risk**
- Portfolio Greeks aggregation
- Scenario analysis (spot ±5% × IV ±20%)
- Breakeven calculator
- Expected Move (1SD from ATM straddle)
- Max Pain calculation
- IV Rank / IV Percentile

**Data Sources**
- **Synthetic demo data** — works fully offline with a realistic SVI-skewed surface. Used automatically whenever no live feed is reachable (no API key, or a live request fails).
- **Live option chain** via **Yahoo Finance** (`yfinance` Python proxy at `/api/options`). This is the default live chain source on the Node/Docker server and the only working live chain source — FMP's `options/symbol` endpoint requires a *paid* FMP plan.
- **Live enrichment** via **Financial Modeling Prep** (FMP): spot (`quote`), risk-free rates (`treasury-rates`), company profile, news, earnings calendar. The Free tier covers all of these. Requires `FMP_API_KEY`.
- **yfinance history/info** (`/api/yf/history`, `/api/yf/info`) for price history and fundamentals on the local/Node server (FMP-primary with yfinance fallback).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript 6, Vite 8 |
| 3D Charts | Three.js, @react-three/fiber, @react-three/drei |
| 2D Charts | Recharts |
| State | Zustand |
| Styling | Tailwind CSS v4, Bloomberg-terminal dark theme |
| Backend | Fastify, Python (yfinance) |
| Virtualization | react-window v2 |

## Architecture

```
src/
├── components/
│   ├── terminal/     # Shell UI (Header, TabNav, Panel, PlaybackBar, StatusBar, Dialogs)
│   ├── layout/       # Main layout + sidebar
│   ├── views/        # 8 tab views (surface/, Smile, Term, Greeks, Gex, Chain, Dashboard, SpyDistribution)
├── hooks/            # useKeyboardShortcuts
├── store/            # Zustand stores (terminalStore, toastStore)
├── lib/
│   ├── options/      # Core: types, black-scholes, greeks, ivSolver, synthetic, analytics, svi, color, yahoo
│   ├── data/        # Data providers (LiveProvider: yfinance chain + FMP/yfinance enrichment, demo provider)
│   ├── format.ts     # Number formatting
│   ├── utils.ts      # cn() classname utility
```

## Keybindings

| Key | Action |
|-----|--------|
| 1-8 | Switch tabs |
| R | Refresh data |
| S | Search symbol |
| Space | Play/pause historical playback |
| ← → | Scrub frames |
| L | Toggle Live/Demo |
| ? | Toggle shortcuts overlay |
| Tab | Cycle tabs |

## Keyboard Shortcuts

Keys 1-8 switch between the 8 tab views. All data panels support:
- Playback bar for scrubbing through 64 historical frames
- Speed control (0.5x, 1x, 2x, 4x)
- Live/Demo toggle

## Environment Variables

See `.env.example` — no API keys required by default.

## Deployment

The app has **two deployment targets that share the same API logic** (see `api/_shared.js`):

| Target | How | What works |
|--------|-----|------------|
| **Vercel** | `vercel.json` builds the SPA; `api/` holds serverless functions (`health`, `fmp/stable/*`, `yf/history`, `yf/info`) | Synthetic demo + FMP enrichment (spot/treasury/profile/news/earnings). Set `FMP_API_KEY` in the Vercel project env. The live option chain is **not** available (no Python runtime). |
| **Docker / Render / Node** | `Dockerfile` → `node server.js` | Everything above **plus** the live Yahoo option chain (via the Python `yfinance` proxy at `/api/options`). |

> Note: The live Yahoo Finance option chain requires a Python runtime (`yfinance`), so `/api/options`
> only works on the Node/Docker server, not on Vercel's JS-only functions. On Vercel the
> terminal runs in synthetic/demo mode (fully functional) and uses FMP (and `yf/*`) for enrichment.

The Vercel FMP proxy and the Fastify proxy share the same endpoint allowlist
(`quote`, `treasury-rates`, `etf/holdings`) defined in `api/_shared.js`.

## Merged From

| Source | Strengths |
|--------|-----------|
| `/home/kalde/iv surface` (uivi) | Full Greeks (1st/2nd/3rd order), SVI parameterization, react-window chain, Plotly.js 3D surface |
| `/home/kalde/newiv` | Polished UI shell, keyboard shortcuts, historical playback, Three.js 3D surface, analytics |
| `trader-terminal-app.zip` | Design predecessor to newiv (no unique features beyond newiv) |
