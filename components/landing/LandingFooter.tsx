'use client';

import Link from 'next/link';
import { ExternalLink, Github, Twitter } from 'lucide-react';
import PerplexLogo from '@/components/ui/PerplexLogo';
import LiveDot from '@/components/ui/LiveDot';
import { useLiveBlockNumber } from '@/lib/perpl/hooks';
import { formatBlockNumber } from '@/lib/utils/format';

const PRODUCT_LINKS = [
  { href: '/app', label: 'Overview' },
  { href: '/app/markets', label: 'Markets' },
  { href: '/app/feed', label: 'Live Feed' },
  { href: '/app/wallet', label: 'Wallet Explorer' },
  { href: '/app/wallet', label: 'Leaderboard' },
];

const RESOURCE_LINKS = [
  {
    href: 'https://github.com/jegede20/perplex',
    label: 'GitHub Repository',
  },
  {
    href: 'https://github.com/jegede20/perplex/blob/main/LICENSE',
    label: 'MIT License',
  },
  {
    href: 'https://github.com/jegede20/perplex#readme',
    label: 'Documentation',
  },
];

const ECOSYSTEM_LINKS = [
  { href: 'https://app.perpl.xyz', label: 'Perpl DEX' },
  { href: 'https://docs.perpl.xyz', label: 'Perpl Docs' },
  { href: 'https://x.com/perpltrade', label: 'Perpl on X' },
  { href: 'https://monad.xyz', label: 'Monad' },
  { href: 'https://monadexplorer.com', label: 'MonadScan' },
];

function ExternalItem({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 text-sm text-textSecondary transition-colors duration-150 hover:text-white"
    >
      {label} <ExternalLink size={11} aria-hidden />
    </a>
  );
}

/**
 * Complete landing footer — 4-column sitemap + live-block bottom bar.
 */
export default function LandingFooter() {
  const block = useLiveBlockNumber();

  return (
    <footer className="border-t border-border" style={{ background: '#0A0A0F' }}>
      {/* top */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-8 py-16 sm:grid-cols-2 lg:grid-cols-5">
        {/* brand */}
        <div className="lg:col-span-2">
          <PerplexLogo size={38} tagline />
          <p className="mt-3 text-sm leading-relaxed text-textSecondary">
            The first protocol analytics and wallet intelligence platform for
            Perpl&apos;s fully on-chain perpetual futures markets on Monad. Track
            smart money. Understand risk.
          </p>
          <p className="mt-4 flex items-center gap-2 text-xs text-textMuted">
            <LiveDot /> Live on Monad Mainnet · Chain ID 143
          </p>
          <div className="mt-4 flex gap-3">
            <a
              href="https://github.com/jegede20/perplex"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface2 text-textMuted transition-colors duration-150 hover:bg-surface hover:text-white"
            >
              <Github size={15} aria-hidden />
            </a>
            <a
              href="https://x.com/perpltrade"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Twitter / X"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface2 text-textMuted transition-colors duration-150 hover:bg-surface hover:text-white"
            >
              <Twitter size={15} aria-hidden />
            </a>
          </div>
        </div>

        {/* product */}
        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary">
            Product
          </p>
          <div className="flex flex-col gap-2.5">
            {PRODUCT_LINKS.map((link, i) => (
              <Link
                key={`${link.label}-${i}`}
                href={link.href}
                className="flex items-center gap-1.5 text-sm text-textSecondary transition-colors duration-150 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* resources */}
        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary">
            Resources
          </p>
          <div className="flex flex-col gap-2.5">
            {RESOURCE_LINKS.map((link) => (
              <ExternalItem key={link.label} {...link} />
            ))}
          </div>
          <div className="mt-5 border-t border-border pt-5">
            <div className="flex flex-col gap-1 text-xs">
              <p className="text-textMuted">Built for:</p>
              <p className="text-textSecondary">Monad Metropolis Hackathon</p>
              <p className="text-textMuted">Track: Onchain Finance &amp; Trading</p>
              <p className="text-textMuted">Bounty: Best Analytics / Risk Tool</p>
              <p className="text-textMuted">Sponsor: Perpl</p>
            </div>
          </div>
        </div>

        {/* ecosystem */}
        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary">
            Ecosystem
          </p>
          <div className="flex flex-col gap-2.5">
            {ECOSYSTEM_LINKS.map((link) => (
              <ExternalItem key={link.label} {...link} />
            ))}
          </div>
          <div className="mt-5 border-t border-border pt-5">
            <div className="flex flex-col gap-1 text-xs text-textMuted">
              <p>Chain: Monad Mainnet</p>
              <p>Chain ID: 143</p>
              <p>RPC: rpc.monad.xyz</p>
            </div>
          </div>
        </div>
      </div>

      {/* bottom bar */}
      <div className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-8 py-4 sm:flex-row">
          <p className="flex items-center gap-1.5 font-mono text-xs text-textMuted">
            <span className="text-primary">⬡</span>
            Block #{block > 0n ? formatBlockNumber(block) : '…'}
          </p>
          <p className="text-center text-xs text-textMuted">
            © 2026 Perplex · MIT License · Open Source
          </p>
          <p className="text-right text-xs text-textMuted">
            Built for Monad Metropolis Hackathon
          </p>
        </div>
      </div>
    </footer>
  );
}
