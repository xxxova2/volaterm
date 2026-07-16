# Interest Rate Swaps, Swap Spreads, and Convexity Bias


---

## 1. Anatomy of a plain vanilla interest rate swap

A standard fixed-for-floating swap:

- **Payer** pays fixed, receives floating (e.g. SOFR-compounded).  
- **Receiver** receives fixed, pays floating.

Valuation sketch:

\[
PV_{\text{swap}} = PV_{\text{fixed leg}} - PV_{\text{floating leg}}
\]

(Sign depends on side.) Floating leg valuation uses a **forward curve** bootstrapped from liquid instruments (STIR futures, spot swaps, etc.). Interpolation choices matter for book risk even if mid-market screens look smooth.

---

## 2. Swap spreads

Define educationally:

\[
\text{Swap spread} \approx \text{Swap rate} - \text{comparable Treasury yield}
\]

### Old LIBOR-world intuition
Swaps referenced bank credit (LIBOR). Theory: bank risk &gt; sovereign risk ⇒ swap rates above Treasuries ⇒ **positive** spreads common in many tenors historically.

### SOFR-world break
With risk-free overnight indices, the embedded bank credit premium in the floating index largely disappears. Spreads become dominated by:

- **Treasury supply** (fiscal issuance)  
- **Duration demand** (pensions receiving fixed in long swaps to hedge liabilities)  
- **Dealer balance-sheet taxes** (SLR and related)  
- **Regulatory and accounting** frictions  

**Negative long-end swap spreads** can appear and persist: not because “Treasuries are riskier than SOFR banks” in a simple credit sense, but because **physical supply of bonds** collides with **synthetic duration** demand and constrained intermediation.

### Educational trade sketch — spread widener
If spreads are extremely tight/negative and your thesis is crisis flight-to-quality in cash Treasuries:

- Pay fixed on swap  
- Buy Treasury  

Thesis: Treasury yields fall more than swap rates in flight-to-quality → spreads widen.  
Anti-thesis: regimes exist where everything breaks at once (2020-style stress taught that basis and spreads can move in painful ways). Treat as **illustration**, not a recommendation.

---

## 3. Convexity bias: futures vs swaps / forwards

You can hedge or price swaps with strips of interest-rate futures. They are not identical instruments:

| Feature | Futures | Swaps / OTC forwards |
|---------|---------|----------------------|
| Payoff | Linear (marked daily) | Convex PV profile |
| Margin | Daily variation margin | Collateralized differently; not the same as futures convexity |
| Reinvestment | Winning variation margin can be reinvested | Different cash-flow timing |

Educational approximation often written schematically:

\[
\text{Forward rate} \approx \text{Futures rate} - \text{convexity adjustment}(\sigma, T)
\]

As **rate volatility** rises, the convexity adjustment grows. Using raw futures without adjustment can mis-estimate forwards—especially when SOFR vol is elevated. If you bootstrap blindly, you can be the slowest reader of the curve.

---

## 4. Building the curve (desk literacy)

Bootstrapping steps (conceptual):

1. Fix short-end with SOFR/OIS and STIR futures.  
2. Add par swap rates at liquid tenors (2y, 5y, 10y, 30y, …).  
3. Interpolate (choice of spline vs monotone methods changes risk).  
4. Derive discount factors and forwards.  
5. Reprice portfolio; attribute to level/slope/curvature (PCA article).

---

## 5. How this connects to equity vol

Swap-spread and basis stress are **liquidity and duration** stories. When they widen violently:

- Risk appetite often falls.  
- Equity IV frequently rises.  
- Dealer capacity that might warehouse equity gamma is the same constrained system warehousing rates risk.

Cross-desk reading is the point of this Academy.

---

## 6. Terminal practice

1. Observe STIR / SOFR path tools for front-end policy pricing.  
2. Compare a long-end Treasury yield context to swap narrative (even if full swap screens are limited).  
3. When vol of rates is high, treat futures-implied paths with convexity humility.  
4. Read auction calendars as supply shocks to spreads and basis.

---

## 7. Key takeaways

1. Swaps are PV of fixed vs expected floating.  
2. Post-LIBOR spreads are about **supply, duration demand, and balance sheet**, not old AA bank credit alone.  
3. Negative long spreads can be structural.  
4. Futures need convexity adjustment vs OTC forwards.  
5. Rates stress transmits to equity vol regimes.

---

## 8. Study path

Continue to *Relative Value: Curves, Butterflies, and PCA*.
