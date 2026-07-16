# Vanna, Volga, and the Volatility Skew


---

## 1. Why the smile exists

If Black–Scholes were literal truth with constant volatility, every strike would share one IV. Equity index markets show a persistent **skew / smile**:

- Downside puts often carry **higher IV** than ATM.  
- Upside calls may be cheaper in vol terms (or form a smirk depending on asset class).  
- Single names after large rallies can show **right-tail** premium (melt-up risk).

Skew is not decoration. It is the market’s price of **asymmetric jump and correlation risk**.

---

## 2. Vanna: when spot and vol move together

Vanna measures how **delta changes with IV** (equivalently, how vega changes with spot).

### Educational example — short downside puts
You are short OTM puts (customers long crash protection). Dealers are long those puts in the mirror image if customers bought from them—or short if dealers sold. Using the common **customer-long / dealer-short** convention:

- Spot falls → puts move toward ATM → absolute delta of puts increases.  
- IV typically rises in selloffs → further delta and value effects via vanna/vega.  
- Dealers who are short puts may need to **sell underlying** into weakness (accelerant), depending on exact book and hedges already on.

The point for learning: **vanna couples the direction of the hedge to the vol regime.** A “delta-neutral” book at 10:00 is not delta-neutral after a vol shock at 10:05.

### Upside short calls
Customer long calls → dealer short calls, often hedged with long futures. If vol falls while spot grinds up, vanna and charm can force **futures selling** as the short-call delta shrinks—path narratives used in 0DTE education threads.

---

## 3. Volga: convexity in volatility

Volga is the sensitivity of vega to vol. Long options generally have positive volga in BS-type models for many strikes: when vol rises, vega itself can increase, so P&L is convex in σ.

**Short wings** (short far OTM options) can look quiet on a calm day (low vega × low realized vol change) and then gap-loss when IV jumps. Volga is the greek that makes “I was only a little short vega” an incomplete defense.

---

## 4. Smile dynamics: sticky rules of thumb

Traders need a rule for how the smile moves when spot moves:

| Rule of thumb | Idea | Greek implication |
|---------------|------|-------------------|
| **Sticky strike** | IV by strike stays put as spot moves | Realized behavior of fixed K options |
| **Sticky delta / sticky moneyness** | Smile slides with spot in moneyness space | Repricing of risk reversals |
| **Sticky local vol / mixed** | In between; model-dependent | Used in exotics |

No single rule always holds. Regimes matter: orderly grind vs crash. When studying the smile desk, compare **risk reversals and butterflies** across days, not only ATM IV.

---

## 5. Reading skew as information

Skew answers questions like:

- How expensive is **crash insurance** vs **melt-up insurance**?  
- Is the market pricing a **trapdoor** (fragile downside with neg gamma below a level)?  
- After a one-way rally, is **right-tail** skew elevated because dealers/buyside are short upside gamma?

Skew is a **price**, not a prophecy. Expensive put skew can mean fear is already paid for—or that tails are still underpriced relative to your scenario set.

---

## 6. Link to GEX / dealer mode

Positioning analytics (GEX) describe **spot convexity by strike**. Skew and vanna describe **how that map reprices when IV moves**. Together:

- +GEX / long dealer gamma near spot → dampening, possible pin.  
- Fat put skew + negative gamma below → **trapdoor** educational narrative: weak support if spot breaks, vol expands, hedges amplify.  
- Buyside short gamma / dealers long on names that ran hard → dealers may dampen, while skew reflects residual right-tail demand.

Always separate **OI-inferred dealer gamma** (positioning desk) from **IV surface shape** (vol desk). They interact but are not the same data.

---

## 7. Terminal practice

1. Open Smile: note 25-delta risk reversal if shown, or OTM put IV vs OTM call IV.  
2. Open Surface: see term structure of skew.  
3. Open Greeks: vanna profile by strike.  
4. Open GEX: locate walls vs spot.  
5. Write a three-sentence regime: “Spot vs walls; skew message; vanna stress case.”

---

## 8. Key takeaways

1. Skew prices asymmetric tails.  
2. Vanna is the bridge between spot hedges and vol shocks.  
3. Volga punishes casual short wings.  
4. Smile dynamics rules change effective exposures.  
5. Combine surface + GEX for full risk picture.

---

## 9. Study path

Continue to *Implied Volatility Surface & Term Structure* and *Walls, HVL, Magnets, and Dealer Mode*.
