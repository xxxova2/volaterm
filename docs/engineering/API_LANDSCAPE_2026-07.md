# Free API / quant-lib landscape (2026-07)

**Principle:** free-tier only · keys server-side · shared cache · fail-closed · no multi-call-per-visitor.

Research inputs: DEV free-API roundup, Trading Economics API page, MagniData economic APIs, FindMyMoat free feeds, Forex Factory news thread (login-walled), `goldmansachs/gs-quant`, `lballabio/QuantLib`.

---

## Already integrated (do not re-add)

| Provider | Role |
|----------|------|
| FRED | Macro/rates stress, curves |
| yfinance | Equity option chain SoR |
| Finnhub | Quote, news, eco, rec, peers |
| Alpha Vantage | Scarce warmer (quote/daily/overview) |
| FMP | Spot/profile/history when keyed |
| CoinGecko / Deribit / Bybit | Crypto |
| Frankfurter | FX |
| FiscalData | Auctions |
| SEC (partial) | Filings context |
| FlashAlpha | Budgeted positioning levels |
| Massive | Optional prev-bar backup |
| TradingView RapidAPI | Rare snapshot warmer |

---

## Roundup verdicts

| Source | Verdict | Reason |
|--------|---------|--------|
| Marketstack / Twelve Data / OXR / Currencylayer | **Skip** | Duplicate quotes/FX; extra quotas |
| Bank Logos | **Skip** | Not a vol desk need |
| IEX Cloud | **Skip (now)** | Free-tier / redistribution risk |
| Trading Economics API | **Skip free product** | Real API paid (~$149+/mo); calendar overlaps Finnhub+FRED |
| World Bank / IMF / OECD | **P2** | Macro context; heavy schemas |
| DB.nomics | **P1 candidate** | Free aggregator; use only allowlisted series that parse cleanly |
| OFR data API | **P1 ship** | Keyless `data.financialresearch.gov` — NY Fed BGCR/TGCR/SOFR |
| ECB Data Portal | **P1 ship** | Keyless SDMX JSON — e.g. deposit facility rate |
| BIS / BOE / BOJ | **P2** | Primary macro; lower urgency |
| CME FedWatch | **Edu link only** | Free web tool; API paid — no scrape |
| OpenBB | **Not a data source** | Connector shell |
| Social/alt (ApeWisdom, Quiver, UW) | **Skip free product** | Noisy; paid cores |
| Forex Factory scrape | **Skip** | Login / ToS; news = Finnhub |

---

## gs-quant (Goldman)

- Open-source toolkit **plus** Marquee platform APIs.
- README: **client id + secret for institutional GS clients** required for market/risk APIs.
- Offline econometrics exist but we already implement RV/returns; **do not add production dependency** without Marquee.
- Use as: design inspiration + Academy note only.

## QuantLib

- True free/OSS quant library (C++ / Python SWIG).
- **Ship as optional CI oracle** for BS price/greeks goldens — not runtime surface engine.
- Industrial BlackVarianceSurface/SABR is over-scope for delayed free chains.

---

## Shipped from this review

| Item | Location |
|------|----------|
| Landscape doc | this file |
| OFR BGCR/TGCR + ECB DFR free board | MacroVol `/api/macro/primary` |
| QuantLib optional oracle tests | `macrovol-api/services/test_quantlib_oracle.py` |

## Explicit non-goals

Adding every free stock API · TE as free · gs-quant runtime · QuantLib live surface · social “smart money” badges without noise labels.

## Related

- `docs/engineering/FREE_TIER_MAX_VALUE.md`
- `docs/engineering/API_PROVIDERS_EVAL.md`
- `docs/engineering/API_PROVIDERS_DEEP_DIVE.md`
