# Implied Volatility Surface and Term Structure


---

## 1. Definition

**Implied volatility** is the volatility parameter that, plugged into a pricing model, recovers the observed option market price. It is a **quoting language**, not a promise of future realized vol.

The **volatility surface** is IV as a function of:

- **Moneyness / strike** (smile/skew dimension)  
- **Expiry** (term structure dimension)

Sometimes a third view is calendar / forward variance between expiries.

---

## 2. Term structure shapes

| Shape | Description | Common interpretation (educational) |
|-------|-------------|-------------------------------------|
| **Contango** | Longer-dated IV > shorter-dated IV | Normal equity index: variance risk premium, uncertainty compounds |
| **Backwardation** | Front IV > back IV | Stress, event clustering in front, demand for near-term protection |
| **Hump** | Elevated around a known event date | Earnings, FOMC, election window |

Professionals also look at **forward volatility** implied between two expiries: if the calendar is mispriced relative to your view of variance between dates, calendar spreads become the expression.

---

## 3. Smile / skew dimension

For a fixed expiry:

- Plot IV vs strike or vs delta.  
- **Risk reversal** ≈ difference between OTM call and OTM put vols (sign convention varies).  
- **Butterfly** ≈ wings vs body; prices vol-of-vol / kurtosis.

Asset-class fingerprints:

- Equity indices: put skew typical.  
- Some commodities: different seasonal smiles.  
- Crypto: often elevated wings and fast regime shifts (see crypto desk if enabled).

---

## 4. Surface quality and no-arbitrage

A raw chain of mid prices can imply butterfly arbitrage (negative density) or calendar arbitrage. Desks care about:

- Smoothness vs fidelity to wings  
- Butterfly convexity  
- Calendar monotonicity of total variance (in idealized settings)

This terminal’s surface tools and quality/fit views exist to help you **see structure**, not to guarantee an arbitrage-free industrial calibration. When studying, prefer liquid strikes near ATM before trusting far wings.

---

## 5. Linking surface to macro and rates

Vol is the **price of risk**. Funding stress and macro regimes change that price:

- Rates plumbing stress → risk-off → often higher equity IV and fatter put skew.  
- Calm excess-liquidity regimes → lower IV, contango term structures more common.  
- Event calendars (CPI, FOMC) create **humps** regardless of plumbing.

Cross-read with Rates desk regime chips when studying “why is front IV high today?”

---

## 6. Historical IV vs implied

**Implied** = options market forecast (risk-neutral, includes premiums).  
**Realized / historical** = what path variance actually did.

Comparing hist IV strips to current implied is the entry to **VRP** study: is the market charging a lot or a little for the next month’s variance?

---

## 7. Terminal workflow for learners

1. **SURF** — whole landscape: where is the ridge of high IV?  
2. **SMILE** — one expiry deep: skew and wings.  
3. **TERM** — ATM (or fixed delta) across dates: event bumps.  
4. **Greeks** — convert surface into risk if you held a structure.  
5. **GEX** — does positioning agree with a pin (low vol) or amplify (high vol path) narrative?

---

## 8. Key takeaways

1. IV is a quoting convention embedding risk premia.  
2. Term structure encodes time and events.  
3. Smile encodes tails.  
4. Quality of wings ≠ quality of ATM.  
5. Surface + hist IV + macro context = complete study loop.

---

## 9. Study path

Continue to *Variance Risk Premium* and *Vol Desk Tools* under Tools.
