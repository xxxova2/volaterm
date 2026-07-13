import type { LucideIcon } from 'lucide-react';
import {
  Activity, Layers, Shield,
  Bitcoin, Landmark,
} from 'lucide-react';

/**
 * Pro desk IA — 5 top-level desks. Vol is the default landing desk.
 * Greeks 1.0 lives under Trade · Analyze (not a peer desk).
 */
export type TabId = 'vol' | 'positioning' | 'desk' | 'crypto' | 'rates';

export interface TabDef {
  id: TabId;
  label: string;
  hotkey: string;
  icon: LucideIcon;
}

export const TABS: TabDef[] = [
  { id: 'vol', label: 'Vol', hotkey: '1', icon: Activity },
  { id: 'positioning', label: 'Flow', hotkey: '2', icon: Layers },
  { id: 'desk', label: 'Trade', hotkey: '3', icon: Shield },
  { id: 'crypto', label: 'Crypto', hotkey: '4', icon: Bitcoin },
  { id: 'rates', label: 'Rates', hotkey: '5', icon: Landmark },
];
