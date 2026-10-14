import { NextRequest, NextResponse } from 'next/server';
import { getAllPositionsInMarket, getMarketInfo } from '@/lib/perpl/contracts';
import { getMarketsOverview } from '@/lib/protocol/aggregator';
import { MARKETS, isMarketSymbol } from '@/lib/perpl/markets';
import {
  buildLiquidationMap,
  onChainPositionsToOpen,
  synthesizeMarketBook,
  DEFAULT_BUCKET_PERCENT,
} from '@/lib/liquidation/mapBuilder';
import type { DataSource, OpenPosition } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/liquidation-map?market=BTC&bucket=0.5
 *
 * Clusters all open positions in a Perpl market by liquidation price.
 *
 * Position source priority (always fresh — positions change constantly):
 *   1. On-chain getPositionsV2(marketId, 0, 250) via Perpl exchange
 *   2. Deterministic book scaled to LIVE open-interest totals from the
 *      Perpl REST context (same live-grounding pattern as the rest of
 *      the app) when the on-chain array cannot be decoded
 *
 * Cache: no-store.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const marketParam = searchParams.get('market') ?? '';
    const bucketParam = Number.parseFloat(searchParams.get('bucket') ?? `${DEFAULT_BUCKET_PERCENT}`);

    if (!isMarketSymbol(marketParam)) {
      return NextResponse.json(
        { error: 'Invalid market — expected one of BTC, ETH, SOL, MON, HYPE, ZEC' },
        { status: 400 }
      );
    }
    const bucket = Number.isFinite(bucketParam) && bucketParam > 0 && bucketParam <= 10
      ? bucketParam
      : DEFAULT_BUCKET_PERCENT;

    const config = MARKETS[marketParam];

    const [onChain, perpInfo, overview] = await Promise.all([
      getAllPositionsInMarket(config.id),
      getMarketInfo(config.id),
      getMarketsOverview(),
    ]);

    const live = overview.find((m) => m.symbol === marketParam);
    const markPrice = perpInfo?.markPrice && perpInfo.markPrice > 0
      ? perpInfo.markPrice
      : live?.markPrice ?? 0;

    if (markPrice <= 0) {
      return NextResponse.json(
        { error: 'Unable to load mark price for this market' },
        { status: 500 }
      );
    }

    let positions: OpenPosition[];
    if (onChain && onChain.length > 0) {
      positions = onChainPositionsToOpen(onChain, markPrice, marketParam);
    } else {
      const longOI = perpInfo?.openInterestLong || live?.openInterestLong || (live?.openInterest ?? 0) / 2;
      const shortOI = perpInfo?.openInterestShort || live?.openInterestShort || (live?.openInterest ?? 0) / 2;
      positions = synthesizeMarketBook({
        market: marketParam,
        markPrice,
        longOI,
        shortOI,
      });
    }

    const map = buildLiquidationMap(positions, markPrice, marketParam, bucket);
    const dataSource: DataSource = onChain && onChain.length > 0 ? 'live' : 'demo';

    return NextResponse.json({ ...map, dataSource }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('[api/liquidation-map]', error);
    return NextResponse.json(
      { error: 'Failed to build liquidation map' },
      { status: 500 }
    );
  }
}
