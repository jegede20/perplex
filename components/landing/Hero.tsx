'use client';

import Link from 'next/link';
import LiveDot from '@/components/ui/LiveDot';
import HeroDashboardPreview from '@/components/landing/HeroDashboardPreview';
import { useLiveBlockNumber } from '@/lib/perpl/hooks';
import { formatBlockNumber } from '@/lib/utils/format';

/**
 * Hero — left-aligned pitch with live product panels on the right.
 * The block ticker runs at Monad's 500ms block time.
 */
export default function Hero() {
  const block = useLiveBlockNumber();

  return (
    <section
      className="relative overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse at 22% 38%, #7B5EA726 0%, transparent 62%), #0A0A0F',
      }}
    >
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-6 pb-20 pt-16 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16 lg:pb-28 lg:pt-24">
        {/* LEFT — copy */}
        <div className="max-w-[620px]">
          <span className="inline-block rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-xs uppercase tracking-wider text-primary">
            ✦ Built on Monad Mainnet · Powered by Perpl ✦
          </span>

          <h1 className="mt-7 font-black tracking-tight text-white" style={{ fontSize: 'clamp(38px, 5vw, 62px)', lineHeight: 1.04 }}>
            Smart Money Intelligence
            <span
              className="block bg-gradient-to-r from-primary via-[#A78BDB] to-primary bg-clip-text text-transparent"
              style={{ WebkitBackgroundClip: 'text' }}
            >
              for Perpl on Monad
            </span>
          </h1>

          <p className="mt-5 max-w-[480px] text-sm leading-relaxed text-textSecondary md:text-base">
            The first protocol analytics and wallet intelligence platform built
            on Perpl&apos;s fully on-chain perpetual futures markets. Track smart
            money. Understand risk. Trade with an edge.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/app"
              className="rounded-lg bg-primary px-8 py-3.5 text-[14px] font-semibold text-white transition-all duration-150 hover:bg-primary/90 hover:shadow-[0_4px_24px_rgba(123,94,167,0.4)]"
            >
              Launch App →
            </Link>
            <a
              href="#protocol-snapshot"
              className="rounded-lg border border-border px-8 py-3.5 text-[14px] font-semibold text-textSecondary transition-all duration-150 hover:border-primary/50 hover:text-primary"
            >
              See Live Metrics ↓
            </a>
          </div>

          {/* live status bar */}
          <div className="mt-10 border-t border-border pt-5">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <span className="flex items-center gap-2 text-xs text-textMuted">
                <LiveDot /> Live on Monad Mainnet
              </span>
              <span className="flex items-center gap-2 font-mono text-xs text-textMuted">
                <span className="text-primary">⬡</span>
                Block #{block > 0n ? formatBlockNumber(block) : '…'}
              </span>
              <span className="flex items-center gap-2 text-xs text-textMuted">
                <LiveDot /> Connected to Perpl
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT — live product peek */}
        <div className="relative">
          <div
            className="absolute inset-0 -m-6 rounded-[40px] opacity-60 blur-2xl"
            style={{ background: 'radial-gradient(ellipse at center, #7B5EA720 0%, transparent 70%)' }}
            aria-hidden
          />
          <HeroDashboardPreview />
        </div>
      </div>
    </section>
  );
}
