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
  PanelLeftClose,
  PanelLeftOpen,
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

function RailTooltip({ label }: { label: string }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-[60] -translate-y-1/2 whitespace-nowrap rounded-md border border-border bg-surface2 px-2 py-1 text-[12px] font-medium text-textPrimary opacity-0 shadow-glow-sm transition-opacity duration-150 group-hover:opacity-100"
    >
      {label}
    </span>
  );
}

interface SidebarItemProps {
  href: string;
  label: string;
  icon: typeof Home;
  active: boolean;
  collapsed: boolean;
}

function SidebarItem({ href, label, icon: Icon, active, collapsed }: SidebarItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        'group relative flex items-center rounded-lg text-[13px] font-medium transition-colors duration-150',
        collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5',
        active
          ? 'bg-primary/15 text-primary shadow-[inset_0_0_0_1px_rgba(123,94,167,0.25)]'
          : 'text-textSecondary hover:bg-surface2 hover:text-textPrimary'
      )}
      aria-current={active ? 'page' : undefined}
      aria-label={collapsed ? label : undefined}
    >
      <Icon size={17} aria-hidden />
      {!collapsed && <span className="truncate">{label}</span>}
      {collapsed && <RailTooltip label={label} />}
    </Link>
  );
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  /** Enable the width transition only after mount (persisted state loads without a slide). */
  animate: boolean;
}

/**
 * App navigation — the single source of nav on desktop (the top bar
 * stays status only). Collapsible: ~240px with labels, or a ~72px icon
 * rail with hover tooltips. On mobile it becomes a 7-slot bottom tab
 * bar that fits a 375px viewport without scrolling.
 */
export default function Sidebar({ collapsed, onToggle, animate }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar — collapsible rail */}
      <aside
        className={cn(
          'sticky top-0 z-50 hidden h-screen shrink-0 self-start flex-col border-r border-border bg-surface md:flex',
          collapsed ? 'w-[72px]' : 'w-[240px]',
          animate && 'transition-[width] duration-200 ease-out'
        )}
        onTransitionEnd={(e) => {
          if (e.propertyName === 'width') {
            window.dispatchEvent(new Event('resize'));
          }
        }}
      >
        <div
          className={cn(
            'flex h-14 items-center border-b border-border',
            collapsed ? 'justify-center gap-0.5 px-1' : 'gap-1 px-3'
          )}
        >
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            title={`${collapsed ? 'Expand' : 'Collapse'} sidebar (Ctrl+B)`}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-textSecondary transition-colors duration-150 hover:bg-surface2 hover:text-textPrimary"
          >
            {collapsed ? <PanelLeftOpen size={17} aria-hidden /> : <PanelLeftClose size={17} aria-hidden />}
          </button>
          <Link
            href="/app"
            aria-label="Perplex — app home"
            className="min-w-0"
            tabIndex={collapsed ? -1 : undefined}
          >
            <PerplexLogo size={collapsed ? 26 : 30} wordmark={!collapsed} tagline={!collapsed} />
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
              collapsed={collapsed}
            />
          ))}
        </nav>

        <div
          className={cn(
            'space-y-2 border-t border-border py-4 text-[11px] text-textMuted',
            collapsed ? 'px-2' : 'px-4'
          )}
        >
          {!collapsed ? (
            <>
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
                href="https://github.com/jegede20/perplex"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 transition-colors duration-150 hover:text-primary"
              >
                <Github size={11} aria-hidden /> GitHub
              </a>
            </>
          ) : (
            <a
              href="https://github.com/jegede20/perplex"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="group relative flex items-center justify-center rounded-lg py-1.5 transition-colors duration-150 hover:text-primary"
            >
              <Github size={14} aria-hidden />
              <RailTooltip label="GitHub" />
            </a>
          )}
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
