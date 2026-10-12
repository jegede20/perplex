'use client';

import Link from 'next/link';
import { useLiveBlockNumber } from '@/lib/perpl/hooks';
import { formatBlockNumber } from '@/lib/utils/format';
import LiveDot from '@/components/ui/LiveDot';
import PerplexLogo from '@/components/ui/PerplexLogo';

/**
 * App top bar — brand + network status only. Navigation lives in the
 * Sidebar (desktop) and the mobile bottom tab bar, so the header stays
 * clean and never duplicates the menu.
 */
export default function Navbar() {
  const block = useLiveBlockNumber();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
      <div className="flex h-14 items-center justify-between gap-4 px-4 md:px-6">
        {/* Left: brand */}
        <Link href="/app" aria-label="Perplex — app home">
          <PerplexLogo size={30} />
        </Link>

        {/* Right: network + block + powered-by */}
        <div className="flex items-center gap-2">
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
        </div>
      </div>
    </header>
  );
}
