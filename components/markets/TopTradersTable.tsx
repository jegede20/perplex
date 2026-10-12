'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { PositionRisk, WalletSummary } from '@/lib/types';
import TierBadge from '@/components/ui/TierBadge';
import ScoreBar from '@/components/ui/ScoreBar';
import PnLTag from '@/components/ui/PnLTag';
import { formatAddress, formatLeverage, formatPrice, formatUSD } from '@/lib/utils/format';
import { getMonadScanAddressUrl } from '@/lib/utils/format';

export interface TopTradersTableProps {
  traders: WalletSummary[];
  positions?: PositionRisk[];
  markPrice?: number;
}

/**
 * Top 10 wallets with open positions in this market —
 * the drill-down link from Market → Wallet.
 */
export default function TopTradersTable({ traders, positions = [], markPrice = 0 }: TopTradersTableProps) {
  const router = useRouter();

  const riskByAddress = new Map<string, PositionRisk>();
  for (const p of positions) {
    riskByAddress.set(p.walletAddress.toLowerCase(), p);
  }

  const handleClick = useCallback(
    (address: string) => {
      router.push(`/app/wallet/${address}`);
    },
    [router]
  );

  if (traders.length === 0) {
    return (
      <div className="card-surface flex flex-col items-center justify-center gap-1 p-8 text-center">
        <p className="text-[13px] text-textSecondary">No tracked traders in this market yet</p>
        <p className="text-[11px] text-textMuted">Top traders appear as soon as positions are indexed.</p>
      </div>
    );
  }

  return (
    <div className="relative card-surface overflow-x-auto">
      <div className="px-4 pb-2 pt-4">
        <h3 className="text-[13px] font-semibold uppercase tracking-widest text-textSecondary">
          Top Traders
        </h3>
      </div>
      <table className="w-full min-w-[820px] text-left text-[12px]">
        <thead>
          <tr className="border-b border-border text-[10px] uppercase tracking-wider text-textMuted">
            <th scope="col" className="px-4 py-2.5 font-semibold">Wallet</th>
            <th scope="col" className="px-3 py-2.5 font-semibold">Tier</th>
            <th scope="col" className="px-3 py-2.5 font-semibold">Side</th>
            <th scope="col" className="px-3 py-2.5 font-semibold">Size</th>
            <th scope="col" className="px-3 py-2.5 font-semibold">Entry</th>
            <th scope="col" className="px-3 py-2.5 font-semibold">uPnL</th>
            <th scope="col" className="px-3 py-2.5 font-semibold">Lev</th>
            <th scope="col" className="px-3 py-2.5 font-semibold">Liq Price</th>
            <th scope="col" className="px-3 py-2.5 font-semibold">To Liq</th>
            <th scope="col" className="px-3 py-2.5 font-semibold">Score</th>
          </tr>
        </thead>
        <tbody>
          {traders.map((trader) => {
            const risk = riskByAddress.get(trader.address.toLowerCase());
            const side = risk?.side ?? 'LONG';
            const size = risk?.size ?? trader.totalVolume / 30;
            const liqPrice = risk?.liquidationPrice ?? 0;
            const distance = risk?.distanceToLiq ?? 0;
            const entryPrice = risk ? risk.markPrice / (side === 'LONG' ? 1.02 : 0.98) : markPrice;
            const upnl = risk
              ? side === 'LONG'
                ? ((risk.markPrice - entryPrice) / entryPrice) * size
                : ((entryPrice - risk.markPrice) / entryPrice) * size
              : trader.realizedPnl * 0.05;

            return (
              <tr
                key={trader.address}
                tabIndex={0}
                role="link"
                aria-label={`Open wallet ${trader.shortAddress}`}
                onClick={() => handleClick(trader.address)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleClick(trader.address);
                  }
                }}
                className="cursor-pointer border-b border-border transition-colors duration-150 last:border-b-0 hover:bg-surface2"
              >
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="tabular font-medium text-textPrimary">{trader.shortAddress}</span>
                    <a
                      href={getMonadScanAddressUrl(trader.address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`View ${formatAddress(trader.address)} on MonadScan (opens in a new tab)`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-[9px] text-primary hover:underline"
                    >
                      ↗
                    </a>
                  </div>
                </td>
                <td className="px-3 py-2.5"><TierBadge tier={trader.tier} /></td>
                <td className="px-3 py-2.5">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      side === 'LONG' ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'
                    }`}
                  >
                    {side}
                  </span>
                </td>
                <td className="tabular px-3 py-2.5 font-semibold text-textPrimary">{formatUSD(size)}</td>
                <td className="tabular px-3 py-2.5 text-textSecondary">{formatPrice(entryPrice)}</td>
                <td className="px-3 py-2.5"><PnLTag value={upnl} compact /></td>
                <td className="tabular px-3 py-2.5 text-textSecondary">
                  {formatLeverage(trader.avgLeverage)}
                </td>
                <td className="tabular px-3 py-2.5 text-textSecondary">
                  {liqPrice > 0 ? formatPrice(liqPrice) : '—'}
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className={`tabular text-[11px] font-semibold ${
                      distance < 5 ? 'text-danger' : distance < 15 ? 'text-warning' : 'text-success'
                    }`}
                  >
                    {distance > 0 ? `${distance.toFixed(1)}% away` : '—'}
                  </span>
                </td>
                <td className="w-[90px] px-3 py-2.5"><ScoreBar score={trader.smartMoneyScore} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
