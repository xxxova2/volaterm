import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard, Activity, Layers, Calculator, Shield,
  Bitcoin, Landmark,
} from 'lucide-react';

/**
 * Pro desk IA — 7 top-level tabs.
 * Macro tools live under Macros & Rates (not a separate nav item).
 */
export type TabId =
  | 'home'
  | 'vol'
  | 'positioning'
  | 'greeks'
  | 'desk'
  | 'crypto'
  | 'rates';

export interface TabDef {
  id: TabId;
  label: string;
  hotkey: string;
  icon: LucideIcon;
}

export const TABS: TabDef[] = [
  { id: 'home', label: 'Home', hotkey: '1', icon: LayoutDashboard },
  { id: 'vol', label: 'Vol Structure', hotkey: '2', icon: Activity },
  { id: 'positioning', label: 'Positioning', hotkey: '3', icon: Layers },
  { id: 'greeks', label: 'Greeks', hotkey: '4', icon: Calculator },
  { id: 'desk', label: 'MM Desk', hotkey: '5', icon: Shield },
  { id: 'crypto', label: 'Crypto', hotkey: '6', icon: Bitcoin },
  { id: 'rates', label: 'Macros & Rates', hotkey: '7', icon: Landmark },
];
