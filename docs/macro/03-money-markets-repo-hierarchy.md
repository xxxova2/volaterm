# Repo hierarchy: who funds whom

**Deck:** The overnight stack under every leveraged trade.  
**Desk:** Rates plumbing · SOFR / STIR · basis  
**Level:** Intermediate

---

![SOFR overnight rate (FRED)](/docs/academy/figures/charts/sofr.png)

![Overnight RRP take-up (FRED)](/docs/academy/figures/charts/rrp.png)


## 1. Why plumbing comes first

If you do not understand funding, you will eventually misunderstand every leveraged trade—from Treasury basis to equity futures to FX swaps. Asset prices are claims; **repo and reserves** are the pipes that move the cash that supports those claims.

Thesis for this article:

> Directional rate calls are common. **Structure**—why the curve twists, why SOFR can print above EFFR, why dealers step back—is rarer and more valuable for reading this terminal’s Rates desk.

---

## 2. The hierarchy of rates (not a single risk-free rate)

Textbook finance often assumes one risk-free rate \(r\). In practice, overnight rates form a **stack** ordered by credit, collateral, eligibility, and regulatory cost of balance sheet.

### Effective Federal Funds Rate (EFFR)
Unsecured overnight lending of reserves between banks (and related counterparties in the fed funds market).

**Modern reality:** Since the post-GFC abundant-reserves regime, many banks do not *need* fed funds for reserve requirements. Volumes and composition changed. A known educational pattern: entities that cannot earn interest on reserves (historically certain Federal Home Loan Banks) lend funds; foreign banks that *can* earn **IORB** (interest on reserve balances) may capture a spread. That flow can make EFFR behave like a **regulatory arbitrage residual**, not a pure scarcity signal for system cash.

### Secured Overnight Financing Rate (SOFR)
Broad measure of the cost of borrowing cash **overnight collateralized by U.S. Treasuries**—i.e., a repo-market rate.

**Theory:** Secured should trade **below** unsecured (collateral reduces credit risk).  
**Reality in constrained regimes:** SOFR can trade **above** EFFR because **balance-sheet space is scarce**. Expanding repo assets hits leverage ratios (e.g. SLR). Dealers charge a premium to intermediate.

### The SOFR − EFFR spread as barometer
| Sign / state | Educational reading |
|--------------|---------------------|
| SOFR &lt; EFFR (negative spread) | Cash abundant relative to collateral demand; sometimes paired historically with large **RRP** usage when private markets pay less |
| SOFR &gt; EFFR (positive spread) | Cash relatively scarce or **collateral abundant** (issuance tsunami); dealer capacity stressed |
| Spikes in SOFR | Collateral indigestion, quarter-end/year-end constraints, operational stress |

On this terminal, treat **SOFR−EFFR** as a first-class **dealer capacity** barometer, not a trivia spread.

---

## 3. Repo mechanics and math

A **repurchase agreement** is a sale of securities with a commitment to repurchase later at a higher price. The difference is interest.

\[
\text{Repurchase price} = \text{Sale price} \times \left(1 + \text{Repo rate} \times \frac{\text{Days}}{360}\right)
\]

### Matched-book dealer
Dealers often run matched books rather than directional rate bets:

1. **Repo side:** Borrow cash from a money market fund; pledge Treasuries. Dealer **pays** the repo rate.  
2. **Reverse side:** Lend cash to a hedge fund; receive Treasuries. Dealer **receives** the reverse rate.  
3. **Profit:** Spread between receive and pay—if capital rules allow the balance sheet.

**Catch:** Gross repo + reverse can expand the balance sheet even when risk is matched. Under leverage ratio rules, capital must be held against size. Thin spreads × large notional can produce inadequate ROE → dealers shrink intermediation → market rates gap.

**Netting / sponsored repo:** Netting via central counterparties (e.g. FICC-style structures) and sponsored access for money funds can reduce capital usage. That is why market structure reforms and sponsored repo volumes matter for capacity.

