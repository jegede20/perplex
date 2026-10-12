'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import type { MarketDetail as MarketDetailType } from '@/lib/types';
import MarketDetail from '@/components/markets/MarketDetail';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import { marketLabel, isMarketSymbol } from '@/lib/perpl/markets';

/**
 * MARKET DETAIL — middle layer of the drill-down.
 * Protocol Overview → [THIS PAGE] → Wallet Explorer.
 */
export default function MarketDetailPage() {
  const params = useParams<{ market: string }>();
  const rawSymbol = params?.market ?? 'BTC';
  const symbol = isMarketSymbol(rawSymbol) ? rawSymbol.toUpperCase() : 'BTC';

  const [detail, setDetail] = useState<MarketDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      setLoading(true);
      try {
        const res = await fetch(`/api/market/${symbol}`);
        const data = (await res.json()) as { market?: MarketDetailType };
        if (!cancelled) {
          if (data.market) {
            setDetail(data.market);
            setNotFound(false);
          } else {
            setNotFound(true);
          }
        }
      } catch (error) {
        console.error('[MarketDetailPage]', error);
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  return (
    <ErrorBoundary label={`${symbol} market`}>
      <div className="space-y-4">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[11px] text-textMuted">
          <Link href="/app" className="flex items-center gap-1 transition-colors duration-150 hover:text-primary">
            <Home size={11} aria-hidden /> Home
          </Link>
          <ChevronRight size={11} aria-hidden />
          <Link href="/app/markets" className="transition-colors duration-150 hover:text-primary">
            Markets
          </Link>
          <ChevronRight size={11} aria-hidden />
          <span className="font-semibold text-textPrimary">{marketLabel(symbol as 'BTC')}</span>
        </nav>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-page text-textPrimary">{marketLabel(symbol as 'BTC')}</h1>
          <p className="text-[11px] text-textMuted">
            Click any top trader to open their wallet profile →
          </p>
        </div>

        {loading ? (
          <LoadingSkeleton variant="full" />
        ) : notFound || !detail ? (
          <div className="card-surface flex flex-col items-center justify-center gap-2 p-12 text-center">
            <p className="text-[15px] font-semibold text-textPrimary">Market not found</p>
            <p className="text-[12px] text-textMuted">
              &quot;{rawSymbol}&quot; is not one of the 6 Perpl markets (BTC, ETH, SOL, MON, HYPE, ZEC).
            </p>
            <Link
              href="/app/markets"
              className="mt-2 rounded-lg bg-primary px-4 py-2 text-[12px] font-semibold text-white transition-opacity duration-150 hover:opacity-90"
            >
              Back to Markets
            </Link>
          </div>
        ) : (
          <MarketDetail market={detail} />
        )}
      </div>
    </ErrorBoundary>
  );
}
