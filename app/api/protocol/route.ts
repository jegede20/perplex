import { NextRequest, NextResponse } from 'next/server';
import { getNetFlowSeries, getProtocolChartSeries, getProtocolStats } from '@/lib/protocol/aggregator';
import type { TimeRange } from '@/lib/types';

export const dynamic = 'force-dynamic';

const VALID_RANGES: TimeRange[] = ['24H', '7D', '30D', 'ALL'];

/**
 * GET /api/protocol?range=24H|7D|30D|ALL
 * Protocol-level stats: volume, OI, TVL, fees, liquidations,
 * insurance fund, active traders, net flows.
 * Source: Supabase snapshots + Monad contract reads (with fallback).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const rangeParam = request.nextUrl.searchParams.get('range') ?? '24H';
    const range = (VALID_RANGES.includes(rangeParam as TimeRange) ? rangeParam : '24H') as TimeRange;

    const [stats, chart, flows] = await Promise.all([
      getProtocolStats(range),
      getProtocolChartSeries(range),
      getNetFlowSeries(range),
    ]);

    return NextResponse.json({ stats, chart, flows, range }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    });
  } catch (error) {
    console.error('[api/protocol]', error);
    return NextResponse.json({ error: 'Failed to load protocol stats' }, { status: 500 });
  }
}
