'use client';

import Link from 'next/link';

/**
 * Final CTA — the closing pitch and launch button over a soft glow.
 */
export default function FinalCTA() {
  return (
    <section
      className="py-28"
      style={{
        background:
          'radial-gradient(ellipse at center, #7B5EA715 0%, transparent 70%), #0A0A0F',
      }}
    >
      <div className="mx-auto flex max-w-3xl flex-col items-center px-6 text-center">
        <h2 className="text-4xl font-black text-white md:text-5xl">
          Know what smart money is doing.
        </h2>
        <p className="mt-2 text-2xl font-light text-textSecondary md:text-3xl">
          Before you trade.
        </p>
        <Link
          href="/app"
          className="mt-10 rounded-xl bg-primary px-10 py-4 text-lg font-bold text-white transition-all duration-150 hover:scale-105 hover:bg-primary/90"
        >
          Launch Perplex App →
        </Link>
        <p className="mt-6 text-xs tracking-wider text-textMuted">
          Free · Open Source · MIT Licensed · Built on Monad
        </p>
      </div>
    </section>
  );
}
