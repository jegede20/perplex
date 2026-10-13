'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useLiveBlockNumber } from '@/lib/perpl/hooks';
import { formatBlockNumber } from '@/lib/utils/format';
import LiveDot from '@/components/ui/LiveDot';
import PerplexLogo from '@/components/ui/PerplexLogo';
import MobileMenu from '@/components/layout/MobileMenu';

/**
 * App top bar — brand + network status + mobile menu button. Navigation
 * lives in the Sidebar (desktop) and the MobileMenu drawer (below md), so
 * the header stays clean and never duplicates the menu.
 */
export default function Navbar() {
  const block = useLiveBlockNumber();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header
        className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex h-14 items-center justify-between gap-4 px-4 md:px-6">
          {/* Left: brand — mobile only; on desktop the sidebar owns the logo */}
          <Link href="/app" aria-label="Perplex — app home" className="md:hidden">
            <PerplexLogo size={30} />
          </Link>

          {/* Right: network + block + powered-by + mobile hamburger */}
          <div className="ml-auto flex items-center gap-2">
            <span
              className="hidden items-center gap-1.5 rounded-full border border-primary/60 px-2.5 py-1 text-[11px] font-medium text-primary sm:flex"
              title="Monad Mainnet — chain ID 143"
            >
              <LiveDot /> Monad Mainnet
              <span className="text-textMuted">· 143</span>
            </span>
            <span
              className="tabular hidden items-center gap-1 rounded-full border border-border bg-surface2 px-2.5 py-1 text-[11px] text-textSecondary lg:flex"
              title="Live Monad block number"
            >
              Block #{block > 0n ? formatBlockNumber(block) : '—'}
            </span>
            <a
              href="https://app.perpl.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center rounded-full border border-border px-2.5 py-1 text-[11px] text-textSecondary transition-colors duration-150 hover:border-primary hover:text-primary md:flex"
            >
              Powered by Perpl
            </a>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Open menu"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-textSecondary transition-colors duration-150 hover:bg-surface2 hover:text-textPrimary md:hidden"
            >
              {menuOpen ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
            </button>
          </div>
        </div>
      </header>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
