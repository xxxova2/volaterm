# Where cash actually sleeps overnight

**Deck:** SOFR, RRP, IORB — the corridor that prices overnight money.  
**Desk:** Rates plumbing  
**Level:** Intermediate

![Rate corridor — floor to ceiling](/docs/academy/figures/rate-hierarchy.svg)

---

## Why this matters to “equity people”

If overnight funding is the oxygen of leveraged markets, then **where cash parks** is not trivia. It is the difference between “risk can lever” and “someone is forced to sell.”

You do not need to be a money-markets specialist. You need the corridor picture.

---

## The corridor in plain English

Think of overnight rates as floating between a **floor** and a **ceiling** set by Fed tools:

| Level | Tools (conceptually) | What it means |
|-------|----------------------|---------------|
| **Ceiling** | Standing repo / backup facilities | When cash is scarce, rates should not run away forever — banks can borrow against collateral |
| **Market** | **SOFR**, **EFFR** | Where actual overnight trades clear |
| **Floor** | **IORB**, **ON RRP** | Where cash can earn a safe overnight return without taking credit risk |

When the system is flush with reserves, cash piles into the **floor** (RRP usage high, rates near floor).  
When reserves tighten, usage of the floor falls and market rates sit higher in the corridor — sometimes with spikes.

---

## Real charts (public data)

### SOFR — secured overnight financing

![SOFR (FRED)](/docs/academy/figures/charts/sofr.png)

### Effective fed funds

![EFFR (FRED)](/docs/academy/figures/charts/effr.png)

### Interest on reserves (floor-ish reference)

![IORB (FRED)](/docs/academy/figures/charts/iorb.png)

### Overnight RRP take-up — cash parked at the Fed

![ON RRP (FRED)](/docs/academy/figures/charts/rrp.png)

These are **St. Louis Fed FRED** series — the same graphs professionals screenshot into notes. Not decorative AI art.

---

## How to read a stress day

1. **Does SOFR gap higher** while RRP still holds cash? → distribution of liquidity may be uneven (not just “no cash”).  
2. **Does RRP drain quickly** while risk assets sell? → cash leaving the floor can be healthy *or* a symptom of tighter reserves — context matters.  
3. **Does the corridor stop working** (rates through the ceiling narrative)? → stop theorizing; size down and watch primary dealers / basis.

---

## Link back to vol and GEX

Funding stress often arrives **with** IV spikes and short-gamma-looking sessions. That is the three machines talking:

- Plumbing tightens  
- Insurance reprices  
- Hedging becomes chasey  

Do not analyze them in separate silos on those days.

---

## Bottom line

> Overnight cash has a **parking garage** (RRP / IORB) and a **street market** (SOFR / EFFR). Learn the garage map before you narrate the stock market.

**Next:** *Money markets & repo hierarchy* · *Treasury cash–futures basis*
