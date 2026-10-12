'use client';

import { useState } from 'react';
import type { OpenPosition, WalletProfile } from '@/lib/types';
import MarketBadge from '@/components/ui/MarketBadge';
import { formatLeverage, formatPnL, formatUSD } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

export interface ComparePositionsProps {
  walletA: WalletProfile;
  walletB: WalletProfile;
}

function positionFlag(
  position: OpenPosition,
  otherPositions: OpenPosition[]
): 'ALONE' | 'SAME_SIDE' | 'OPPOSITE' {
  const other = otherPositions.find((p) => p.market === position.market);
  if (!other) return 'ALONE';
  return other.side === position.side ? 'SAME_SIDE' : 'OPPOSITE';
}

function PositionTable({
  wallet,
  side,
  otherPositions,
}: {
  wallet: WalletProfile;
  side: 'A' | 'B';
  otherPositions: OpenPosition[];
}) {
  return (
    <div className="flex-1">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-textMuted">
        Open Positions · Wallet {side}
      </p>
      {wallet.openPositions.length === 0 ? (
        <p className="mt-4 text-[12px] text-textMuted">No open positions</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border text-left text-[10px] uppercase tracking-widest text-textMuted">
                <th className="py-2 pr-2 font-semibold">Market</th>
                <th className="px-2 py-2 font-semibold">Side</th>
                <th className="px-2 py-2 font-semibold">Size</th>
                <th className="px-2 py-2 font-semibold">uPnL</th>
                <th className="py-2 pl-2 font-semibold">Lev</th>
              </tr>
            </thead>
            <tbody>
              {wallet.openPositions.map((position, i) => {
                const flag = positionFlag(position, otherPositions);
                return (
                  <tr
                    key={`${position.market}-${i}`}
                    className={cn(
                      'border-b border-border/40',
                      flag === 'SAME_SIDE' && 'bg-primary/10',
                      flag === 'OPPOSITE' && 'bg-danger/10'
                    )}
                    data-testid="compare-position-row"
                    data-flag={flag}
                  >
                    <td className="py-2.5 pr-2">
                      <MarketBadge market={position.market} size="sm" />
                      {flag === 'SAME_SIDE' && (
                        <span className="ml-1.5 text-[9px] text-primary">
                          Both positioned
                        </span>
                      )}
                      {flag === 'OPPOSITE' && (
                        <span className="ml-1.5 text-[9px] font-semibold text-danger">
                          ⚠️ Opposite sides on {position.market}-PERP
                        </span>
                      )}
                    </td>
                    <td
                      className={cn(
                        'px-2 py-2.5 text-[11px] font-semibold',
                        position.side === 'LONG' ? 'text-success' : 'text-danger'
                      )}
                    >
                      {position.side}
                    </td>
                    <td className="tabular px-2 py-2.5 text-[11px] text-textPrimary">
                      {formatUSD(position.notionalValue)}
                    </td>
                    <td
                      className={cn(
                        'tabular px-2 py-2.5 text-[11px] font-semibold',
                        position.unrealizedPnl >= 0 ? 'text-success' : 'text-danger'
                      )}
                    >
                      {formatPnL(position.unrealizedPnl)}
                    </td>
                    <td className="tabular py-2.5 pl-2 text-[11px] text-textSecondary">
                      {formatLeverage(position.leverage)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/**
 * Open positions side by side. Shared markets glow purple; opposite
 * sides of the same market flag red. Stacks into tabs on mobile.
 */
export default function ComparePositions({ walletA, walletB }: ComparePositionsProps) {
  const [mobileTab, setMobileTab] = useState<'A' | 'B'>('A');

  return (
    <div className="card-surface p-5">
      <h3 className="text-[15px] font-semibold text-textPrimary">Open Positions</h3>
      <p className="mt-0.5 text-[12px] text-textMuted">
        Shared markets highlighted · opposite sides flagged
      </p>

      {/* mobile tabs */}
      <div className="mt-4 inline-flex rounded-lg bg-surface2 p-1 md:hidden">
        {(['A', 'B'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setMobileTab(tab)}
            className={cn(
              'rounded-md px-4 py-1.5 text-[12px] font-medium transition-colors duration-150',
              mobileTab === tab
                ? 'bg-primary/20 text-primary'
                : 'text-textSecondary hover:text-textPrimary'
            )}
          >
            Wallet {tab}
          </button>
        ))}
      </div>

      {/* desktop: side by side · mobile: active tab */}
      <div className="mt-4 hidden flex-col gap-8 md:flex md:flex-row">
        <PositionTable wallet={walletA} side="A" otherPositions={walletB.openPositions} />
        <div className="w-px bg-border" aria-hidden />
        <PositionTable wallet={walletB} side="B" otherPositions={walletA.openPositions} />
      </div>
      <div className="mt-4 md:hidden">
        {mobileTab === 'A' ? (
          <PositionTable wallet={walletA} side="A" otherPositions={walletB.openPositions} />
        ) : (
          <PositionTable wallet={walletB} side="B" otherPositions={walletA.openPositions} />
        )}
      </div>
    </div>
  );
}
