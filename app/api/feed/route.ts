import { NextRequest, NextResponse } from 'next/server';
import { getFeedEvents } from '@/lib/protocol/aggregator';
import { insertFeedEvents } from '@/lib/supabase/queries';
import type { FeedEvent, FeedEventType, Market, WalletTier } from '@/lib/types';
import { isMarketSymbol } from '@/lib/perpl/markets';

export const dynamic = 'force-dynamic';

const VALID_TYPES: FeedEventType[] = ['OPEN', 'CLOSE', 'LIQUIDATION', 'FLIP'];
const VALID_TIERS: WalletTier[] = ['WHALE', 'SHARK', 'FISH'];

/**
 * GET /api/feed?limit&market&tier&type&minSize
 * Recent feed events (newest first). Filters combine with AND logic.
 * Source: Supabase feed_events (with fallback).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const params = request.nextUrl.searchParams;

    const limitRaw = Number(params.get('limit') ?? 50);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 50;

    const marketParam = params.get('market');
    const market = marketParam && isMarketSymbol(marketParam)
      ? (marketParam.toUpperCase() as Market)
      : undefined;

    const typeParam = params.get('type');
    const type = typeParam && VALID_TYPES.includes(typeParam as FeedEventType)
      ? (typeParam as FeedEventType)
      : undefined;

    const tierParam = params.get('tier');
    const tier = tierParam && VALID_TIERS.includes(tierParam as WalletTier)
      ? (tierParam as WalletTier)
      : undefined;

    const minSizeRaw = Number(params.get('minSize'));
    const minSize = Number.isFinite(minSizeRaw) && params.get('minSize') !== null
      ? Math.max(minSizeRaw, 0)
      : undefined;

    const { events, dataSource } = await getFeedEvents({ limit, market, type, tier, minSize });
    return NextResponse.json({ events, dataSource }, {
      headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=20' },
    });
  } catch (error) {
    console.error('[api/feed]', error);
    return NextResponse.json({ error: 'Failed to load feed' }, { status: 500 });
  }
}

/**
 * POST /api/feed
 * Persist live WebSocket events (indexer path) into Supabase feed_events.
 * Body: { events: FeedEvent[] }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as { events?: unknown };
    const rawEvents = Array.isArray(body.events) ? body.events : [];
    const events = rawEvents.filter(
      (e): e is FeedEvent =>
        typeof e === 'object' &&
        e !== null &&
        typeof (e as FeedEvent).walletAddress === 'string' &&
        typeof (e as FeedEvent).size === 'number'
    );
    if (events.length === 0) {
      return NextResponse.json({ error: 'No valid events provided' }, { status: 400 });
    }
    const saved = await insertFeedEvents(events);
    return NextResponse.json({ saved: saved ? events.length : 0, persisted: saved });
  } catch (error) {
    console.error('[api/feed:POST]', error);
    return NextResponse.json({ error: 'Failed to persist feed events' }, { status: 500 });
  }
}
