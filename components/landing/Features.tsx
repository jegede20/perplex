'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  BarChart3,
  Brain,
  Globe,
  Shield,
  TrendingUp,
  Zap,
} from 'lucide-react';

interface FeatureCard {
  icon: ReactNode;
  title: string;
  bullets: string[];
  ctaHref: string;
  bulletsAsBadges?: boolean;
}

const CARDS: FeatureCard[] = [
  {
    icon: <BarChart3 size={18} aria-hidden />,
    title: 'Protocol Analytics',
    bullets: [
      'Real-time volume, OI, TVL, fees',
      'Insurance fund health tracker',
      'Net capital flows (deposits vs withdrawals)',
      '24H / 7D / 30D / ALL time ranges',
    ],
    ctaHref: '/app',
  },
  {
    icon: <Brain size={18} aria-hidden />,
    title: 'Smart Money Intelligence',
    bullets: [
      'Proprietary 0-100 wallet scoring',
      '🐋 Whale 🦈 Shark 🐟 Fish tier system',
      'Auto-generated behavior tags',
      'Win rate, PnL, profit factor tracking',
    ],
    ctaHref: '/app/wallet',
  },
  {
    icon: <Zap size={18} aria-hidden />,
    title: 'Real-Time Feed',
    bullets: [
      'Live whale position opens & closes',
      'Liquidation alerts as they happen',
      'WebSocket — no page refresh needed',
      'Filter by market, tier, size, type',
    ],
    ctaHref: '/app/feed',
  },
  {
    icon: <TrendingUp size={18} aria-hidden />,
    title: 'Market Intelligence',
    bullets: [
      'Funding rate & APR per market',
      'Long/short skew visualization',
      'Liquidation map (positions by price)',
      'L2 order book depth chart',
    ],
    ctaHref: '/app/markets',
  },
  {
    icon: <Shield size={18} aria-hidden />,
    title: 'Risk Metrics',
    bullets: [
      'Max drawdown & profit factor',
      'Live liquidation price per position',
      'Margin ratio & health monitoring',
      'Win/loss streaks & avg hold time',
    ],
    ctaHref: '/app/wallet',
  },
  {
    icon: <Globe size={18} aria-hidden />,
    title: 'All 6 Perpl Markets',
    bullets: ['BTC · ETH · SOL', 'MON · HYPE · ZEC', 'Full coverage across every', 'Perpl perpetual market'],
    ctaHref: '/app/markets',
  },
];

/**
 * Features grid — 6 capability cards with icon, bullet list, and
 * Explore CTA into the app.
 */
export default function Features() {
  return (
    <section id="features" className="py-24" style={{ background: '#0A0A0F' }}>
      <div className="mx-auto max-w-7xl px-6">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-primary">
          Features
        </p>
        <h2 className="mx-auto mt-2 mb-16 max-w-2xl text-center text-3xl font-bold text-white md:text-4xl">
          Everything you need to trade smarter on Perpl
        </h2>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {CARDS.map((card) => (
            <div
              key={card.title}
              className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 transition-all duration-200 hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                {card.icon}
              </div>
              <h3 className="text-[16px] font-semibold text-white">{card.title}</h3>
              <ul className="flex-1 space-y-1.5">
                {card.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2 text-sm text-textSecondary">
                    <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-primary" aria-hidden />
                    {bullet}
                  </li>
                ))}
              </ul>
              <Link
                href={card.ctaHref}
                className="self-start text-[13px] font-semibold text-primary transition-colors duration-150 hover:text-white"
              >
                Explore →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
