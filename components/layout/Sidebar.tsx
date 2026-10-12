'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  BarChart3,
  Zap,
  Search,
  Github,
  ExternalLink,
  Map as MapIcon,
  Waves,
  GitCompareArrows,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import PerplexLogo from '@/components/ui/PerplexLogo';

const NAV_ITEMS = [
  { href: '/app', label: 'Overview', short: 'Home', icon: Home },
  { href: '/app/markets', label: 'Markets', short: 'Markets', icon: BarChart3 },
  { href: '/app/feed', label: 'Live Feed', short: 'Feed', icon: Zap },
  { href: '/app/wallet', label: 'Wallets', short: 'Wallets', icon: Search },
  { href: '/app/liquidation-map', label: 'Liq. Map', short: 'LiqMap', icon: MapIcon },
  { href: '/app/sentiment', label: 'Sentiment', short: 'Mood', icon: Waves },
  { href: '/app/compare', label: 'Compare', short: 'Vs', icon: GitCompareArrows },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/app') return pathname === '/app';
  return pathname === href || pathname.startsWith(`${href}/`);
}

interface SidebarItemProps {
  href: string;
  label: string;
  icon: typeof Home;
  active: boolean;
}

function SidebarItem({ href, label, icon: Icon, active }: SidebarItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors duration-150',
        active
          ? 'bg-primary/15 text-primary shadow-[inset_0_0_0_1px_rgba(123,94,167,0.25)]'
          : 'text-textSecondary hover:bg-surface2 hover:text-textPrimary'
      )}
      aria-current={active ? 'page' : undefined}
    >
      <Icon size={17} aria-hidden />
      {label}
    </Link>
  );
}

/**
 * App navigation — the single source of nav on desktop (the top bar
 * stays brand + status only). On mobile it becomes a 7-slot bottom tab
 * bar that fits a 375px viewport without scrolling.
 */
export default function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-[220px] flex-col border-r border-border bg-surface md:flex">
        <div className="flex h-14 items-center border-b border-border px-4">
          <Link href="/app" aria-label="Perplex — app home">
            <PerplexLogo size={30} />
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-2 py-4" aria-label="Sidebar">
          {NAV_ITEMS.map((item) => (
            <SidebarItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={isActive(pathname, item.href)}
            />
          ))}
        </nav>

        <div className="space-y-2 border-t border-border px-4 py-4 text-[11px] text-textMuted">
          <a
            href="https://app.perpl.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 transition-colors duration-150 hover:text-primary"
          >
            Powered by Perpl <ExternalLink size={11} aria-hidden />
          </a>
          <a
            href="https://www.monad.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 transition-colors duration-150 hover:text-primary"
          >
            Built on Monad <ExternalLink size={11} aria-hidden />
          </a>
          <a
            href="https://github.com/perplex-protocol/perplex"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 transition-colors duration-150 hover:text-primary"
          >
            <Github size={11} aria-hidden /> GitHub
          </a>
        </div>
      </aside>

      {/* Mobile bottom tab nav — 7 equal slots, no horizontal scroll */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 flex border-t border-border bg-surface/95 backdrop-blur md:hidden"
        aria-label="Mobile"
      >
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 text-[9px] font-medium transition-colors duration-150',
                active ? 'text-primary' : 'text-textSecondary'
              )}
              aria-current={active ? 'page' : undefined}
            >
              <item.icon size={16} aria-hidden />
              <span className="w-full truncate text-center leading-tight">{item.short}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
