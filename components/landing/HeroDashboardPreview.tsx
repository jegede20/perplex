'use client';

import { useEffect, useState } from 'react';
import type { FeedEvent, MarketSummary, OverallSentiment } from '@/lib/types';
import TierBadge from '@/components/ui/TierBadge';
import SentimentBar from '@/components/ui/SentimentBar';
import { formatPrice, formatTimeAgo, formatUSD, formatPercent } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

interface PreviewState {
  btc: MarketSummary | null;
  sentiment: OverallSentiment | null;
  event: FeedEvent | null;
}

/**
 * Floating product-peek panels for the hero — each card streams real
 * data from the app's own APIs, so the landing hero is alive rather
 * than a static mockup.
 */
export default function HeroDashboardPreview() {
  const [state, setState] = useState<PreviewState>({
    btc: null,
    sentiment: null,
    event: null,
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [marketsRes, sentimentRes, feedRes] = await Promise.allSettled([
          fetch('/api/markets').then((r) => r.json() as Promise<{ markets?: MarketSummary[] }>),
          fetch('/api/sentiment/detailed').then(
            (r) => r.json() as Promise<{ overall?: OverallSentiment }>
          ),
          fetch('/api/feed?limit=1').then(
            (r) => r.json() as Promise<{ events?: FeedEvent[] }>
          ),
        ]);
        if (cancelled) return;
        setState({
          btc: marketsRes.status === 'fulfilled' ? marketsRes.value.markets?.find((m) => m.symbol === 'BTC') ?? null : null,
          sentiment: sentimentRes.status === 'fulfilled' ? sentimentRes.value.overall ?? null : null,
          event: feedRes.status === 'fulfilled' ? feedRes.value.events?.[0] ?? null : null,
        });
      } catch {
        // graceful "--" panels below
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const { btc, sentiment, event } = state;

  return (
    <div className="relative mx-auto w-full max-w-[440px] space-y-4" aria-hidden>
      {/* card 1 — live market */}
      <div className="rounded-2xl border border-border bg-surface/90 p-5 shadow-[0_8px_40px_rgba(0,0,0,0.45)] backdrop-blur">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-textMuted">
            BTC-PERP · Live
          </p>
          <span className="flex items-center gap-1.5 text-[10px] text-success">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" /> streaming
          </span>
        </div>
        <div className="mt-2 flex items-end justify-between">
          <p className="tabular text-[30px] font-bold leading-none text-white">
            {loaded ? (btc ? formatPrice(btc.markPrice) : '--') : ''}
          </p>
          <span
            className={cn(
              'tabular text-[13px] font-semibold',
              (btc?.priceChangePercent24h ?? 0) >= 0 ? 'text-success' : 'text-danger'
            )}
          >
            {loaded && btc
              ? `${btc.priceChangePercent24h >= 0 ? '+' : ''}${formatPercent(btc.priceChangePercent24h / 100)}`
              : '--'}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-lg bg-surface2 px-3 py-2">
            <p className="text-textMuted">Open Interest</p>
            <p className="tabular font-semibold text-textPrimary">
              {loaded && btc ? formatUSD(btc.openInterest) : '--'}
            </p>
          </div>
          <div className="rounded-lg bg-surface2 px-3 py-2">
            <p className="text-textMuted">Funding</p>
            <p className="tabular font-semibold text-primary">
              {loaded && btc ? formatPercent(btc.fundingRate * 100, 4) : '--'}
            </p>
          </div>
        </div>
      </div>

      {/* card 2 — whale sentiment */}
      <div className="ml-8 rounded-2xl border border-border bg-surface/90 p-5 shadow-[0_8px_40px_rgba(0,0,0,0.45)] backdrop-blur">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-textMuted">
          Whale Sentiment
        </p>
        <div className="mt-2 flex items-center gap-3">
          <p
            className={cn(
              'tabular text-[26px] font-black leading-none',
              (sentiment?.netSentiment ?? 0) >= 0 ? 'text-success' : 'text-danger'
            )}
          >
            {loaded && sentiment
              ? `${sentiment.netSentiment > 0 ? '+' : ''}${Math.round(sentiment.netSentiment)}`
              : '--'}
          </p>
          <span
            className={cn(
              'rounded-full border px-2.5 py-1 text-[10px] font-bold',
              (sentiment?.netSentiment ?? 0) >= 0
                ? 'border-success/40 bg-success/10 text-success'
                : 'border-danger/40 bg-danger/10 text-danger'
            )}
          >
            {loaded && sentiment ? sentiment.sentimentLabel : '—'}
          </span>
        </div>
        <div className="mt-3">
          <SentimentBar
            longPercent={sentiment?.longPercent ?? 50}
            shortPercent={sentiment?.shortPercent ?? 50}
            showLabels
          />
        </div>
        <p className="mt-1.5 text-[10px] text-textMuted">
          {loaded && sentiment
            ? `Tracking ${sentiment.trackedWhales + sentiment.trackedSharks} whales & sharks`
            : '\u00a0'}
        </p>
      </div>

      {/* card 3 — live whale alert */}
      <div className="mr-10 rounded-2xl border border-primary/25 bg-surface/90 p-5 shadow-[0_8px_40px_rgba(123,94,167,0.18)] backdrop-blur">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-textMuted">
            Live Whale Alert
          </p>
          {event && <TierBadge tier={event.tier} size="sm" />}
        </div>
        {loaded && event ? (
          <p className="mt-2 text-[13px] text-textSecondary">
            <span className="font-mono font-semibold text-primary">
              {event.shortAddress}
            </span>{' '}
            {event.type === 'OPEN' ? 'opened' : event.type === 'CLOSE' ? 'closed' : event.type === 'FLIP' ? 'flipped' : 'was liquidated on'}{' '}
            <span className="font-semibold text-white">{formatUSD(event.size)}</span>{' '}
            <span className={event.side === 'LONG' ? 'text-success' : 'text-danger'}>
              {event.side} {event.market}
            </span>
          </p>
        ) : (
          <p className="mt-2 text-[13px] text-textMuted">{loaded ? 'No recent alerts' : '\u00a0'}</p>
        )}
        <p className="mt-1 text-[10px] text-textMuted">
          {loaded && event ? formatTimeAgo(event.timestamp) : '\u00a0'}
        </p>
      </div>
    </div>
  );
}
