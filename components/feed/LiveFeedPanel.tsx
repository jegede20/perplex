'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap } from 'lucide-react';
import type { FeedEvent } from '@/lib/types';
import FeedEventCard from '@/components/feed/FeedEvent';
import LiveDot from '@/components/ui/LiveDot';
import DemoDataBadge from '@/components/ui/DemoDataBadge';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import { usePerplWebSocket } from '@/lib/perpl/websocket';
import { FEED_PANEL_MAX, FEED_POLL_INTERVAL, WHALE_THRESHOLD_SIZE } from '@/lib/utils/constants';

export interface LiveFeedPanelProps {
  max?: number;
}

/**
 * Compact live feed panel for the home page sidebar.
 * Streams WebSocket events when available, polls /api/feed as fallback.
 * New events animate in from the top; click → wallet profile.
 */
export default function LiveFeedPanel({ max = FEED_PANEL_MAX }: LiveFeedPanelProps) {
  const router = useRouter();
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [whaleFlash, setWhaleFlash] = useState(false);

  const onWhaleDetected = useCallback((event: FeedEvent) => {
    if (event.size > WHALE_THRESHOLD_SIZE) {
      setWhaleFlash(true);
      setTimeout(() => setWhaleFlash(false), 1200);
    }
  }, []);

  const { events: wsEvents, isConnected } = usePerplWebSocket({ onWhaleDetected });

  const [demoData, setDemoData] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      try {
        const res = await fetch(`/api/feed?limit=${max}`);
        const data = (await res.json()) as { events?: FeedEvent[]; dataSource?: 'live' | 'demo' };
        if (!cancelled && data.events) {
          setEvents(data.events);
          setDemoData(data.dataSource !== 'live');
        }
      } catch (error) {
        console.error('[LiveFeedPanel]', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    const timer = setInterval(() => void load(), FEED_POLL_INTERVAL);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [max]);

  // Merge live WS events on top of polled events
  useEffect(() => {
    if (wsEvents.length === 0) return;
    setEvents((prev) => {
      const seen = new Set(prev.map((e) => e.id));
      const fresh = wsEvents.filter((e) => !seen.has(e.id));
      return fresh.length > 0 ? [...fresh, ...prev].slice(0, max) : prev;
    });
  }, [wsEvents, max]);

  return (
    <div className={`card-surface flex h-full flex-col transition-shadow duration-150 ${whaleFlash ? 'glass-glow border-primary/60' : ''}`}>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-widest text-textSecondary">
          <Zap size={14} className="text-primary" aria-hidden /> Live Feed
          {demoData && !isConnected && <DemoDataBadge />}
        </h3>
        <span className="flex items-center gap-1.5 text-[10px] font-semibold text-success">
          <LiveDot /> LIVE
          <span className="text-textMuted">{isConnected ? '· ws' : '· polling'}</span>
        </span>
      </div>

      <div className="scrollbar-thin flex-1 space-y-1.5 overflow-y-auto p-2" style={{ maxHeight: 520 }}>
        {loading ? (
          <LoadingSkeleton variant="list" rows={6} />
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1 py-10 text-center">
            <p className="text-[12px] text-textSecondary">Waiting for on-chain events…</p>
            <p className="text-[10px] text-textMuted">Whale trades and liquidations appear here live.</p>
          </div>
        ) : (
          events.slice(0, max).map((event) => (
            <div key={event.id} className="slide-in-top">
              <FeedEventCard event={event} compact />
            </div>
          ))
        )}
      </div>

      <button
        type="button"
        onClick={() => router.push('/app/feed')}
        className="border-t border-border px-4 py-2.5 text-center text-[11px] font-semibold text-primary transition-colors duration-150 hover:bg-surface2"
      >
        View full feed →
      </button>
    </div>
  );
}
