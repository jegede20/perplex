'use client';

import { useCallback, useMemo, useState } from 'react';
import type { Trade, TradeStatus } from '@/lib/types';
import MarketBadge from '@/components/ui/MarketBadge';
import PnLTag from '@/components/ui/PnLTag';
import { cn } from '@/lib/utils/cn';
import {
  formatDuration,
  formatLeverage,
  formatPrice,
  formatUSD,
  getMonadScanTxUrl,
} from '@/lib/utils/format';
import { TRADE_HISTORY_PAGE_SIZE } from '@/lib/utils/constants';

export interface TradeHistoryProps {
  trades: Trade[];
  loading?: boolean;
}

type StatusFilter = 'ALL' | TradeStatus;
type SortKey = 'timestamp' | 'size' | 'entryPrice' | 'exitPrice' | 'realizedPnl' | 'leverage' | 'holdSeconds';

const FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'OPEN', label: 'Open' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'LIQUIDATED', label: 'Liquidated' },
];

const STATUS_STYLE: Record<TradeStatus, string> = {
  OPEN: 'bg-sky-500/15 text-sky-400',
  CLOSED: 'bg-surface2 text-textSecondary',
  LIQUIDATED: 'bg-danger/15 text-danger',
};

/** Full trade history: status filters, column sorting, 15 rows/page. */
export default function TradeHistory({ trades }: TradeHistoryProps) {
  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>('timestamp');
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = useMemo(() => {
    const base = filter === 'ALL' ? trades : trades.filter((t) => t.status === filter);
    return [...base].sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      const cmp = typeof av === 'string' ? String(av).localeCompare(String(bv)) : Number(av) - Number(bv);
      return sortAsc ? cmp : -cmp;
    });
  }, [trades, filter, sortKey, sortAsc]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / TRADE_HISTORY_PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const rows = filtered.slice(safePage * TRADE_HISTORY_PAGE_SIZE, (safePage + 1) * TRADE_HISTORY_PAGE_SIZE);

  const toggleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortAsc((asc) => !asc);
        return prev;
      }
      setSortAsc(false);
      return key;
    });
    setPage(0);
  }, []);

  const headerCell = (label: string, key?: SortKey, className?: string): React.ReactNode => (
    <th
      scope="col"
      className={cn('px-3 py-2.5 font-semibold', className)}
      aria-sort={key && sortKey === key ? (sortAsc ? 'ascending' : 'descending') : undefined}
    >
      {key ? (
        <button
          type="button"
          onClick={() => toggleSort(key)}
          className="inline-flex items-center gap-1 uppercase tracking-wider transition-colors duration-150 hover:text-textSecondary"
        >
          {label}
          {sortKey === key && <span aria-hidden>{sortAsc ? '↑' : '↓'}</span>}
        </button>
      ) : (
        <span className="uppercase tracking-wider">{label}</span>
      )}
    </th>
  );

  return (
    <div className="relative card-surface overflow-x-auto">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-2 pt-4">
        <h3 className="text-[13px] font-semibold uppercase tracking-widest text-textSecondary">
          Trade History
        </h3>
        <div className="flex items-center gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => {
                setFilter(f.value);
                setPage(0);
              }}
              aria-pressed={filter === f.value}
              className={cn(
                'rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors duration-150',
                filter === f.value ? 'bg-primary text-white' : 'bg-surface2 text-textSecondary hover:text-textPrimary'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-1 p-10 text-center">
          <p className="text-[13px] text-textSecondary">No trades match this filter</p>
          <p className="text-[11px] text-textMuted">Try &ldquo;All&rdquo; or a different status.</p>
        </div>
      ) : (
        <table className="w-full min-w-[960px] text-left text-[12px]">
          <thead>
            <tr className="border-b border-border text-[10px] text-textMuted">
              {headerCell('Market')}
              {headerCell('Side')}
              {headerCell('Size', 'size')}
              {headerCell('Entry', 'entryPrice')}
              {headerCell('Exit', 'exitPrice')}
              {headerCell('PnL', 'realizedPnl')}
              {headerCell('PnL%')}
              {headerCell('Lev', 'leverage')}
              {headerCell('Duration', 'holdSeconds')}
              {headerCell('Status')}
              {headerCell('TX')}
            </tr>
          </thead>
          <tbody>
            {rows.map((trade) => (
              <tr
                key={trade.id}
                className={cn(
                  'border-b border-border last:border-b-0 hover:bg-surface2',
                  trade.status === 'LIQUIDATED' && 'bg-danger/5'
                )}
              >
                <td className="px-3 py-2.5"><MarketBadge market={trade.market} /></td>
                <td className="px-3 py-2.5">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      trade.side === 'LONG' ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'
                    }`}
                  >
                    {trade.side}
                  </span>
                </td>
                <td className="tabular px-3 py-2.5 text-textPrimary">{formatUSD(trade.size * trade.entryPrice)}</td>
                <td className="tabular px-3 py-2.5 text-textSecondary">{formatPrice(trade.entryPrice)}</td>
                <td className="tabular px-3 py-2.5 text-textSecondary">
                  {trade.exitPrice !== undefined ? formatPrice(trade.exitPrice) : '—'}
                </td>
                <td className="px-3 py-2.5">
                  {trade.realizedPnl !== undefined ? (
                    <PnLTag value={trade.realizedPnl} compact />
                  ) : (
                    <span className="text-textMuted">—</span>
                  )}
                </td>
                <td
                  className={cn(
                    'tabular px-3 py-2.5',
                    (trade.pnlPercent ?? 0) >= 0 ? 'text-success' : 'text-danger'
                  )}
                >
                  {trade.pnlPercent !== undefined
                    ? `${trade.pnlPercent >= 0 ? '+' : ''}${trade.pnlPercent.toFixed(1)}%`
                    : '—'}
                </td>
                <td className="tabular px-3 py-2.5 text-textSecondary">{formatLeverage(trade.leverage)}</td>
                <td className="tabular px-3 py-2.5 text-textSecondary">
                  {trade.holdSeconds !== undefined ? formatDuration(trade.holdSeconds) : '—'}
                </td>
                <td className="px-3 py-2.5">
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', STATUS_STYLE[trade.status])}>
                    {trade.status}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <a
                    href={getMonadScanTxUrl(trade.txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="View trade transaction on MonadScan (opens in a new tab)"
                    className="tabular text-[10px] text-primary transition-colors duration-150 hover:underline"
                  >
                    {trade.txHash.slice(0, 8)}…↗
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Pagination */}
      {filtered.length > TRADE_HISTORY_PAGE_SIZE && (
        <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-[11px] text-textMuted">
          <span>
            {filtered.length} trades · page {safePage + 1} / {pageCount}
          </span>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="rounded-md border border-border px-2.5 py-1 text-textSecondary transition-colors duration-150 hover:border-primary hover:text-primary disabled:opacity-40"
            >
              ← Prev
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={safePage >= pageCount - 1}
              className="rounded-md border border-border px-2.5 py-1 text-textSecondary transition-colors duration-150 hover:border-primary hover:text-primary disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
