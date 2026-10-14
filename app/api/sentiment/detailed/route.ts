import { NextResponse } from 'next/server';
import { getTrackedWallets, getFeedEvents } from '@/lib/protocol/aggregator';
import { buildWhaleSentiment } from '@/lib/sentiment/sentimentEngine';
import type { WhaleSentimentData } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/sentiment/detailed
 *
 * Full whale sentiment payload: overall gauge (weighted by Smart Money
 * Score), per-market sentiment cards, recent sentiment shifts, and top
 * bullish/bearish whale tables. Cache: no-store.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const wallets = getTrackedWallets();
    const { events: recentEvents } = await getFeedEvents({ limit: 40 });
    const data: WhaleSentimentData = buildWhaleSentiment(wallets, recentEvents);

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('[api/sentiment/detailed]', error);
    return NextResponse.json(
      { error: 'Failed to compute whale sentiment' },
      { status: 500 }
    );
  }
}
