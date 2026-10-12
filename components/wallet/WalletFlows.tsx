'use client';

import type { WalletFlow } from '@/lib/types';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import { formatTimeAgo, formatUSD, getMonadScanTxUrl } from '@/lib/utils/format';

export interface WalletFlowsProps {
  flows: WalletFlow[];
  loading?: boolean;
}

/** Deposit/withdrawal history — green inflows, red outflows. */
export default function WalletFlows({ flows, loading }: WalletFlowsProps) {
  if (loading) return <LoadingSkeleton variant="table" rows={4} />;

  return (
    <div className="relative card-surface overflow-x-auto">
      <div className="px-4 pb-2 pt-4">
        <h3 className="text-[13px] font-semibold uppercase tracking-widest text-textSecondary">
          Deposits & Withdrawals
        </h3>
      </div>

      {flows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-1 p-10 text-center">
          <p className="text-[13px] text-textSecondary">No capital flows recorded</p>
          <p className="text-[11px] text-textMuted">Deposits and withdrawals to the exchange appear here.</p>
        </div>
      ) : (
        <table className="w-full min-w-[560px] text-left text-[12px]">
          <thead>
            <tr className="border-b border-border text-[10px] uppercase tracking-wider text-textMuted">
              <th scope="col" className="px-4 py-2.5 font-semibold">Type</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">Amount</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">TX Hash</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">Date</th>
            </tr>
          </thead>
          <tbody>
            {flows.map((flow) => {
              const isDeposit = flow.type === 'DEPOSIT';
              return (
                <tr
                  key={flow.id}
                  className={cn(
                    'border-b border-border last:border-b-0 hover:bg-surface2',
                    isDeposit ? 'text-success' : 'text-danger'
                  )}
                >
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-1.5 font-semibold">
                      {isDeposit ? (
                        <ArrowDownLeft size={13} aria-hidden />
                      ) : (
                        <ArrowUpRight size={13} aria-hidden />
                      )}
                      {flow.type}
                    </span>
                  </td>
                  <td className={cn('tabular px-4 py-2.5 font-semibold', isDeposit ? 'text-success' : 'text-danger')}>
                    {isDeposit ? '+' : '-'}
                    {formatUSD(flow.amount)}
                  </td>
                  <td className="px-4 py-2.5">
                    <a
                      href={getMonadScanTxUrl(flow.txHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="View flow transaction on MonadScan (opens in a new tab)"
                      className="tabular text-[10px] text-primary transition-colors duration-150 hover:underline"
                    >
                      {flow.txHash.slice(0, 12)}…{flow.txHash.slice(-6)} ↗
                    </a>
                  </td>
                  <td className="px-4 py-2.5 text-[11px] text-textMuted">
                    {formatTimeAgo(flow.timestamp)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
