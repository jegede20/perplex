'use client';

import { useEffect, useState } from 'react';
import type { OrderBook } from '@/lib/types';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import { formatPrice, formatUSD } from '@/lib/utils/format';
import { ORDERBOOK_REFRESH_INTERVAL } from '@/lib/utils/constants';

export interface OrderBookDepthProps {
  marketId: number;
  initialBook?: OrderBook | null;
}

/**
 * L2 order book depth — cumulative bid (green) vs ask (red) areas,
 * spread in the center. Refreshes every 5s from the REST API.
 */
export default function OrderBookDepth({ marketId, initialBook }: OrderBookDepthProps) {
  const [book, setBook] = useState<OrderBook | null>(initialBook ?? null);
  const [loading, setLoading] = useState<boolean>(initialBook === undefined || initialBook === null);

  useEffect(() => {
    if (initialBook) {
      setBook(initialBook);
      setLoading(false);
    }
  }, [initialBook]);

  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      try {
        const res = await fetch(`/api/market/${marketId}`);
        const data = (await res.json()) as { market?: { orderBook?: OrderBook } };
        if (!cancelled && data.market?.orderBook) {
          setBook(data.market.orderBook);
          setLoading(false);
        }
      } catch (error) {
        console.error('[OrderBookDepth]', error);
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    const timer = setInterval(() => void load(), ORDERBOOK_REFRESH_INTERVAL);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [marketId]);

  if (loading) return <LoadingSkeleton variant="chart" />;
  if (!book) {
    return (
      <div className="card-surface flex flex-col items-center justify-center gap-1 p-8 text-center">
        <p className="text-[13px] text-textSecondary">Order book unavailable</p>
        <p className="text-[11px] text-textMuted">Depth will appear when the Perpl market-data feed responds.</p>
      </div>
    );
  }

  const bidTotal = book.bids.reduce((s, [, size]) => s + size, 0);
  const askTotal = book.asks.reduce((s, [, size]) => s + size, 0);
  const maxTotal = Math.max(bidTotal, askTotal, 1);

  let bidCum = 0;
  const bids = book.bids.map(([price, size]) => {
    bidCum += size;
    return { price, size, cum: bidCum, pct: (bidCum / maxTotal) * 100 };
  });
  let askCum = 0;
  const asks = book.asks.map(([price, size]) => {
    askCum += size;
    return { price, size, cum: askCum, pct: (askCum / maxTotal) * 100 };
  });

  return (
    <div className="card-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[13px] font-semibold uppercase tracking-widest text-textSecondary">
          Order Book Depth
        </h3>
        <span className="tabular text-[11px] text-textMuted">
          Spread: {formatPrice(book.spread)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[10px]">
        <div>
          <div className="mb-1 flex justify-between px-1 font-semibold text-success">
            <span>Bids</span>
            <span>{formatUSD(bidTotal)}</span>
          </div>
          <div className="space-y-[2px]">
            {bids.slice(0, 9).map((level) => (
              <div key={`bid-${level.price}`} className="relative flex justify-between rounded px-1 py-[3px]">
                <div className="absolute inset-y-0 right-0 rounded bg-success/15" style={{ width: `${level.pct}%` }} />
                <span className="relative text-success">{formatPrice(level.price)}</span>
                <span className="relative tabular text-textSecondary">{level.size.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-1 flex justify-between px-1 font-semibold text-danger">
            <span>Asks</span>
            <span>{formatUSD(askTotal)}</span>
          </div>
          <div className="space-y-[2px]">
            {asks.slice(0, 9).map((level) => (
              <div key={`ask-${level.price}`} className="relative flex justify-between rounded px-1 py-[3px]">
                <div className="absolute inset-y-0 right-0 rounded bg-danger/15" style={{ width: `${level.pct}%` }} />
                <span className="relative text-danger">{formatPrice(level.price)}</span>
                <span className="relative tabular text-textSecondary">{level.size.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-2 border-t border-border pt-2 text-center text-[11px] text-textMuted">
        Mid: <span className="tabular font-semibold text-textPrimary">{formatPrice(book.midPrice)}</span>
      </div>
    </div>
  );
}
