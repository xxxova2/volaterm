/**
 * Short educational cards shown on first-open boot while chains load.
 * Distilled from docs/options/EDUCATION_OPTIONS_MACROS_RATES.md (public teaching sources).
 * Educational only — not trade signals.
 */

export type BootEduCard = {
  id: string;
  topic: 'greeks' | 'positioning' | 'rates' | 'market';
  title: string;
  body: string;
  source: string;
};

export const BOOT_EDUCATION: BootEduCard[] = [
  {
    id: 'theta-not-free',
    topic: 'greeks',
    title: 'θ is not free money',
    body:
      'Theta on a short option is compensation for asymmetric risk — gamma, volga, and vanna. When spot or IV jumps, those terms can erase “theta income.” ATM, fair θ ≈ expected γ PnL from spot moves.',
    source: '@bennpeifert · Taylor / VRP',
  },
  {
    id: 'taylor',
    topic: 'greeks',
    title: 'Taylor identity (options PnL)',
    body:
      'dV ≈ θ dt + Δ dS + ν dσ + ½ Γ (dS)² + ½ volga (dσ)² + vanna dS dσ. Short options collect θ but pay the convex terms when realized moves exceed what IV priced.',
    source: '@bennpeifert',
  },
  {
    id: 'weekend-theta',
    topic: 'greeks',
    title: 'Weekend θ vs trading time',
    body:
      'Models advance calendar time over weekends; markets are closed. Friday IV often embeds weekend risk — Monday “theta” can be mechanical clock advance, not free edge.',
    source: '@MenthorQpro',
  },
  {
    id: 'charm-bias',
    topic: 'positioning',
    title: 'Charm = delta decay / day',
    body:
      'Charm is how delta changes as time passes. Dealer-style charm maps show where inventory may force buying or selling futures as the clock runs — path bias, not a crystal ball.',
    source: '@VolSignals / VS3D language',
  },
  {
    id: 'gex-walls',
    topic: 'positioning',
    title: 'GEX walls · flip · HVL',
    body:
      'Call resistance / put support = strikes with large OI-inferred gamma. Flip ≈ cumulative net GEX zero-cross. HVL ≈ max |net GEX| strike. We use listed OI + dealer convention — not proprietary MM books.',
    source: 'MenthorQ / SpotGamma chart language',
  },
  {
    id: 'pos-gamma',
    topic: 'positioning',
    title: 'Positive γ above spot',
    body:
      'Where dealers are long gamma, hedging damps moves (rally ceiling / pin feel). Negative γ below can amplify — “free to move” / trapdoor language. Always badge: OI-inferred.',
    source: 'VS3D / SpotGamma teaching cards',
  },
  {
    id: 'sofr',
    topic: 'rates',
    title: 'SOFR = overnight funding pulse',
    body:
      'SOFR is the secured overnight financing rate — the plumbing heartbeat for USD cash. Spikes or sticky elevated SOFR vs EFFR can flag reserve / repo stress that bleeds into risk assets.',
    source: 'OnlySOFRs / Conks plumbing',
  },
  {
    id: 'rrp-slr',
    topic: 'rates',
    title: 'RRP, reserves, SLR',
    body:
      'ON RRP drain and bank reserves change how much cash sits at the Fed vs private markets. SLR and bill supply reshape the same plumbing — watch rates desk cards while vol loads.',
    source: '@conksresearch',
  },
  {
    id: 'curve',
    topic: 'rates',
    title: '2s10s & front end',
    body:
      'Curve steepness (2s10s, 3m10y) frames risk appetite and policy path. STIR / SOFR futures price near-term cuts or holds that options vol often co-moves with.',
    source: 'FRED · NYFed rates',
  },
  {
    id: 'vrp',
    topic: 'market',
    title: 'VRP is not free either',
    body:
      'Implied vol usually sits above realized — sellers of premium earn a risk premium only if they survive γ/vanna path risk and costs. Compare ATM IV to RV20, not to VIXCLS (that is index basis, not VRP).',
    source: 'Common VRP discussions · Benn',
  },
  {
    id: 'surface-shape',
    topic: 'market',
    title: 'Surface shape can move without vol moving',
    body:
      'Between chain refreshes we reprice greeks at sticky IV. Spot moves → moneyness grid shifts → 3D shape can change while fixed-strike IV is frozen. Check VOL strip path: sticky-IV vs full-chain, and ΔATM vs ΔRR25.',
    source: 'Academy · sticky strike / desk practice',
  },
];
