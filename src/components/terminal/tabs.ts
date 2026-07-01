import type { LucideIcon } from 'lucide-react';
import { Activity, BarChart3, TrendingUp, Calculator, Zap, Table, LayoutDashboard, AlertTriangle } from 'lucide-react';

export type TabId = 'surface' | 'smile' | 'term' | 'greeks' | 'gex' | 'chain' | 'dashboard' | 'arbitrage';

export interface TabDef {
  id: TabId;
  label: string;
  hotkey: string;
  icon: LucideIcon;
}

export const TABS: TabDef[] = [
  { id: 'surface', label: 'Vol Surface', hotkey: '1', icon: Activity },
  { id: 'smile', label: 'Smile/Skew', hotkey: '2', icon: BarChart3 },
  { id: 'term', label: 'Term Structure', hotkey: '3', icon: TrendingUp },
  { id: 'greeks', label: 'Greeks', hotkey: '4', icon: Calculator },
  { id: 'gex', label: 'Gamma Exposure', hotkey: '5', icon: Zap },
  { id: 'chain', label: 'Option Chain', hotkey: '6', icon: Table },
  { id: 'dashboard', label: 'Dashboard', hotkey: '7', icon: LayoutDashboard },
  { id: 'arbitrage', label: 'Arbitrage', hotkey: '8', icon: AlertTriangle },
];
