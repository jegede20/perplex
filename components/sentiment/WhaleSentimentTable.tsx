'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { WhaleWalletRow } from '@/lib/types';
import TierBadge from '@/components/ui/TierBadge';
import { formatUSD } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

export interface WhaleSentimentTableProps {
  title: string;
  rows: WhaleWalletRow[];
  side: 'BULL' | 'BEAR';
  loading?: boolean;
}

/**
 * Top bullish / bearish smart-money wallets ranked by directional bias.
 * Click a row → wallet explorer.
 */
export default function WhaleSentimentTable({
  title,
  rows,
  side,
  loading,
}: WhaleSentimentTableProps) {
  const router = useRouter();
  return (
    <div className="card-surface p-5">
      <h3 className="text-[15px] font-semibold text-textPrimary">{title}</h3>
      <p className="mt-0.5 text-[12px] text-textMuted">
        {side === 'BULL' ? 'Highest long bias' : 'Highest short bias'} · tracked smart money
      </p>

      {loading && (
        <div className="mt-4 space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-surface2" />
          ))}
        </div>
      )}

      {!loading && rows.length === 0 && (
        <p className="mt-6 text-center text-[12px] text-textMuted">
          No {side === 'BULL' ? 'bullish' : 'bearish'} whale positioning right now.
        </p>
      )}

      {!loading && rows.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border text-left text-[10px] uppercase tracking-widest text-textMuted">
                <th className="py-2 pr-3 font-semibold">Wallet</th>
                <th className="px-3 py-2 font-semibold">Score</th>
                <th className="px-3 py-2 font-semibold">Markets</th>
                <th className="px-3 py-2 font-semibold">{side === 'BULL' ? 'Long OI' : 'Short OI'}</th>
                <th className="py-2 pl-3 font-semibold text-right">Sentiment</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.address}
                  className="cursor-pointer border-b border-border/40 transition-colors duration-150 hover:bg-surface2"
                  onClick={() => router.push(`/app/wallet/${row.address}`)}
                  data-testid="whale-row"
                >
                  <td className="py-2.5 pr-3">
                    <Link
                      href={`/app/wallet/${row.address}`}
                      className="flex items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <TierBadge tier={row.tier} size="sm" />
                      <span className="font-mono text-[11px] text-textSecondary hover:text-primary">
                        {row.shortAddress}
                      </span>
                    </Link>
                  </td>
                  <td className="tabular px-3 py-2.5 text-[12px] font-semibold text-textPrimary">
                    {row.smartMoneyScore}
                  </td>
                  <td className="px-3 py-2.5 text-[11px] text-textSecondary">
                    {row.positionedMarkets.slice(0, 3).join(', ')}
                    {row.positionedMarkets.length > 3 ? '…' : ''}
                  </td>
                  <td className="tabular px-3 py-2.5 text-[11px] text-textPrimary">
                    {formatUSD(side === 'BULL' ? row.longOI : row.shortOI)}
                  </td>
                  <td
                    className={cn(
                      'tabular py-2.5 pl-3 text-right text-[12px] font-bold',
                      row.sentiment >= 0 ? 'text-success' : 'text-danger'
                    )}
                  >
                    {row.sentiment > 0 ? '+' : ''}
                    {Math.round(row.sentiment)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
