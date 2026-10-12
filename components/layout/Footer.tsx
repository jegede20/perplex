'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Github, Zap, X } from 'lucide-react';
import { useLiveBlockNumber } from '@/lib/perpl/hooks';
import { formatBlockNumber } from '@/lib/utils/format';

export default function Footer() {
  const block = useLiveBlockNumber();
  const [showWhyMonad, setShowWhyMonad] = useState(false);

  return (
    <footer className="mt-2 border-t border-border bg-surface">
      <div className="flex flex-col items-center justify-between gap-3 px-4 py-4 text-[11px] text-textMuted md:flex-row md:px-6">
        {/* Left */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-textSecondary">Perplex</span>
          <span aria-hidden>·</span>
          <a
            href="https://github.com/jegede20/perplex/blob/main/LICENSE"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors duration-150 hover:text-primary"
          >
            MIT License
          </a>
          <span aria-hidden>·</span>
          <span>Open Source</span>
        </div>

        {/* Center: LIVE block — proves real Monad connection */}
        <button
          type="button"
          onClick={() => setShowWhyMonad(true)}
          className="tabular flex items-center gap-1.5 rounded-full border border-border bg-surface2 px-3 py-1 text-textSecondary transition-colors duration-150 hover:border-primary hover:text-primary"
          title="Live Monad block — click for Why Monad?"
        >
          <span className="text-primary" aria-hidden>⬡</span>
          Block #{block > 0n ? formatBlockNumber(block) : '—'}
          <span className="ml-1 text-[10px] text-textMuted">(live)</span>
        </button>

        {/* Right */}
        <div className="flex items-center gap-3">
          <a
            href="https://github.com/jegede20/perplex"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Perplex on GitHub (opens in a new tab)"
            className="flex items-center gap-1.5 transition-colors duration-150 hover:text-primary"
          >
            <Github size={12} aria-hidden /> GitHub
          </a>
          <span aria-hidden>·</span>
          <span>Built for Monad Metropolis Hackathon</span>
        </div>
      </div>

      {/* Why Monad modal */}
      {showWhyMonad && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Why Monad"
          onClick={() => setShowWhyMonad(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-xl border border-border bg-surface p-6 shadow-glow"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowWhyMonad(false)}
              aria-label="Close dialog"
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-textSecondary transition-colors duration-150 hover:bg-surface2 hover:text-textPrimary"
            >
              <X size={16} aria-hidden />
            </button>
            <h2 className="mb-1 flex items-center gap-2 text-[18px] font-bold text-textPrimary">
              <Zap size={18} className="text-primary" aria-hidden /> Why Monad?
            </h2>
            <p className="mb-4 text-[12px] text-textMuted">
              Perplex only exists because of Monad&apos;s infrastructure.
            </p>
            <ul className="space-y-3 text-[13px] leading-relaxed text-textSecondary">
              <li>
                <span className="font-semibold text-textPrimary">Full on-chain CLOB:</span> Perpl
                puts every order, trade, and liquidation on-chain. On Ethereum, indexing this data
                would cost thousands in gas. On Monad, it&apos;s near-zero.
              </li>
              <li>
                <span className="font-semibold text-textPrimary">500ms block times:</span> Whale
                positions surface in near real-time. On Ethereum (12s blocks) you&apos;d already be
                late.
              </li>
              <li>
                <span className="font-semibold text-textPrimary">10,000 TPS:</span> High-frequency
                event indexing is possible without RPC congestion. This tool cannot exist on
                Ethereum or on any CEX (data hidden). Monad + Perpl = total transparency.
              </li>
            </ul>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowWhyMonad(false)}
                className="rounded-lg bg-primary px-4 py-2 text-[13px] font-semibold text-white transition-opacity duration-150 hover:opacity-90"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
}
