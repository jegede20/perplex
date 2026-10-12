'use client';

import type { ReactNode } from 'react';

interface MonadRow {
  icon: ReactNode;
  title: string;
  description: string;
}

const ROWS: MonadRow[] = [
  {
    icon: '⚡',
    title: '500ms Block Times',
    description:
      "Whale positions surface in near real-time. On Ethereum's 12-second blocks, by the time you see the trade, the whale is already profitable. On Monad, you see it as it happens.",
  },
  {
    icon: '💸',
    title: 'Near-Zero Gas Fees',
    description:
      "Perpl's fully on-chain CLOB generates rich event data with every block. Indexing this data on Ethereum would cost thousands in gas fees. On Monad, it's essentially free — enabling complete market coverage.",
  },
  {
    icon: '🔁',
    title: '10,000 TPS Throughput',
    description:
      'High-frequency event indexing without RPC congestion. Every Fill, Liquidation, and Account event is processed in real-time across all 6 Perpl markets simultaneously.',
  },
  {
    icon: '🔍',
    title: '100% On-Chain Transparency',
    description:
      "Perpl's CLOB lives entirely on Monad's EVM. No off-chain matching. No hidden order flow. Every trade is a public transaction. Perplex reads it all and turns it into intelligence.",
  },
];

/**
 * Why Monad — the four reasons this tool can only exist here, plus the
 * transparency thesis.
 */
export default function WhyMonad() {
  return (
    <section id="why-monad" className="bg-surface py-24">
      <div className="mx-auto max-w-7xl px-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          Why Monad
        </p>
        <h2 className="mt-2 text-[30px] font-bold text-white md:text-[36px]">
          This tool cannot exist anywhere else.
        </h2>

        <div className="mt-10">
          {ROWS.map((row) => (
            <div
              key={row.title}
              className="flex flex-col gap-4 border-b border-border py-8 last:border-b-0 md:flex-row md:items-start md:gap-12"
            >
              <div className="flex items-center gap-4 md:w-[300px] md:shrink-0">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-[16px]"
                  aria-hidden
                >
                  {row.icon}
                </span>
                <h3 className="text-[18px] font-bold text-white">{row.title}</h3>
              </div>
              <p className="text-[14px] leading-relaxed text-textSecondary">{row.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-4xl leading-none text-primary" aria-hidden>
            &ldquo;
          </p>
          <p className="mx-auto max-w-2xl text-xl font-light italic leading-relaxed text-white">
            This tool cannot exist on Ethereum.
            <br />
            This data is hidden on any CEX.
            <br />
            Monad + Perpl = Total Transparency.
          </p>
        </div>
      </div>
    </section>
  );
}
