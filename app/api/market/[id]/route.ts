import { NextRequest, NextResponse } from 'next/server';
import { getMarketDetail, getMarketTrades } from '@/lib/protocol/aggregator';
import { isMarketSymbol } from '@/lib/perpl/markets';

export const revalidate = 30;

interface RouteContext {
  params: { id: string };
}

/**
 * GET /api/market/[id]
 * Single market drill-down (id = Perpl market id 0-5 or symbol):
 * funding history, OI history, volume history, positions near
 * liquidation, order book depth, top traders, recent liquidations.
 * Source: contract reads + REST + Supabase (with fallback).
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const raw = context.params.id;
    const isNumeric = /^\d{1,3}$/.test(raw);
    if (!isNumeric && !isMarketSymbol(raw)) {
      return NextResponse.json({ error: `Invalid market: ${raw}` }, { status: 400 });
    }

    const detail = await getMarketDetail(isNumeric ? Number(raw) : raw);
    if (!detail) {
      return NextResponse.json({ error: `Market not found: ${raw}` }, { status: 404 });
    }

    const trades = await getMarketTrades(detail.symbol, 50);
    return NextResponse.json({ market: detail, trades }, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
    });
  } catch (error) {
    console.error('[api/market]', error);
    return NextResponse.json({ error: 'Failed to load market detail' }, { status: 500 });
  }
}
