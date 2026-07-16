# Education pack — Options · Macros · Rates

| Field | Value |
|-------|--------|
| **What this is** | Material **for you to read** — education threads, primers, and posts from the **links and accounts you already put on the research map** |
| **What this is NOT** | Not a Bloomberg UX dump · not Hy3 pack code · not “files I need so I can build” · not a product roadmap |
| **Companion build notes (ignore if you only want learning)** | `docs/positioning/MACROS_GREEKS_GEX_RESEARCH.md` maps these lessons → UI; skip that file if you only want education |
| **Sources** | OnlySOFRs primer, @bennpeifert, @MenthorQpro, @VolSignals / VS3D, @conksresearch / conks.plumbing, SpotGamma / MenthorQ chart language from your packs |
| **Built** | 2026-07-13 |

**How to use:** open this file and read by section (Options → Macros/Rates → Positioning). Threads are kept **in order**, not condensed into a one-line takeaway.

---

## Table of contents

1. [OPTIONS — Benn Eifert: θ is not free money (full thread)](#1-options--benn-eifert-θ-is-not-free-money-full-thread)
2. [OPTIONS — MenthorQ: theta, weekends, and “trading time” (full thread)](#2-options--menthorq-theta-weekends-and-trading-time-full-thread)
3. [OPTIONS — Taylor identity (same idea, compact form)](#3-options--taylor-identity-same-idea-compact-form)
4. [OPTIONS / POSITIONING — VolSignals: gamma stack + charm bias (thread + media)](#4-options--positioning--volsignals-gamma-stack--charm-bias-thread--media)
5. [OPTIONS / POSITIONING — MenthorQ & SpotGamma language (GEX / walls / HVL / dealer mode)](#5-options--positioning--menthorq--spotgamma-language-gex--walls--hvl--dealer-mode)
6. [MACROS & RATES — OnlySOFRs primer (full public post)](#6-macros--rates--onlysofrs-primer-full-public-post)
7. [MACROS & RATES — Conks pointers (RRP, SOFR, equity repo)](#7-macros--rates--conks-pointers-rrp-sofr-equity-repo)
8. [Link index (open originals)](#8-link-index-open-originals)

---

# 1. OPTIONS — Benn Eifert: θ is not free money (full thread)

**Source:** [@bennpeifert](https://x.com/bennpeifert) · conversation starting [1572019785797603328](https://x.com/bennpeifert/status/1572019785797603328) · 2022-09-20  
**Also referenced in your map:** Common VRP Discussions → https://www.qvradvisors.com/research

### Thread (in order)

**1/** ok. as requested.

an option's theta (theoretical rate of decay over time) is not just "income" to an investor holding a short position.

it is compensation for the risk of loss that investor faces from negatively asymmetric exposure to moves in the underlying asset.

**2/** Theta Gang and option guru charlatans would have you believe that theta is a form of alpha, or free money for true believers.

but options are convex instruments with asymmetric payoffs - buyers can make a lot more than they are risking to lose, and vice versa.

**3/** when you hold a negatively asymmetric position, any large move causes a loss. if the underlying moves in a favorable direction, you benefit less and less from it; if it moves against you, you lose more and more, fast

**4/** we can write the value of an option as:

V(x, t, v)

where x is the price of the underlying, t is time, v is implied volatility, and V(.) is a standard option pricing method (eg Black-Scholes or a lattice/trinomial tree)

**5/** its change over one unit of time via a second order Taylor expansion as

dV(x, t, v) = dV/dt  
+ dV/dx * dx  
+ dV/dv * dv  
+ 0.5 * d2V/dx^2 * dx^2  
+ 0.5 * d2V/dv^2 * dv^2  
+ dv2/dvdx * dvdx

**6/** = theta  
+ delta * dx  
+ vega * dv  
+ 0.5 * gamma * dx^2  
+ 0.5 * volga * dv^2  
+ vanna * dx * dv

if you are short this option, you will earn the theta decay over time, but you are paying the piper on the other side: every time the stock moves materially you lose money on gamma

**7/** if the option is away from the money, it will have meaningful volga (volatility gamma), and every time implied volatility moves significantly, you lose to that too

**8/** it may similarly have vanna (or skew) exposure; your short downside put position may lose money as a result of spot falling and implied volatility rising, for example

**9/** either you are continually locking these losses in via dynamic hedging, or you are just ignoring them and accumulating delta and vega risk in an adverse direction, effectively betting double or nothing that the adverse moves will revert

**10/** just selling a naked call and letting it ride is an example of the latter; if the stock spikes, you get short delta; if it falls back again, you feel smart, but if it keeps running, you lose money faster and faster

**11/** the market prices these factors at every point in time: gamma is more valuable when volatility is high, because the amount of positive pnl that a long option position earns from gamma is proportional to dx^2

**12/** the net pnl stream from selling an option for theta will depend on the magnitude of these countervailing factors. if the market is charging too much for gamma, vanna and volga, then theta on a short position will steadily exceed the realized losses on those exposures

**13/** most of the time you should expect a slight risk premium, but only a tiny fraction of overall theta

**14/** that fraction may or may not be smaller than your transaction costs in options markets as an individual

**15/** also don't forget to consider vol rolldown / rollup... a short OTM put position will usually have theta that far exceeds its realized decay rate, even with no underlying moves, because implied vol goes higher and higher for very short dated crash puts of the same strike

**16/** obviously i am hinting at other uses of this taylor expansion here :)

**Correction:** * "pit" is obviously "put" above in "your short downside put position..."

**Credentials media:** https://pbs.twimg.com/media/FdDxOE1agAAgmLl.jpg

**Follow-up:** and "i'll just get assigned, i wanted to buy the stock there anyway" does not get you out of any of this. a naive hold to maturity analysis of a short option position can give rise to sloppy, illogical conclusions. please read Common VRP Discussions, here

https://www.qvradvisors.com/research

### Related Benn note (ATM θ vs γ PnL)

**Post:** [2008965329561768420](https://x.com/bennpeifert/status/2008965329561768420) · 2026-01-07

for a roughly at-the-money option with no higher order convexity, theta decay is equal to the market's expectation of gamma PNL from moves in the underlying spot price, regardless of time to maturity

the actual logic behind this graph is different >>

---

# 2. OPTIONS — MenthorQ: theta, weekends, and “trading time” (full thread)

**Source:** [@MenthorQpro](https://x.com/MenthorQpro) · [2075962590849540135](https://x.com/MenthorQpro/status/2075962590849540135) · 2026-07-11  
**Media:** https://pbs.twimg.com/media/HM9MUvUWsAAilKc.jpg

### Thread (in order)

**1/** Theta is often called the "income Greek."

The idea is simple: as time passes, options lose value and option sellers benefit.

But there's a hidden problem most traders never think about.

**2/** Option pricing models assume time flows continuously. Markets don't.

Trading stops on Friday, reopens on Monday, but time and risk never actually pauses.

That's where things get interesting.

**3/** Imagine holding an option over the weekend.

Nothing happens.  
Price barely moves.  
Monday arrives.

Was your profit really "earned" through time decay or was it simply how the pricing model advanced the clock?

**4/** There are two ways to think about time:

• Trading time: Risk only accumulates while markets are open.  
• Calendar time: Risk exists 24/7, even when exchanges are closed.

Neither perfectly matches reality.

**5/** Why?

Because markets close but news doesn't.

Geopolitical events, earnings surprises, natural disasters, and policy announcements can all happen over a weekend when traders can't hedge.

Risk doesn't disappear just because the market is closed.

**6/** That's why options often behave differently on Fridays.

Implied volatility may adjust before the weekend to account for uncertainty, creating what's commonly called the weekend effect.

Some of Monday's "theta gains" were often priced in before the weekend even began.

**7/** This means Monday profits aren't always informational.

Sometimes they're simply mechanical the result of how option models measure time rather than a genuine market edge.

Understanding that distinction matters.

**8/** Experienced volatility traders don't just watch theta.  
They also ask:

• Is implied volatility pricing weekend risk?  
• Is the market underestimating uncertainty?  
• Is today's premium reflecting the actual risks ahead?

Those questions often matter more than theta itself.

**9/** Conclusion:

Theta isn't just about options losing value over time.

It's also about how markets choose to measure time.  
Understanding that difference gives you a deeper perspective on option pricing and why weekends aren't always as simple as they seem.

This thread is for educational purposes only and is not financial advice.

---

# 3. OPTIONS — Taylor identity (same idea, compact form)

From Benn’s expansion (and how your Greeks desk Explain copy is meant to read):

```
dV ≈ θ dt + Δ dx + ν dσ + ½ Γ dx² + ½ Volga dσ² + Vanna dx dσ
```

| Term | Intuition from the threads above |
|------|----------------------------------|
| θ | Time decay — **compensation**, not free income |
| Δ | Directional sensitivity |
| ν (vega) | IV sensitivity |
| Γ | Convexity vs spot moves — short θ pays for this |
| Volga | Convexity vs IV moves |
| Vanna | Spot × IV cross (skew / downside puts) |

---

# 4. OPTIONS / POSITIONING — VolSignals: gamma stack + charm bias (thread + media)

**Source:** [@VolSignals](https://x.com/VolSignals) · conversation [2056356493662863567](https://x.com/VolSignals/status/2056356493662863567) · 2026-05-18  
**Platform:** https://vs3d.volsignals.com/home  
**Docs (thin public page):** https://vs3d.volsignals.com/home/docs/platform-overview

### Thread (in order)

**1/** "SPX gamma remained stable and long last week, averaging $5bn intraday over the prior five sessions with 0DTE gamma continuing to run negative (-$1.3B) vs positive contribution from expiring OI (+$5.1B) and non-expiring options (+$1.1B)" - Bank of America

Track this live >>

**Media:** https://pbs.twimg.com/media/HImjBCTXAAA7jDr.png

**2/** In VS3D we model this exact thing for you- with the same data and approach used by Bank of America and other institutions.

Today the index is set to open at 7410-15 amidst just over $4B notional gamma without much variation across the implied range.

**Media:** https://pbs.twimg.com/media/HImjt09XMAAG4yD.jpg

**3/** We also model Charm, the greek that tells you whether the options positions provide any directional bias today as they expire.

The market crossed into "bullish charm" territory this morning once it hit 7410. See for yourself- the yellow range implies market makers have to buy futures as the positions decay today.

**Media:** https://pbs.twimg.com/media/HImlCtyXsAAf3D3.jpg

**4/** Test drive the data yourself with a free 7-day trial to VS3D, the only dealer hedging flows platform built by actual market makers >>

https://vs3d.volsignals.com/home

**Media:** https://pbs.twimg.com/media/HImlUh1WMAAVdJJ.jpg

### Companion teaching post (dealer short calls / 0DTE straddle)

**Post:** [2074500740240883856](https://x.com/VolSignals/status/2074500740240883856) · 2026-07-07  
**Media:** https://pbs.twimg.com/media/HMobX2-W8AASR5i.jpg

Today's position was a classic red flag to the upside

where dealer short calls

(calls that customers bought)

are already hedged with long futures

As the clock ticks,  
the 0DTE straddle cheapens,  
or price moves away from the largest short calls...

dealers sell futures.

### Ideas these threads teach (for your notes — not a rewrite of their product)

- **0DTE γ** can run **against** longer-dated / expiring OI γ — stack the three, don’t look at one number.
- **Charm** = directional bias from **time decay of delta** → MM futures buy/sell as clock ticks.
- Short customer calls → dealer long futures hedge → as straddle cheapens / price leaves max short-call mass → dealers **sell** futures.

---

# 5. OPTIONS / POSITIONING — MenthorQ & SpotGamma language (GEX / walls / HVL / dealer mode)

These are the **chart-grammar lessons** from the pics/threads you attached to the research map (not a clone of their product).

### MenthorQ-style Net GEX chart language (from your image pack notes)

| Visual | Meaning (education) |
|--------|---------------------|
| **Green bars** | Positive GEX at strike (dealer long γ → tends to **dampen** moves) |
| **Orange/red bars** | Negative GEX (tends to **amplify** / freer path) |
| **GEX Profile** | Shape of net GEX across strikes |
| **DEX Profile** | Delta exposure profile — hedge **direction** pressure, not gamma |
| **Call Resistance** | Large call-side wall above spot |
| **Put Support** | Large put-side wall below spot |
| **HVL (High Vol Level)** | Often max \|GEX\| / “vol magnet” strike |
| **Spot line** | Where price sits vs walls / pin zones |

**Decision questions those charts answer:**

1. Am I above HVL / call resistance (structure intact) or testing walls?  
2. Is spot in a **+GEX cluster** (pin / consolidation) or **−GEX trough** (range expand)?  
3. Does **DEX** skew say rehedging pushes up or down as spot walks?

### MenthorQ — Goldman “buy or buy” dealer gamma quote

**Post:** [1903713836412112954](https://x.com/MenthorQpro/status/1903713836412112954) · 2025-03-23  
**Media:** https://pbs.twimg.com/media/GmtZpIsaAAACBYp.jpg

Goldman Sachs “Dealers get longer gamma to the downside and need to buy deltas should the market fall....they become short gamma in case the market moves higher, and will need to buy deltas to hedge. Dealers are in buy or buy mode”

### MenthorQ — magnets from positioning

**Post:** [2074886929271722038](https://x.com/MenthorQpro/status/2074886929271722038) · 2026-07-08

5/ This is why prices often seem "stuck" near certain strikes.

Large options positions can create temporary magnets where dealer hedging naturally pulls price toward specific areas before expiration.

These aren't traditional support or resistance levels they're driven by positioning.

### SpotGamma — buy-side short gamma / dealers long (example teaching post)

**Post:** [2074835774927687878](https://x.com/spotgamma/status/2074835774927687878) · 2026-07-08  
**Media:** https://pbs.twimg.com/media/HMtLhkoWAAA5lIy.jpg

In the top stocks the buyside is actually short gamma (dealers long) on net. That gives dealers positive gamma (blue)

The skew is an artifact of the right tail risk from these stocks going up 🍌s % for the last 90 days

### SpotGamma articles (your map — open for full narrative)

- https://spotgamma.com/geopolitical-risk-hits-a-fragile-market/ — trapdoor: **neg γ below level + put skew**
- https://spotgamma.com/the-markets-0dte-underbelly-is-exposed/ — 0DTE underbelly; restored **+γ** regimes

*(Public pages sometimes load as marketing shells; open in browser for full weekly text.)*

---

# 6. MACROS & RATES — OnlySOFRs primer (full public post)

**Source:** OnlySOFRs — *The Plumbing, The Basis, and The End of The World (Again)- A Primer (Sort of)*  
**URL:** https://onlysofrs.substack.com/p/the-plumbing-the-basis-and-the-end  
**Date on post:** Jan 01, 2026  
**Hero image:** https://substackcdn.com/image/fetch/$s_!PwOg!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fea04ae4b-2aef-4c23-95e9-261e6882185c_2400x1792.png

Below is the **public article body as retrieved** (not summarized). Diagrams are linked by URL.

---

### Introduction: Welcome to the Abattoir

If you are reading this, congratulations. You have survived the liquidity air pockets of April 2025, the tariff tantrums, and the utter clown show that was the Fed’s attempt to manage the repo market this year. You are either a survivor, or you are new capital. If you are the latter, listen closely: the market does not care about your Sharpe ratio, it does not care about your “macro narrative,” and it certainly does not care about your feelings. It cares about **liquidity** and **leverage**. Everything else is noise.

Welcome to **ONLYSOFRs**.

This Substack is not for the faint of heart, nor is it for the “buy-and-hold” 60/40 crowd who think “diversification” means owning both Nvidia and Microsoft. This is for the professionals who understand that the global financial system is a series of precarious balance sheets linked by repo agreements, cross-currency basis swaps, and enough leverage to make a 1998 LTCM partner blush. We are operating in a zero-sum theater where alpha is extracted by identifying the cracks in the plumbing before the water rises.

We are living in a regime where the “risk-free” rate is the most volatile asset on your screen. In 2025, we watched the Secured Overnight Financing Rate (SOFR) detach from reality compared to the snooze-fest in 2024. We watched the “basis trade” blow up, again, because regulators suddenly realized that Cayman-domiciled hedge funds were sitting on $1.85 trillion of Treasuries, effectively acting as the marginal buyer for Uncle Sam’s debt.

The “plebeian consensus”, is that we are navigating a “hard landing” or a “mid-cycle adjustment.” The view we trade here, is that the plumbing is clogging. The G-SIB surcharge scores are rising mechanically with the supply of “safe” assets, effectively taxing the balance sheet capacity of the very dealers we need to intermediate this paper. Basel III Endgame looms like a Grim Reaper over the repo desk, threatening to make capital so expensive that liquidity vanishes exactly when you need to hit the bid.

But before we get to the really juicy part, I will deconstruct the machine. We aren’t just going to talk about “rates moving up or down.” Any idiot can toss a coin on direction. We are going to talk about **structure**. We are going to talk about **why** the curve twists, **why** the basis widens, and **how** to monetize the incompetence of central bankers.

**The Logistics: A Living Series**

I am not dumping a 500-page textbook on you today. I know your attention span is shorter than 0DTEs. We are going to do this properly.

I will be releasing this deep-dive series in **6 distinct installments** (see the roadmap and teasers below). Each part is designed to be a standalone primer, but they stack. You need to understand the Repo market (Part 1) to understand why the Treasury Basis blows up (Part 2). You need to understand the Basis to trade the FX Swap market (Part 5).

**However,** this syllabus is **liquid**, I am not a tenured professor. I am just a crazy man who needs therapy. If the market plumbing springs a leak in a sector I haven’t covered, or if the comment section screams for a deep dive on “Variance Swaps” or “The TGA’s impact on Reserves,” I will add chapters, or not. If you want it, shout. I listen to the flow.

Here is the roadmap. Strap in.

---

## Part 1: Money Markets, Repo, Central Banks, and Leverage Dynamics

**“If you don’t understand the plumbing, you will eventually flush your P&L.”**

The first primer will be a violent awakening for those who think the “Fed Funds Rate” is the only number that matters. We are going to strip the engine block of the financial system down to its pistons: the **Repo Market**. It is the lifeblood of the system, determining the cost of leverage for every asset class from Treasuries to Equities.

### 1. The Hierarchy of Rates: Why “Risk-Free” Isn’t Free

In the textbook world of neoclassical finance, there is a single “risk-free rate” that anchors all asset pricing models. In the real world, the “risk-free” rate is a theoretical abstraction. In the trenches, we deal with a hierarchy of rates determined by credit quality, collateral eligibility, and, most importantly, **regulatory constraints**.

#### The Federal Funds Rate (EFFR)

This is the unsecured overnight rate at which depository institutions (banks) lend reserves to each other. Historically, this was the heartbeat of the system. Today, it is a vestigial organ. The volume in the Fed Funds market has collapsed since 2008 because the banking system is awash in excess reserves (Quantitative Easing). No bank *needs* to borrow fed funds to meet reserve requirements anymore. The market is now dominated by “arbitrage trades” where Federal Home Loan Banks (FHLBs)—who cannot earn interest on reserves at the Fed—lend to foreign banks who *can*. The foreign banks pocket the spread (Interest on Reserve Balances (IORB) minus EFFR). It is a regulatory arbitrage, not a market signal.

#### The Secured Overnight Financing Rate (SOFR)

This is the *real* rate. SOFR is the cost of borrowing cash overnight collateralized by Treasuries. It is a broad measure of the repo market. Unlike EFFR, which is unsecured, SOFR is secured.

* **Theory:** Secured rates (SOFR) should trade *below* unsecured rates (EFFR) because they are safer. If I lend you money and take a Treasury bond as collateral, I have less risk than if I lend to you unsecured.

* **Reality (2025):** SOFR frequently trades *above* EFFR.

* **Why?** **Balance Sheet Constraints.** Lending cash in the repo market requires a bank to expand its balance sheet. Under Basel III leverage ratio rules (SLR), expanding the balance sheet is expensive. Banks demand a premium (higher rate) to rent out their balance sheet.

**The Spread (SOFR - EFFR):** This spread is the single most important barometer of dealer capacity in the modern financial system.

* *Negative Spread:* Cash is abundant, collateral is scarce. This was the regime of 2021-2023, where the Reverse Repo Facility (RRP) balances hit $2.5 trillion because there was nowhere else for cash to go.

* *Positive Spread:* Cash is scarce, collateral is abundant. This is the 2025 regime. In mid-September 2025, we saw SOFR spike to 5.25%, well above the Fed’s target range and the EFFR. This was a “collateral indigestion” event—dealers simply could not absorb the tsunami of Treasury issuance required to fund the deficit.

**Chart image:** https://substackcdn.com/image/fetch/$s_!IRey!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F78732838-be09-49c1-bda9-89d250efbeb8_1662x691.png

### 2. The Repo Machine: Mechanics & Math

Let’s get technical. A Repo (Repurchase Agreement) is a sale of securities coupled with an agreement to repurchase them at a higher price on a future date. The difference in price is the interest.

The Formula:

Repurchase Price = Sale Price × (1 + Repo Rate × Days / 360)

To the dealer, the repo market is a **matched-book** game. They are not in the business of betting on the direction of repo rates; they are in the business of earning the bid-ask spread on liquidity.

1. **The Repo Side:** Dealer borrows cash from a Money Market Fund (MMF) and pledges Treasuries as collateral. (Dealer pays Repo Rate).

2. **The Reverse Side:** Dealer lends that cash to a Hedge Fund and receives Treasuries as collateral. (Dealer receives Reverse Repo Rate).

**The Profit:** The spread between the Reverse Rate (received) and the Repo Rate (paid).

* *Example:* Dealer borrows from MMF at 4.50%. Dealer lends to Hedge Fund at 4.60%. Dealer pockets 10bps.

* *The Catch:* The dealer is now expanding their balance sheet. If the dealer does $1 billion of repo and $1 billion of reverse repo, their balance sheet grows by $1 billion (gross). Under the Supplementary Leverage Ratio (SLR), they must hold capital against this $1 billion. If the spread is only 10bps, the Return on Equity (ROE) might be too low to justify the trade.

* *The Solution:* **Netting**. If the repo and reverse are with the same counterparty or cleared through the same Central Counterparty (CCP) like the Fixed Income Clearing Corporation (FICC), they can net the positions down. This reduces capital usage and boosts ROE. This is why **Sponsored Repo** (where Money Funds trade directly with FICC) has exploded in volume—it allows dealers to intermediate massive flows without blowing up their leverage ratios.

### The “Special” Market: When Collateral is King

Not all collateral is created equal. Some bonds are “On-the-Run” (newly issued, liquid). Everyone wants them. If a specific bond is in high demand (usually to cover short positions), the repo rate on *that specific bond* drops. This is called trading “Special”.

* **General Collateral (GC):** Repo rate for “any old Treasury.” This is what SOFR *TRIES* to measure.

* **Special Rate:** Repo rate for a specific, scarce bond.

* **Specialness:** GC Rate - Special Rate.

When a bond trades deeply special (e.g., 0.05% repo rate when GC is 4.50%), it means the “street” is massively short that bond. This is a squeeze indicator. If you own that bond, you can finance it for free (or close to it). More importantly, the high “specialness” signals that the bond is “rich” relative to the curve, but shorting it is dangerous because the cost of borrowing it (the repo rate) is so high (you receive 0.05% on your cash instead of 4.50%).

### 3. Leverage Dynamics: The Tail that Wags the Dog

Dealers and levered investors (hedge funds) run **Mismatched Books** to generate excess carry. This introduces “Tail” risk. This is the silent killer of leveraged strategies.

**The Trade:**

* Buy a 90-day Treasury Bill yielding 4.00%.

* Finance it with a 30-day Repo at 3.75%.

* **Carry:** Positive 25bps (for the first 30 days).

* **The Risk:** In 30 days, you must roll the repo. You are “short the tail”—specifically, the future 60-day repo rate starting 30 days from now.

* **The Blowup:** If 30 days from now, repo rates spike to 4.50% (because of a tax date, or G-SIB surcharge constraints at year-end ), your positive carry turns into negative carry. You are bleeding.

### 4. Central Bank Tools: The Plumber’s Wrench

The Federal Reserve has evolved from a rate-setter to a collateral-manager. It essentially runs a massive repo desk.

* **RRP (Reverse Repo Facility):** The Floor. The Fed borrows cash from MMFs. In 2023/24, this facility held $2.5 trillion. In 2025, balances have drained as MMFs moved money back into private repo markets to chase higher yields (since SOFR > RRP). This “drain” provided liquidity to the market. But now, the RRP is nearly empty. The liquidity buffer is gone.

* **SRF (Standing Repo Facility):** The Ceiling. The Fed lends cash against Treasuries. This is the “bailout” mechanism for the repo market. It prevents rates from spiking too high, but it also creates moral hazard.

* **Basel III Endgame:** The Villain. The new capital rules increase the risk-weighting for trading assets and operational risk. This forces banks to hoard capital rather than lend it in repo. The result? **Volatility.** Liquidity becomes thinner, bid-ask spreads widen , and the probability of a “flash crash” increases.

---

## Part 2: The Treasury Basis (NOT AGAIN) – Arbitrage, Options, and Deliverables

**“Arbitrage is the art of picking up pennies in front of a steamroller. The Basis Trade is picking up nickels in front of a nuclear blast.”**

If Part 1 was about how you fund the trade, Part 2 is about the trade itself. The Treasury Cash-Futures Basis is the single most important arbitrage relationship in the world. It links the spot market (Cash Treasuries) to the forward market (Futures). It is the mechanism by which the massive US debt load is distributed to the world.

### 1. The Physics of the Basis

The **Basis** is simply the difference between the spot price of a bond and the price implied by the futures contract.

Basis = P_Cash − (P_Futures × Conversion Factor)

Why isn’t it zero? If markets were efficient and frictionless, you would expect the basis to be zero. But it’s not.

1. **Carry:** You hold the bond (earn coupon) and finance it (pay repo). The futures holder puts up no cash (except margin) and earns no coupon. The futures price must be lower to compensate for this “Negative Carry” (in a normal yield curve).

2. **Delivery Options:** The futures seller (“the short”) has the right to choose ***which*** bond to deliver (from a basket) and ***when*** to deliver it. These options have value. The short will only sell the futures contract at a price that compensates them for giving up these options.

Therefore:

Futures Price = Adjusted Spot Price − Value of Options

The Basis is essentially the sum of the **Cost of Carry** and the **Option Value**. If the basis is trading “rich” (high), it means the options are expensive or carry is positive. If the basis is “cheap” (low), it means the options are cheap or carry is negative.

### 2. The Conversion Factor & The CTD

The Chicago Board of Trade (CBOT) uses **Conversion Factors (CF)** to make different bonds “equal.” A CF of 1.0 means the bond approximates a 6% coupon bond.

* If yields are > 6%, long-duration (low coupon) bonds tend to be **Cheapest to Deliver (CTD)**.

* If yields are < 6%, short-duration (high coupon) bonds tend to be CTD.

**The CTD Switch:**

This is critical. If yields move significantly, the identity of the CTD bond can change.

* *Example:* Bond A is CTD. Yields rise. Bond B (higher duration) drops in price faster than Bond A. Bond B becomes the new CTD.

* The futures contract tracks the *new* CTD (Bond B).

* The short position gains (futures price drops more than the bond they held).

* This “Switch Option” acts like a put option on the market. It makes the futures contract convex. The “short” owns this convexity. The “long” is short this convexity.

### 3. The Basis Trade (The “Widowmaker”)

Hedge funds put on the **Long Basis** trade:

* **Long:** Cash Treasury (CTD).

* **Short:** Treasury Future.

* **Financing:** Repo the Cash Treasury.

**The Math:**

You buy the bond. You short the future. You lock in the spread. If held to delivery, the prices must converge. It looks like “risk-free” profit.

* *Profit:* (Basis at entry) − (Carry cost over holding period).

* *Leverage:* Since the spread is tiny (e.g., 5/32nds), you lever it 50x.

**The Risk (2025 Edition):**

The risk is Funding Liquidity.

* You own $50 billion of Treasuries. You need to roll the repo every night.

* Suddenly, Repo rates spike (Part 1). Your “carry cost” explodes.

* Simultaneously, Treasuries **RALLY**. You lose money on the Futures Short. You get a margin call from the exchange (CME). You need cash *today*. You try to repo your bonds to get cash. But the repo market is tight. Haircuts increase.

* You are forced to sell the Cash Treasuries to meet the Futures margin call. Selling drives Cash prices down. Futures prices stay sticky. The Basis **WIDENS** against you. You blow up.

This is the “Basis Blowup” scenario flagged by the Fed. The divergence between Cayman holdings and TIC data suggests a massive, hidden, levered position. Cayman hedge funds held an estimated $1.85 trillion in Treasuries at the end of 2024, a number vastly undercounted by official data. This $1.4 trillion “gap” is the leverage bomb sitting under the market.

### 4. The Short Squeeze & The Wildcard

**The Wildcard Option:**

Futures settlement price is fixed at 2:00 PM CST. Cash bonds trade until 4:00 PM CST or later.

* *Scenario:* At 3:00 PM, bond prices crash.

* *The Short’s Move:* Buy the cheap bonds in the cash market at 3:00 PM prices. Deliver them to the Long at the 2:00 PM settlement price. Instant profit.

* This option value is priced into the basis. When volatility is high (2025), the Wildcard option is valuable. The basis should be wide. If it’s narrow, the option is cheap. Buy the options (**buy the basis**).

**The Squeeze:**

Sometimes, the CTD bond is in short supply. Dealers and hedge funds have locked it up. The “Open Interest” in the futures exceeds the “Float” of the CTD.

* This forces the Futures price *higher* relative to Cash (Basis narrows or goes negative).

* We look for “Hot-Run” bonds. If a new issue becomes CTD and is heavily shorted, the basis will squeeze.

### 5. Trading the “Switch”

We don’t just put on the basis trade and pray. We trade the **Switch**.

* Identify the current CTD and the “likely next” CTD (the challenger).

* Calculate the yield level where the switch happens (the crossover point).

* If the market is near the crossover, volatility of the basis increases.

* *Trade:* Buy the basis on the *Challenger*. If yields move, it becomes CTD and the basis collapses (profit). If yields don’t move, you earn carry (assuming repo is stable). It is a convex bet on yield direction.

**Image:** https://substackcdn.com/image/fetch/$s_!oojk!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F7ee362ea-7e05-4573-ba29-2ebcec1b402f_956x340.png

---

## Part 3: Bonds, Interest Rate Futures, and Interest Rate Swaps

**“If you are pricing swaps off the screen without adjusting for convexity, you are the yield.”**

Now we enter the OTC world. **Swaps**. This is where the plumbing meets the skyscraper. The Swap market is the largest derivative market in the world, and it is the primary venue for expressing views on interest rates, duration, and credit.

### 1. The Anatomy of a Swap

A “Plain Vanilla” Interest Rate Swap is an exchange of fixed cash flows for floating cash flows.

* **Payer:** Pays Fixed Rate (e.g., 4.50%), Receives Floating (SOFR).

* **Receiver:** Receives Fixed, Pays Floating.

**Valuation:**

The value of a swap is the present value of the difference between the fixed leg and the expected floating leg.

PV_Swap = PV_Fixed − PV_Floating

To value the floating leg, we must build a Forward Curve based on SOFR futures and forward starting swaps. We “bootstrap” the curve. This involves taking the liquid points (IMM Futures, 2y, 5y, 10y, 30y Swaps) and interpolating the rates in between to create a continuous yield curve.

### 2. Swap Spreads: The Credit/Liquidity Barometer

The Swap Spread is defined as:

Swap Spread = Swap Rate − Bond Yield

Historically, spreads were positive. The logic was based on a simple hierarchy of credit risk:

* **The Old Yardstick (LIBOR):** Swaps were priced off LIBOR (I miss you dearly), which contained unsecured bank credit risk (AA).

* **The Theory:** Banks are riskier than the US Government. Therefore, Swap Yield > Treasury Yield.

The transition from LIBOR to “risk-free” mirage SOFR fundamentally broke the old equation. Swaps no longer price in bank failure risk. They are now priced off SOFR. The “credit premium” that historically kept Swap rates *above* Treasuries has been mathematically erased. The floor dropped out from under the swap rate like Bill Hwang.

**Image:** https://substackcdn.com/image/fetch/$s_!b91_!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F388be3eb-405c-4892-abc3-684468d2ce56_429x405.png

**The Anomaly:** The New Normal In 2025, 30-year Swap Spreads are deeply negative. This is no longer about credit risk; it is about **Scarcity vs. Supply**. The market is being squeezed from two sides.

* *Why?* **Supply and Demand**.

* *The Gobblers*: Pension funds need duration. They receive fixed in 30y swaps to hedge liabilities. This buying pressure crushes the swap rate.

* *The Flood:* The US Government has unleashed unprecedented issuance to fund deficits. There is physically too much paper looking for a home. When supply overwhelms demand, prices drop and **yields rise**. This pushes the Treasury Yield *up* relative to the Swap (which has no physical supply constraint).

* *Dealer Constraints:* **The "Balance Sheet Tax" (SLR)** This is where the trap snaps shut. To bridge the gap between the **Flood of Issuance** and the **Pension Demand**, Dealers must step in and charge a premium for this balance sheet usage.

**The Trade:**

If Swap Spreads are historically tight (or negative), we put on a Spread Widener:

* Pay Fixed on the Swap.

* Buy the Treasury.

* *Thesis:* If a crisis hits, “flight to quality” drives Treasury yields down faster than Swap rates. Spreads widen. You profit.

* *Anti-Thesis*: 2020 would like to have a chat with you.

### 3. Convexity Bias: The Futures vs. Swap Disconnect

You can hedge a Swap with a SOFR Future. But they are not the same.

* **Futures:** Linear payoff. Margin is settled daily.

* **Swaps:** Convex payoff. No daily margin settlement (typically collateralized, but PV impact is non-linear).

Because futures holders get paid daily (if winning) and can reinvest that cash, futures are theoretically worth *more* than forward rates implied by swaps (which don’t pay out until the end).

* This difference is the **Convexity Bias** (as everything in Finance this formula is just an approximation).

  Forward Rate = Futures Rate − (0.5 × σ² × T²)

* *Implication:* As volatility rises, the bias increases. In 2025, with SOFR vol exploding , the gap between Futures-implied rates and Swap rates is widening. If you use raw futures prices to price swaps without adjustment, you are overestimating the rate. You are the sucker at the table.

---

## Part 4: Relative Value: Curves, Butterflies, Basis Swaps, Asset Swaps

**“God gave you a curve. You are supposed to trade the kinks.”**

This is the bread and butter of the rates semi-gods. Relative Value (RV). We don’t care if rates go to 10% or 0%. We care if the 5-year note is trading 2 basis points too cheap relative to the 2-year and 10-year notes.

### 1. PCA: Decomposing the Curve

The yield curve is 98% correlated (I made that figure up, was too lazy to actually check it, but you get the point). If the 2-year moves, the 10-year moves. We use **Principal Component Analysis (PCA)** to find the independent drivers.

* **PC1 (Level):** The whole curve moves up/down. This explains ~90% of the variance. It is driven by Fed Policy shocks and inflation data.

* **PC2 (Slope):** The curve twists (steepens or flattens). This explains ~8% of the variance. It reflects Recession fears (flattening/inversion) vs. Growth expectations (steepening).

* **PC3 (Curvature):** The belly moves vs. the wings. This explains ~2% of the variance. It is driven by Supply/Demand indigestion (e.g., massive 5-year auctions).

**The Alpha is in the Residuals:**

We model the curve using PC1, PC2, PC3. If the actual 5-year yield is 10bps higher than the model predicts, it is “cheap” on a PCA basis.

* *Trade:* Buy the 5-year. Hedge the Level (PC1) and Slope (PC2) risk using 2s and 10s. You are betting the residual collapses.

### 2. The Butterfly Trade

The butterfly exploits **Curvature** (PC3).

* **Long Body (5y), Short Wings (2y, 10y).**

* This trade is “Market Neutral” (duration zero) and “Slope Neutral” (if weighted correctly).

* It profits if the curve becomes “more humped” or “less humped.”

**2025 Regime:**

* Short-end is pinned by Fed cuts.

* Long-end is loose due to fiscal deficits.

* Belly (5y-7y) is where the supply hits.

* *Trade:* If Treasury auctions heavily in the belly, 5s cheapen relative to the interpolation of 2s and 10s. We put on a “Fly” (Long 5s, Short 2s/10s) to capture the richening after the auction digests.

### 3. Mean Reversion & First Passage Time

When does a trade pay off? We don’t guess. We model the spread as an Ornstein-Uhlenbeck (OU) process (NEEEERD):

dx_t = θ (μ − x_t) dt + σ dW_t

We calculate the **First Passage Time Density**. This tells us: “There is a 65% probability this spread reverts to mean within 14 days.” If the carry cost of holding the trade for 14 days is less than the expected profit, we execute. If not, we pass. We view the world through **Expected Value (EV)**.

### 4. Basis Swaps: The building blocks

Basis swaps trade one floating index for another (e.g., 3m SOFR vs. 1m SOFR, or SOFR vs. Fed Funds).

* These swaps tell us about the plumbing stress.

* If SOFR/FedFunds basis (SERFF) tightens, it means secured funding is expensive relative to unsecured.

* We monitor these to time our entries into broader curve trades.

---

## Part 5: FX: Spot, Cross-Currency Swaps, FX SWAPS, NDFs

**“Currency is the stock price of a nation. And most nations are Enron.”**

FX is not just about tourism. It is about funding. The Cross-Currency Basis Swap (XCCY) is the most important indicator of global dollar liquidity.

### 1. The Cross-Currency Basis (XCCY)

This is the master variable.

* **Definition:** The cost to swap one currency for another (e.g., EUR for USD) while hedging the FX risk.

* **CIP Theory:** Cost should be zero (after adjusting for interest rates).

* **Reality:** It is not zero. It is often negative. This means you have to *pay* a premium to get USD.

**Why?**

* **Global USD Demand:** Everyone needs dollars for trade/debt servicing.

* **Dealer Constraints:** Banks have limited balance sheet to lend dollars. Basel III rules make it expensive to engage in low-margin arbitrage.

* **Reverse Yankees:** US companies issuing bonds in EUR (because rates are lower there) and swapping proceeds to USD. This massive flow pushes the basis more negative.

**2025 Dynamics:**

As of early 2025, the XCCY basis remains relatively wide (near zero), suggesting funding markets are functioning. However, the “GSIB risk dieting” at year-end typically causes the basis to widen sharply as banks pull back from lending dollars. We trade this seasonality.

### 2. FX Swaps

The FX Swap market is huge ($3.8T/day). It is mostly short-term ( < 1 week).

* *Function:* Rolling FX hedges. Managing daily liquidity.

* *Risk:* Rollover risk. If the FX swap market freezes (like in 2008 or March 2020), foreign banks cannot fund their USD assets. They are forced to sell assets (Treasuries). This links FX funding stress directly to Treasury market volatility.

### 3. Non-Deliverable Forwards (NDFs)

For currencies with capital controls (CNY, BRL, INR), we trade NDFs.

* Cash settled in USD.

* The “Fixing Risk”: The trade settles based on the official central bank rate. If the central bank manipulates the fixing (which they do), you get burned.

* We trade the **NDF-Onshore Basis**. If the NDF trades way above the onshore spot, the market is pricing in devaluation/capital flight.

---

## Part 6: Global Macro: Flows, Imbalances, and The End Game

**“Flows dictate price. Valuation is a fable we tell ourselves to sleep at night.”**

Finally, we zoom out. We connect the plumbing to the big picture. 2025 is the year of **Tariffs** and **Trade Wars**. This impacts the Balance of Payments (BoP) directly.

### 1. Balance of Payments (BoP)

We follow the money.

Current Account + Capital Account + Financial Account + Errors = 0

* **US Situation:** Massive Current Account Deficit. More consumption than production.

* **Funding:** The world needs to buy the debt.

* **2025 Risk:** If Tariffs slow global trade, the recycling of dollars slows down. Foreigners have fewer dollars to buy Treasuries. Yields must rise to attract capital.

### 2. Net International Investment Position (NIIP)

The US NIIP is deeply negative ($18 Trillion). The US is the world’s largest debtor.

* Usually, this crashes a currency.

* **US Exception:** The liabilities are in USD. Their assets abroad are in foreign currency. If USD falls, theirs assets gain value, liabilities stay same. It’s a hedge.

* **The Trap:** If foreigners lose faith in the USD as a reserve asset (due to weaponization of the dollar or fiscal profligacy), the flows reverse violently. This is the “Sudden Stop.”

Long Volatility, short the Consensus.

This is not investment advice, just therapy.

*(End OnlySOFRs primer body as retrieved from Substack.)*

---

# 7. MACROS & RATES — Conks pointers (RRP, SOFR, equity repo)

**Home:** https://www.conks.plumbing/ · **X:** [@conksresearch](https://x.com/conksresearch)

Deep posts often live behind Substack; these are **public teaching posts / pointers** from the account map you used.

### SOFR definition thread fragment

**Post:** [1622396614521540608](https://x.com/conksresearch/status/1622396614521540608) · 2023-02-06

SOFR is a broad measure of the cost of borrowing cash overnight against U.S. Treasuries, an asset that market participants consider to be the most pristine collateral. This type of secured loan is also known as a repurchase agreement, or a "repo" for short...

### ON RRP as floor

**Post:** [1572379637736669184](https://x.com/conksresearch/status/1572379637736669184) · 2022-09-21

To counteract this, the Fed created the overnight reverse repo facility, ON RRP. This offered another risk-free investment at a set rate to parties ineligible for IOER, thereby fixing the bug and setting a lower bound on interest rates. Money markets obeyed with minimal fuss..

### RRP endgame (in-depth post pointer)

**Post:** [1888367443845784062](https://x.com/conksresearch/status/1888367443845784062) · 2025-02-08

I've been told I need to promote my work more and not just shitpost all the time, so here goes: a previous post that aged well on in-depth RRP mechanics (since we're all talking about it all of a sudden)

https://www.conks.plumbing/p/the-reverse-repo-endgame

### Equity repo primer pointer

**Post:** [2076415033064513992](https://x.com/conksresearch/status/2076415033064513992) · 2026-07-12

new plumbing notes just dropped

a schizo primer on "equity repo"

https://www.conks.plumbing/p/plumbing-notes-the-equity-repo-mania

### How this pairs with OnlySOFRs (for reading order)

1. OnlySOFRs **Part 1** (hierarchy EFFR / SOFR / RRP / SRF / SLR)  
2. Conks **RRP endgame** post  
3. OnlySOFRs **Part 2** (cash–futures basis blowup)  
4. Conks **equity repo** notes (collateral outside UST)  
5. OnlySOFRs **Parts 3–6** (swaps, RV, XCCY, flows)

---

# 8. Link index (open originals)

### Options / Greeks education
| Link | What |
|------|------|
| https://x.com/bennpeifert/status/1572019785797603328 | Full θ ≠ free money Taylor thread |
| https://x.com/bennpeifert/status/2008965329561768420 | ATM θ = expected γ PnL note |
| https://www.qvradvisors.com/research | Common VRP Discussions (Benn follow-up) |
| https://x.com/MenthorQpro/status/2075962590849540135 | Theta / weekend / trading time |

### Positioning / dealer flows education
| Link | What |
|------|------|
| https://x.com/VolSignals/status/2056356493662863567 | 0DTE vs expiring OI γ + Charm yellow |
| https://x.com/VolSignals/status/2074500740240883856 | Dealer short calls / futures sell path |
| https://vs3d.volsignals.com/home | VS3D product (see charts yourself) |
| https://x.com/MenthorQpro/status/1903713836412112954 | GS “buy or buy” dealer γ |
| https://x.com/MenthorQpro/status/2074886929271722038 | Positioning magnets at strikes |
| https://x.com/spotgamma/status/2074835774927687878 | Buyside short γ / dealers long |
| https://spotgamma.com/geopolitical-risk-hits-a-fragile-market/ | Trapdoor narrative article |
| https://spotgamma.com/the-markets-0dte-underbelly-is-exposed/ | 0DTE underbelly article |

### Macros / rates / plumbing education
| Link | What |
|------|------|
| https://onlysofrs.substack.com/p/the-plumbing-the-basis-and-the-end | **Full primer** (repo → basis → swaps → RV → FX → macro) |
| https://www.conks.plumbing/ | Conks home |
| https://www.conks.plumbing/p/the-reverse-repo-endgame | RRP mechanics deep dive |
| https://www.conks.plumbing/p/plumbing-notes-the-equity-repo-mania | Equity repo primer |
| https://x.com/conksresearch | Live plumbing notes |

### Optional lab tools (education by clicking, not prose)
| Link | What |
|------|------|
| https://thalextech.github.io/ | Thalex crypto options lab tools |
| https://tradingalgo.blr1.digitaloceanspaces.com/index.html | TradingAlgo open dashboards checklist |

---

## If you share more threads later

Paste **links or screenshots** of any education thread (options, GEX, SOFR, swaps, etc.). I will **append full text into this file by topic** — same rule: for **you to read**, not turned into a build brief unless you ask.

---

*End of education pack.*
