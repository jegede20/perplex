import { NextResponse } from 'next/server';
import { getMarketsOverview } from '@/lib/protocol/aggregator';

export const revalidate = 30;

/**
 * GET /api/markets
 * All 6 Perpl markets summary: price, OI, L/S skew, funding, volume,
 * liquidations, whale counts.
 * Source: Monad contract reads + Perpl REST (with fallback).
 */
export async function GET(): Promise<NextResponse> {
  try {
    const markets = await getMarketsOverview();
    return NextResponse.json({ markets }, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
    });
  } catch (error) {
    console.error('[api/markets]', error);
    return NextResponse.json({ error: 'Failed to load markets' }, { status: 500 });
  }
}
