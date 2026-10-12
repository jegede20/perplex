'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { BarChart3, Search, TrendingUp } from 'lucide-react';

interface Step {
  num: string;
  icon: ReactNode;
  title: string;
  description: string;
  tag: string;
}

const STEPS: Step[] = [
  {
    num: '01',
    icon: <BarChart3 size={34} aria-hidden />,
    title: 'Protocol Overview',
    description:
      "Start with the big picture. Monitor Perpl's protocol health — volume, open interest, TVL, fees, insurance fund, and live liquidations.",
    tag: '[Home Page]',
  },
  {
    num: '02',
    icon: <TrendingUp size={34} aria-hidden />,
    title: 'Market Detail',
    description:
      "Drill into any of Perpl's 6 markets. Funding rates, long/short skew, order book depth, liquidation map, and top traders.",
    tag: '[Markets Page]',
  },
  {
    num: '03',
    icon: <Search size={34} aria-hidden />,
    title: 'Wallet Explorer',
    description:
      'Deep-dive any wallet. Smart Money Score, behavior tags, open positions with uPnL and liquidation price, full trade history, risk metrics.',
    tag: '[Wallet Page]',
  },
];

/**
 * How It Works — three connected steps from protocol health to wallet
 * risk, in three clicks.
 */
export default function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-surface py-24">
      <div className="mx-auto max-w-7xl px-6">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-primary">
          How It Works
        </p>
        <h2 className="mt-2 text-center text-[30px] font-bold text-white md:text-[36px]">
          From protocol health to wallet risk in three clicks.
        </h2>

        <div className="mt-14 flex flex-col items-stretch gap-4 lg:flex-row lg:items-center">
          {STEPS.map((step, i) => (
            <div key={step.num} className="flex flex-1 items-center gap-4">
              <div className="relative flex-1 rounded-2xl border border-border bg-surface2 p-8">
                <span className="absolute right-4 top-4 text-5xl font-black text-primary/20">
                  {step.num}
                </span>
                <div className="text-primary">{step.icon}</div>
                <h3 className="mt-4 text-[18px] font-semibold text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-textSecondary">
                  {step.description}
                </p>
                <span className="mt-4 inline-block rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">
                  {step.tag}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <span
                  className="hidden animate-pulse text-3xl text-primary lg:block"
                  aria-hidden
                >
                  →
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/app"
            className="inline-block rounded-lg bg-primary px-8 py-3.5 text-[14px] font-semibold text-white transition-all duration-150 hover:bg-primary/90"
          >
            Start at Protocol Overview →
          </Link>
        </div>
      </div>
    </section>
  );
}
