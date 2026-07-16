# The greeks, in the order that matters


---

## 1. Purpose of greeks

Greeks are **sensitivities** of option value (or portfolio value) to market state variables. They answer:

- How much do I make/lose if spot moves $1?  
- If a day passes with nothing else changing?  
- If implied vol rises one point?  
- How do those answers **themselves** change when the market moves?

Without greeks, an options book is a black box. With only delta, you still miss the risks that define options: convexity and volatility.

---

## 2. First-order greeks

### Delta (Δ)
\[
\Delta = \frac{\partial V}{\partial S}
\]

- Calls: typically \(0\) to \(+1\) (equity, non-dividend nuances aside).  
- Puts: typically \(-1\) to \(0\).  
- Portfolio delta = share-equivalent exposure.

**Uses:** directional risk, hedge ratios, “probability ITM” intuition (rough under BS assumptions).

### Vega (ν)
\[
\nu = \frac{\partial V}{\partial \sigma}
\]

- Positive for long options (calls and puts).  
- Larger for longer-dated ATM options, all else equal.  
- Market convention often: P&L per **1 vol point** (e.g. 20% → 21%).

**Uses:** pure vol views, surface trades, event premium.

### Theta (θ)
\[
\theta = \frac{\partial V}{\partial t}
\]

- Usually negative for long options (decay).  
- Short θ is compensation, not free income (see *Theta Is Not Free Money*).

**Uses:** carry of premium structures; calendar budgeting; weekend/event caveats.

### Rho (ρ)
\[
\rho = \frac{\partial V}{\partial r}
\]

- Small for short-dated equity options.  
- Larger for LEAPs and rates-sensitive products.  
- Calls typically positive, puts negative (equity BS).

**Uses:** rates regimes, deep long-dated books; less central for 0DTE.

---

## 3. Second-order greeks (the options core)

### Gamma (Γ)
\[
\Gamma = \frac{\partial^2 V}{\partial S^2} = \frac{\partial \Delta}{\partial S}
\]

- Long options: Γ > 0.  
- Peaks near ATM and short dated.  
- Drives **rehedging frequency** and dealer flow narratives.

**Uses:** realized vol vs implied; pin risk; GEX construction.

### Vanna
\[
\mathrm{Vanna} = \frac{\partial^2 V}{\partial S\,\partial \sigma} = \frac{\partial \Delta}{\partial \sigma} = \frac{\partial \nu}{\partial S}
\]

- Links spot hedges to vol shocks.  
- Critical for skew and crash books.

### Volga (vomma)
\[
\mathrm{Volga} = \frac{\partial^2 V}{\partial \sigma^2} = \frac{\partial \nu}{\partial \sigma}
\]

- Convexity in vol space.  
- Wing options and short vol-of-vol risks.

### Charm (delta decay)
\[
\mathrm{Charm} = \frac{\partial \Delta}{\partial t}
\]

- How hedges drift as time passes **even if spot is flat**.  
- Core of “path of least resistance through the day” narratives for dealers.

*(Other cross terms exist; these four second-order ideas cover most desk talk.)*

---

## 4. Third-order and specialty greeks

| Greek | Sensitivity | When it matters |
|-------|-------------|-----------------|
| **Speed** | ∂Γ/∂S | Large spot moves, gamma profile shape |
| **Zomma** | ∂Γ/∂σ | Vol regime shifts changing gamma maps |
| **Color** | ∂Γ/∂t | Gamma decay into expiry |
| **Veta** | ∂ν/∂t | Vega decay / term structure of vol risk |
| **Ultima** | higher vol derivatives | Exotic / vol-of-vol desks |

Retail traders rarely hedge these directly. Understanding that **gamma itself moves** prevents false confidence in a single Γ number.

---

## 5. Portfolio aggregation

For a multi-strike, multi-expiry book:

\[
\Delta_{\text{port}} = \sum_i q_i \Delta_i,\quad
\Gamma_{\text{port}} = \sum_i q_i \Gamma_i,\quad \ldots
\]

(with consistent units: per share, per contract multiplier, or dollar delta).

**Dealer positioning analytics** (GEX/DEX) are essentially **aggregated, signed, OI-weighted** greeks under an assumption about who is long/short (often: customers long options ⇒ dealers short ⇒ flip signs). Always read the **convention badge** on the Positioning desk.

---

## 6. Unit discipline (non-negotiable)

Ambiguous units create fake risk:

- Delta in **shares** vs **%** vs **dollars per 1%**.  
- Gamma per **$1** vs per **1%**.  
- Vega per **1 vol point** vs per **1% relative**.  
- Charm per **day** vs per **hour**.

This terminal’s Explain / glossary entries state conventions for on-screen metrics. When comparing to another platform, convert units first.

---

## 7. Hedging ladder (conceptual)

| Goal | Primary greek | Secondary risks |
|------|---------------|-----------------|
| Flatten direction | Hedge Δ | Charm/vanna will re-open Δ |
| Reduce convexity | Trade Γ (options vs options) | Changes ν, θ |
| Express pure vol | Vega-neutralize Δ | Volga, vanna, skew dynamics |
| Survive crash | Skew / wing / vanna-aware | Liquidity, gap risk |

There is no fully greek-neutral liquid book without dynamic trading and basis risk.

---

## 8. Terminal map

| Greek | Typical view |
|-------|----------------|
| Δ Γ θ ν | ATM cards, chain, Greeks desk |
| Vanna / volga / charm | Higher-order profiles, MacroVol grids |
| Full stack | Greeks 10-view / sensitivity |
| Aggregated dealer | GEX (γ), DEX (Δ), charm pressure |

---

## 9. Key takeaways

1. First-order = level risks; second-order = why options are options.  
2. Charm and vanna move delta without “a new trade.”  
3. Aggregate carefully with units and dealer conventions.  
4. Higher orders explain profile shape under stress.  
5. Use greeks as a language for risk, not as trade signals by themselves.

---

## 10. Study path

1. For one ATM call and one OTM put, list Δ, Γ, ν, θ, vanna.  
2. Shock spot ±1% and ±2% mentally: which greek dominates?  
3. Continue to *Vanna, Volga, and Skew* and *GEX & DEX Chart Grammar*.
