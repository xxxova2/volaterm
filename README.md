# VOLATERM — AAA+ Options Trading Terminal

Institutional-grade options trading terminal: equity vol, positioning, Greeks, MM desk, crypto (Deribit), and macros & rates.

## Quick Start

```bash
npm run dev
```

Launches Vite (frontend), Fastify API (`server.js`), and MacroVol Python API concurrently.

Default ports: Vite `3000` (or `VITE_PORT`), API `3001` (or `PORT`), MacroVol `8765`.

## Features

**Core desks (7 tabs)**

| Hotkey | Desk | Contents |
|--------|------|----------|
| **1** | **Home** | Dashboard, portfolio strip, deep-links into desks |
| **2** | **Vol Structure** | 3D IV surface, smile/skew, term structure, quality |
| **3** | **Positioning** | Option chain, dealer GEX / γ-flip, key levels, parity edge |
| **4** | **Greeks** | Heatmap, profile, sensitivity, by-expiry, 3D surface |
| **5** | **MM Desk** | Blotter-first MM tools, scenarios, hedging |
| **6** | **Crypto** | Dual BTC/ETH Deribit tape; optional 2× thin charts; full book for active underlier |
| **7** | **Macros & Rates** | FRED/NYFed macro strip, STIR path, SERFF, UST curve, DV01 |

**Analytics & risk**
- Portfolio Greeks, scenario analysis, breakeven, expected move, max pain
- ATM IV from OTM-wing interpolation; dealer-style GEX; SVI readout / no-arb diagnostics

**Data sources**
- **Synthetic demo** — offline SVI surface when live feeds unavailable
- **Live equity chain** — Yahoo Finance (`yfinance` proxy `/api/options`) on Node/Docker
- **FMP enrichment** — spot, treasury, profile, news, earnings (`FMP_API_KEY`)
- **Deribit public** — BTC/ETH options + funding
- **MacroVol** — FRED / NY Fed / rates risk (`macrovol-api` on `:8765`)

**UI system** (see `UI_UX_PLAN.md`, `DESIGN.md`)
- Density dense/readable (**D**), desk section jump **[** **]**, LIVE/DELAYED/STALE freshness
- Virtualized chain & STIR boards, CSV export, imply drawer, collapsible Rates sections

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite |
| 3D / 2D | Three.js + R3F · Recharts |
| State | Zustand |
| Styling | Tailwind CSS v4, terminal dark theme |
| Backend | Fastify, Python yfinance + MacroVol FastAPI |
| Virtualization | react-window v2 |

## Architecture

```
src/
├── components/
│   ├── terminal/     # Shell (Header, TabNav, DeskSubNav, StatusBar, …)
│   ├── layout/       # TerminalLayout + SidePanel
│   ├── common/       # Freshness, VirtualRows, ImplyDrawer, CSV, …
│   ├── macrovol/     # RatesPanel, MacroPanel, ApiSources
│   └── views/        # Desk views (Home, Vol, Positioning, Greeks, Desk, Crypto, Rates)
├── config/           # deskNav, constants
├── hooks/            # keyboard, density, spot stream, …
├── store/            # terminalStore, toastStore
└── lib/
    ├── options/      # BS, greeks, SVI, analytics, Deribit/Yahoo/FMP chain builders
    ├── data/         # DataProvider (Live/Demo), FMP/yfinance/Deribit clients, freshness
    └── macrovol/     # MacroVol HTTP client
```

Product & frontend architecture design: **[`DESIGN.md`](DESIGN.md)**.

## Keybindings

| Key | Action |
|-----|--------|
| `1`–`7` | Switch desks |
| `Tab` | Next desk |
| `[` `]` | Previous / next desk section |
| `D` | Toggle dense / readable density |
| `R` | Refresh data |
| `S` | Symbol search |
| `L` | Toggle Live / Demo |
| `Space` | Play / pause playback |
| `←` `→` | Scrub historical frames (when board unfocused) |
| `↑` `↓` / `j` `k` | Board row focus (chain · SR3 · SERFF · calendars) |
| `y` | Copy focused cell |
| `c` | Focus option chain (Positioning desk) |
| `Esc` | Clear board focus / close overlays |
| `B` / `M` / `V` | Jump Crypto / MM / Vol |
| `?` | Shortcuts overlay |

Playback bar: scrub ~64 frames, speed 0.5×–4× when history is available.

## Environment Variables

See `.env.example` — no API keys required for demo mode.

Useful: `FMP_API_KEY`, `MACROVOL_API_URL`, `PORT`, `VITE_PORT`, `API_TARGET`.

Optional OPRA skeleton (server only, off by default): `OPRA_ENABLED`, `OPRA_VENDOR` — see `DESIGN.md` PR-10.

## Deployment

Two targets share API logic (`api/_shared.js`):

| Target | How | What works |
|--------|-----|------------|
| **Vercel** | SPA + serverless `api/` | Demo + FMP enrichment. No Python chain. |
| **Docker / Node** | `Dockerfile` → `node server.js` | Full stack incl. Yahoo chain + MacroVol proxy |

> Live Yahoo chain needs Python (`yfinance`). On Vercel the terminal runs synthetic surface + FMP enrichment.

## Merged From

| Source | Strengths |
|--------|-----------|
| iv surface (uivi) | Full Greeks, SVI, react-window chain |
| newiv | Shell, shortcuts, playback, Three.js surface |
| trader-terminal-app | Design predecessor |
