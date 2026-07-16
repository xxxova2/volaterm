# How to read a GEX chart without getting fooled

**Deck:** Dealer gamma is a map of *forced* hedging — not a crystal ball.  
**Desk:** Positioning (`GEX`) · Greeks · Vol  
**Level:** Intermediate

![How to read GEX](/docs/academy/figures/gex-grammar.svg)

---

## What GEX is trying to say

Options dealers (market makers) try to stay roughly **delta-neutral**. When customers buy or sell options, dealers take the other side and hedge with stock or futures.

**Gamma** tells you how that hedge *changes* as price moves.

- If dealers are **long gamma**, they tend to **sell strength and buy weakness** → dampen moves.  
- If dealers are **short gamma**, they tend to **buy strength and sell weakness** → amplify moves.

**GEX (gamma exposure)** is an *estimate* of that force by strike, usually inferred from open interest and a sign convention about who is long/short.

That last phrase is the landmine.

---

## The convention problem (read this twice)

Different tools flip the sign.

Some charts show **customer** gamma.  
Some show **dealer** gamma (customer flipped).  
Some use “positive = stabilizing” without saying *for whom*.

> If you do not know the chart’s convention, you do not know the chart.

In this terminal’s education, we speak in **dealer terms** unless labeled otherwise:

| Dealer GEX | Typical hedge behavior | Path feel |
|------------|------------------------|-----------|
| **Positive** (long gamma) | Fade moves | Stickier, mean-reverting intraday |
| **Negative** (short gamma) | Chase moves | Faster, wider ranges |

DEX (delta exposure) is the related map of directional hedge pressure — useful, also convention-sensitive.

---

## How a chart is usually built

1. Take open interest (or volume — different product) by strike and expiry.  
2. Convert option gamma into **share-equivalent** or **dollar** exposure for a 1% move.  
3. Apply a **customer-vs-dealer** assumption (the convention).  
4. Stack bars by strike. Spot sits on the axis.

None of this is a live tape of what Goldman is doing at 10:14. It is a **structure map**.

---

## What “walls” and magnets actually mean

Large positive GEX at a strike often means: *if price gets there, dealers may be long a lot of gamma there* — hedging can **resist** breaking through (a “wall”), or **pull** price toward a strike where gamma is dense (a “magnet”), depending on path and residual positioning.

These words are **descriptive slang**, not physics. They fail when:

- OI is stale or wrong  
- The big player is not a delta-hedging dealer  
- 0DTE and charm dominate the day  
- You have the sign flipped

---

## A Substack-style daily read (60 seconds)

1. **Sign of net GEX near spot** — stabilizing or amplifying regime?  
2. **Nearest large bars** — putative walls / voids.  
3. **Expiry mix** — is this week’s OI or a monthly that is already dead for path?  
4. **Vol context** — is IV crushed while short gamma? Fragile.  
5. **Falsifier** — what would make this map useless today? (FOMC, gap, single-name event)

If step 5 is empty, you are storytelling.

---

## GEX is not the market

Famous free newsletters (Trading Volatility and others) hammer the same points we keep here:

- Options volume is large enough to matter for path.  
- Positive GEX environments often feel easier for long risk.  
- Negative GEX environments often mean wider ranges and less forgiveness.  
- The edge is in **process**, not worshipping a single bar chart.

Pair GEX with:

- **Charm** — how delta drifts as time passes (huge on 0DTE)  
- **Funding / macro** — is leverage even available?  
- **Your own greek book** — the map is not your P&L

---

## What to open in the terminal

Positioning desk → GEX chart → note convention → compare to spot path for the session.  
Write one sentence: *“Dealers look long/short gamma near spot; I expect tighter/wider ranges unless ___.”*

**Next:** *Charm and dealer path bias* · *Walls, HVL, magnets*
