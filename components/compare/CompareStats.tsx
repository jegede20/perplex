'use client';

import type { ComparisonMetric, ComparisonMetrics, WalletProfile } from '@/lib/types';
import { formatAddress } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

export interface CompareStatsProps {
  metrics: ComparisonMetrics;
  walletA: WalletProfile;
  walletB: WalletProfile;
}

const ROW_ICONS: Record<keyof ComparisonMetrics, string> = {
  winRate: '🏆',
  realizedPnl: '💰',
  totalVolume: '📊',
  avgLeverage: '⚡',
  smartMoneyScore: '🧠',
  profitFactor: '📈',
  maxDrawdown: '🛡️',
  totalTrades: '🔁',
  avgHoldTime: '⏱️',
  longestWinStreak: '🔥',
};

function Cell({ metric, side, address }: { metric: ComparisonMetric; side: 'A' | 'B'; address: string }) {
  const won = metric.winner === side;
  return (
    <td
      className={cn(
        'tabular px-4 py-3 text-[13px]',
        won
          ? 'bg-primary/10 font-semibold text-white'
          : 'font-normal text-textSecondary',
        metric.winner === 'TIE' && 'text-textSecondary'
      )}
    >
      {won && <span className="mr-1.5" aria-hidden>🏆</span>}
      {side === 'A' ? metric.formattedA : metric.formattedB}
      <span className="ml-1.5 hidden text-[9px] text-textMuted lg:inline">
        {formatAddress(address)}
      </span>
    </td>
  );
}

/**
 * Full 10-metric comparison table. Winning cells get a purple tint and
 * trophy; lower-is-better metrics (leverage, drawdown) already have the
 * winner logic inverted by the engine.
 */
export default function CompareStats({ metrics, walletA, walletB }: CompareStatsProps) {
  const rows = (Object.keys(metrics) as Array<keyof ComparisonMetrics>).map((key) => ({
    key,
    metric: metrics[key],
  }));

  return (
    <div className="card-surface overflow-hidden p-0">
      <div className="border-b border-border px-5 py-4">
        <h3 className="text-[15px] font-semibold text-textPrimary">Metric Breakdown</h3>
        <p className="mt-0.5 text-[12px] text-textMuted">
          🏆 marks the winner per metric — lower wins for leverage & drawdown
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border bg-surface2 text-left text-[10px] uppercase tracking-widest text-textMuted">
              <th className="px-4 py-3 font-semibold">Metric</th>
              <th className="px-4 py-3 font-semibold">
                Wallet A · {formatAddress(walletA.address)}
              </th>
              <th className="px-4 py-3 font-semibold">
                Wallet B · {formatAddress(walletB.address)}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ key, metric }, i) => (
              <tr
                key={key}
                className={cn(
                  'border-b border-border/40 transition-colors duration-150 hover:bg-surface2/70',
                  i % 2 === 1 && 'bg-surface2/40'
                )}
                data-testid="compare-metric-row"
                data-metric={key}
              >
                <td className="px-4 py-3 text-[12px] font-medium text-textSecondary">
                  <span className="mr-1.5" aria-hidden>{ROW_ICONS[key]}</span>
                  {metric.label}
                  {!metric.higherIsBetter && (
                    <span className="ml-1.5 rounded bg-surface2 px-1.5 py-0.5 text-[9px] text-textMuted">
                      lower wins
                    </span>
                  )}
                </td>
                <Cell metric={metric} side="A" address={walletA.address} />
                <Cell metric={metric} side="B" address={walletB.address} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
