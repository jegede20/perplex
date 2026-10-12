'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import PerplexLogo from '@/components/ui/PerplexLogo';

const NAV_LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How It Works' },
  { href: '#why-monad', label: 'Why Monad?' },
];

/**
 * Sticky landing navbar — blur-on-scroll glass bar with anchor links
 * and the persistent Launch App CTA.
 */
export default function LandingNavbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-6">
        {/* logo */}
        <Link href="/" aria-label="Perplex — home">
          <PerplexLogo size={32} />
        </Link>

        {/* center links (desktop) */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Landing">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="px-3 py-2 text-[13px] font-medium text-textSecondary transition-colors duration-150 hover:text-textPrimary"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* right: launch + hamburger */}
        <div className="flex items-center gap-2">
          <Link
            href="/app"
            className="rounded-lg bg-primary px-5 py-2.5 text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-primary/90"
          >
            Launch App →
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-textSecondary md:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
          >
            {open ? <X size={16} aria-hidden /> : <Menu size={16} aria-hidden />}
          </button>
        </div>
      </div>

      {/* mobile menu */}
      {open && (
        <nav
          className="border-t border-border bg-background/95 px-6 py-3 md:hidden"
          aria-label="Landing mobile"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block py-2.5 text-[13px] font-medium text-textSecondary"
            >
              {link.label}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}
