'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { FeedEvent as FeedEventType } from '@/lib/types';
import FeedEventCard from '@/components/feed/FeedEvent';
import LiveDot from '@/components/ui/LiveDot';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';

interface FeedResponse {
  events?: FeedEventType[];
}

/**
 * Live preview strip — the last 4 events straight from the live feed
 * (auto-refreshes every 10s), with a CTA into the full stream.
 */
export default function LivePreview() {
  const [events, setEvents] = useState<FeedEventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/feed?limit=4');
      const json = (await res.json()) as FeedResponse;
      if (json.events) {
        setEvents(json.events.slice(0, 4));
        setFailed(false);
      } else {
        setFailed(true);
      }
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 10_000);
    return () => clearInterval(timer);
  }, [load]);

  return (
    <section id="live-preview" className="py-16" style={{ background: '#0A0A0F' }}>
      <div className="mx-auto max-w-4xl px-6">
        <div className="flex items-end justify-between gap-3">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Live from Perpl right now
          </p>
          <span className="flex items-center gap-2 text-xs text-textMuted">
            <LiveDot /> LIVE
          </span>
        </div>

        <div className="mt-6 space-y-3">
          {loading && events.length === 0 && (
            <LoadingSkeleton variant="list" rows={4} />
          )}

          {!loading && failed && (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-8 text-center">
              <p className="text-[13px] text-textSecondary">Unable to load feed</p>
              <button
                type="button"
                onClick={() => void load()}
                className="rounded-lg border border-primary/50 px-5 py-2 text-[12px] font-semibold text-primary transition-colors duration-150 hover:bg-primary/10"
              >
                Retry
              </button>
            </div>
          )}

          {!failed &&
            events.map((event, i) => (
              <div
                key={event.id}
                className="slide-in-top"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <Link href="/app/feed" className="block">
                  <FeedEventCard event={event} compact />
                </Link>
              </div>
            ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/app/feed"
            className="inline-block rounded-lg border border-primary/50 px-8 py-3 text-[13px] font-semibold text-primary transition-all duration-150 hover:bg-primary/10"
          >
            See Full Live Feed →
          </Link>
        </div>
      </div>
    </section>
  );
}
