import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  GitCompareArrows,
  Home,
  Map as MapIcon,
  Search,
  Waves,
  Zap,
} from 'lucide-react';

export interface NavItem {
  /** Route — also the active-state key. */
  href: string;
  /** Display label (shared by the desktop sidebar and the mobile menu). */
  label: string;
  icon: LucideIcon;
}

/** Single source of truth for app navigation — sidebar + mobile menu. */
export const NAV_ITEMS: NavItem[] = [
  { href: '/app', label: 'Overview', icon: Home },
  { href: '/app/markets', label: 'Markets', icon: BarChart3 },
  { href: '/app/feed', label: 'Live Feed', icon: Zap },
  { href: '/app/wallet', label: 'Wallets', icon: Search },
  { href: '/app/liquidation-map', label: 'Liq. Map', icon: MapIcon },
  { href: '/app/sentiment', label: 'Sentiment', icon: Waves },
  { href: '/app/compare', label: 'Compare', icon: GitCompareArrows },
];

/** Whether a nav target is active for the given pathname. */
export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === '/app') return pathname === '/app';
  return pathname === href || pathname.startsWith(`${href}/`);
}
