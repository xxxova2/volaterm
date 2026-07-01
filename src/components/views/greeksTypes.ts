export type GreekKey =
  | 'delta'
  | 'gamma'
  | 'theta'
  | 'vega'
  | 'rho'
  | 'vanna'
  | 'charm'
  | 'volga'
  | 'speed'
  | 'veta'
  | 'color'
  | 'zomma'
  | 'ultima';

export interface GreekMeta {
  key: GreekKey;
  label: string;
  diverging: boolean;
}

export const GREEK_META: readonly GreekMeta[] = [
  { key: 'delta', label: 'Delta', diverging: true },
  { key: 'gamma', label: 'Gamma', diverging: false },
  { key: 'theta', label: 'Theta', diverging: true },
  { key: 'vega', label: 'Vega', diverging: false },
  { key: 'rho', label: 'Rho', diverging: true },
  { key: 'vanna', label: 'Vanna', diverging: true },
  { key: 'charm', label: 'Charm', diverging: true },
  { key: 'volga', label: 'Volga', diverging: false },
  { key: 'speed', label: 'Speed', diverging: true },
  { key: 'veta', label: 'Veta', diverging: true },
  { key: 'color', label: 'Color', diverging: true },
  { key: 'zomma', label: 'Zomma', diverging: true },
  { key: 'ultima', label: 'Ultima', diverging: false },
] as const;

export const GREEK_KEYS: readonly GreekKey[] = GREEK_META.map(m => m.key);

export interface HeatmapCell {
  strike: number;
  dte: number;
  expiry: string;
  value: number | null;
  quote?: {
    type: 'call' | 'put';
    mid: number;
    iv: number | null;
    delta: number | null;
  };
}
