import { NextRequest, NextResponse } from 'next/server';
import { getLeaderboard } from '@/lib/protocol/aggregator';
import type { WalletTier } from '@/lib/types';
import { LEADERBOARD_PAGE_SIZE } from '@/lib/utils/constants';

export const dynamic = 'force-dynamic';

const VALID_SORT = ['smart_money_score', 'total_volume', 'realized_pnl'] as const;
const VALID_TIERS: WalletTier[] = ['WHALE', 'SHARK', 'FISH'];

/**
 * GET /api/wallets?limit&offset&sortBy&tier&minScore
 * Smart-money leaderboard: ranked wallet summaries.
 * Source: Supabase wallets ordered by smart_money_score (with fallback).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const params = request.nextUrl.searchParams;

    const limitRaw = Number(params.get('limit') ?? LEADERBOARD_PAGE_SIZE);
    const offsetRaw = Number(params.get('offset') ?? 0);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : LEADERBOARD_PAGE_SIZE;
    const offset = Number.isFinite(offsetRaw) ? Math.max(offsetRaw, 0) : 0;

    const sortByRaw = params.get('sortBy') ?? 'smart_money_score';
    const sortBy = (VALID_SORT as readonly string[]).includes(sortByRaw)
      ? (sortByRaw as (typeof VALID_SORT)[number])
      : 'smart_money_score';

    const tierRaw = params.get('tier');
    const tier = tierRaw && VALID_TIERS.includes(tierRaw as WalletTier)
      ? (tierRaw as WalletTier)
      : undefined;

    const minScoreRaw = Number(params.get('minScore'));
    const minScore = Number.isFinite(minScoreRaw) && params.get('minScore') !== null
      ? Math.min(Math.max(minScoreRaw, 0), 100)
      : undefined;

    const result = await getLeaderboard({ limit, offset, sortBy, tier, minScore });
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
    });
  } catch (error) {
    console.error('[api/wallets]', error);
    return NextResponse.json({ error: 'Failed to load leaderboard' }, { status: 500 });
  }
}