---

## 4. General collateral vs specials

| Concept | Meaning |
|---------|---------|
| **GC (general collateral)** | Financing against “any” eligible Treasury; closest to what SOFR aims to summarize |
| **Special** | A specific CUSIP in high demand to cover shorts; its repo rate **drops** (cash lenders accept lower yield to obtain the bond) |
| **Specialness** | GC rate − special rate |

Deep specialness is a **squeeze / scarcity** indicator for that bond. Owning the bond can mean cheap financing; shorting it can mean painful borrow economics.

---

## 5. Leverage dynamics: mismatched books and the tail

Carry trades often **mismatch terms**:

- Example: Buy a 90-day bill yielding 4.00%; finance with 30-day repo at 3.75%; earn positive carry initially.  
- Risk: in 30 days you must **roll** funding. You are short the future funding rate path.  
- If repo spikes at roll (tax date, G-SIB window, issuance glut), carry flips negative. You are “short the tail.”

This is the silent killer of leveraged “risk-free” trades—including cousins of the Treasury basis trade (next article).

---

## 6. Central bank tools as a plumbing kit

### ON RRP (Overnight Reverse Repo Facility) — a floor mechanism
The Fed can absorb cash from eligible counterparties (notably money funds) at a set rate, helping enforce a **floor** under money-market rates for entities that may not earn IORB directly. Large RRP balances historically signaled **abundant cash chasing safe overnight investment**. As private repo yields rise above RRP, balances can drain into private markets—providing liquidity to dealers/borrowers until the buffer is gone.

### SRF (Standing Repo Facility) — a ceiling mechanism
The Fed can lend cash against Treasuries, limiting how far repo rates spike. It is a backstop with moral-hazard tradeoffs: it caps pain but may encourage risk-taking in private books.

### Corridor intuition
Educational stack (simplified):

![Overnight rate hierarchy — floor to ceiling](/docs/academy/figures/rate-hierarchy.svg)

```
RRP rate          ← floor for many cash lenders
private GC / SOFR ← market clearing
IORB / EFFR area  ← bank reserve remuneration complex
SRF rate          ← ceiling backstop for secured funding
```

When RRP is full, the system often sits in **excess cash**. When RRP is empty and issuance is heavy, the system can sit in **excess collateral** and stressed private repo.

### Regulation as villain/hero
Basel-style leverage and G-SIB surcharges can make intermediation expensive exactly when markets need warehouses for safe assets. Result: thinner liquidity, wider spreads, higher probability of air pockets—even without a “macro narrative” change.

---

## 7. What this terminal shows (honest scope)

The Rates desk aims to surface **public** plumbing marks: SOFR, EFFR, IORB, RRP balances, reserves, basis diagnostics, auctions, FX context. It does **not** magically reveal private G-SIB scores or every bilateral haircut. Use regime labels and spreads as **education + situational awareness**, not omniscience.

---

## 8. Study exercises

1. Write today’s hierarchy: RRP, SOFR, EFFR, IORB (values from the desk).  
2. State the regime in one line: excess cash vs excess collateral vs balanced.  
3. Check whether SOFR−EFFR agrees with that label.  
4. Note any quarter-end / settlement calendar effects.  
5. Cross-read equity IV: is risk-asset vol calm while plumbing is tight (or vice versa)?

---

## 9. Key takeaways

1. There is a **hierarchy** of overnight rates, not one \(r\).  
2. SOFR is the secured funding heartbeat; EFFR can be residual.  
3. SOFR &gt; EFFR is often **balance-sheet tax**, not paradox.  
4. Repo intermediation is capital-constrained matched book business.  
5. RRP/SRF shape the floor and ceiling; regulation shapes capacity.

---

## 10. Study path

Continue to *Treasury Cash–Futures Basis* and *RRP, SOFR, and the Facility Corridor*.
