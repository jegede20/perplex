'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { MarketSummary } from '@/lib/types';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import MarketBadge from '@/components/ui/MarketBadge';
import SentimentBar from '@/components/ui/SentimentBar';
import ChangeArrow from '@/components/ui/ChangeArrow';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import { formatFundingRate, formatAPRCompact, formatPrice, formatUSD, formatNumber } from '@/lib/utils/format';

type SortKey =
  | 'symbol'
  | 'markPrice'
  | 'openInterest'
  | 'fundingRate'
  | 'longPercent'
  | 'volume24h'
  | 'liquidations24h'
  | 'whaleCount';

export interface MarketsTableProps {
  markets?: MarketSummary[] | null;
  loading?: boolean;
}

/** All 6 markets summary table — click any row to drill into /markets/[symbol]. */
export default function MarketsTable({ markets: marketsProp, loading: loadingProp }: MarketsTableProps) {
  const router = useRouter();
  const [markets, setMarkets] = useState<MarketSummary[]>(marketsProp ?? []);
  const [loading, setLoading] = useState<boolean>(loadingProp ?? marketsProp === undefined);

  useEffect(() => {
    if (marketsProp) {
      setMarkets(marketsProp);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = async (): Promise<void> => {
      try {
        const res = await fetch('/api/markets');
        const data = (await res.json()) as { markets?: MarketSummary[] };
        if (!cancelled && data.markets) setMarkets(data.markets);
      } catch (error) {
        console.error('[MarketsTable]', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [marketsProp]);

  const [sortKey, setSortKey] = useState<SortKey>('volume24h');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const toggleSort = useCallback((key: SortKey) => {
    setSortKey((current) => {
      if (current === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return current;
      }
      setSortDir(key === 'symbol' ? 'asc' : 'desc');
      return key;
    });
  }, []);

  const sorted = useMemo(() => {
    return [...markets].sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      const cmp =
        typeof va === 'string' || typeof vb === 'string'
          ? String(va).localeCompare(String(vb))
          : Number(va) - Number(vb);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [markets, sortKey, sortDir]);

  const handleRowClick = useCallback(
    (symbol: string) => {
      router.push(`/app/markets/${symbol}`);
    },
    [router]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTableRowElement>, symbol: string) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleRowClick(symbol);
      }
    },
    [handleRowClick]
  );

  if (loading) return <LoadingSkeleton variant="table" rows={6} />;

  if (markets.length === 0) {
    return (
      <div className="card-surface flex flex-col items-center justify-center gap-2 p-10 text-center">
        <p className="text-[14px] font-semibold text-textPrimary">No market data yet</p>
        <p className="text-[12px] text-textMuted">Market data will appear once the Perpl indexer is reachable.</p>
      </div>
    );
  }

  return (
    <div className="relative card-surface overflow-x-auto">
      <table className="w-full min-w-[860px] text-left text-[13px]">
        <thead>
          <tr className="border-b border-border text-[11px] uppercase tracking-wider text-textMuted">
            {([
              ['symbol', 'Market'],
              ['markPrice', 'Price'],
              ['openInterest', 'OI (L/S)'],
              ['fundingRate', 'Funding'],
              ['longPercent', 'L/S Skew'],
              ['volume24h', 'Volume 24h'],
              ['liquidations24h', 'Liq 24h'],
              ['whaleCount', 'Whales'],
            ] as Array<[SortKey, string]>).map(([key, label]) => (
              <th
                key={key}
                scope="col"
                aria-sort={sortKey === key ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
                className="px-4 py-3 font-semibold"
              >
                <button
                  type="button"
                  onClick={() => toggleSort(key)}
                  className="inline-flex items-center gap-1 uppercase tracking-wider transition-colors duration-150 hover:text-textPrimary"
                >
                  {label}
                  {sortKey === key ? (
                    sortDir === 'asc' ? (
                      <ChevronUp size={12} aria-hidden />
                    ) : (
                      <ChevronDown size={12} aria-hidden />
                    )
                  ) : (
                    <ChevronsUpDown size={12} className="opacity-40" aria-hidden />
                  )}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((m) => (
            <tr
              key={m.symbol}
              tabIndex={0}
              role="link"
              aria-label={`Open ${m.symbol}-PERP market detail`}
              onClick={() => handleRowClick(m.symbol)}
              onKeyDown={(e) => handleKeyDown(e, m.symbol)}
              className="cursor-pointer border-b border-border transition-colors duration-150 last:border-b-0 hover:bg-surface2"
            >
              <td className="px-4 py-3">
                <MarketBadge market={m.symbol} size="md" />
              </td>
              <td className="px-4 py-3">
                <div className="tabular font-semibold text-textPrimary">{formatPrice(m.markPrice)}</div>
                <ChangeArrow value={m.priceChangePercent24h} />
              </td>
              <td className="px-4 py-3">
                <div className="tabular font-semibold text-textPrimary">{formatUSD(m.openInterest)}</div>
                <div className="mt-1 flex h-1.5 w-24 overflow-hidden rounded-full bg-surface2" title={`Long ${m.longPercent}% · Short ${m.shortPercent}%`}>
                  <div className="h-full bg-success" style={{ width: `${m.longPercent}%` }} />
                  <div className="h-full bg-danger" style={{ width: `${m.shortPercent}%` }} />
                </div>
                <div className="mt-0.5 text-[10px] text-textMuted">
                  L {formatUSD(m.openInterestLong)} · S {formatUSD(m.openInterestShort)}
                </div>
              </td>
              <td className="px-4 py-3">
                <div className={`tabular font-semibold ${m.fundingRate >= 0 ? 'text-success' : 'text-danger'}`}>
                  {formatFundingRate(m.fundingRate)}
                </div>
                <div className={`text-[10px] ${m.fundingRate >= 0 ? 'text-success/70' : 'text-danger/70'}`}>
                  {formatAPRCompact(m.fundingRate)}
                </div>
              </td>
              <td className="w-[130px] px-4 py-3">
                <SentimentBar longPercent={m.longPercent} shortPercent={m.shortPercent} />
              </td>
              <td className="tabular px-4 py-3 font-semibold text-textPrimary">{formatUSD(m.volume24h)}</td>
              <td className="px-4 py-3">
                <div className="tabular text-textPrimary">{formatNumber(m.liquidations24h)}</div>
              </td>
              <td className="px-4 py-3">
                <span className="tabular rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  🐋 {formatNumber(m.whaleCount)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
