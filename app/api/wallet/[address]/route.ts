import { NextRequest, NextResponse } from 'next/server';
import { getWalletDetail, getWalletFlows } from '@/lib/protocol/aggregator';
import { isValidAddress } from '@/lib/utils/format';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: { address: string };
}

/**
 * GET /api/wallet/[address]
 * Full wallet profile: smart money score, tier, behavior tags, trade
 * history, PnL curve, flows, and live open positions (contract reads).
 * Source: Supabase history + Monad chain live state (with fallback).
 * Cache: no-store — always fresh.
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const address = context.params.address?.toLowerCase() ?? '';
    if (!isValidAddress(address)) {
      return NextResponse.json(
        { error: 'Invalid wallet address — expected 0x + 40 hex characters' },
        { status: 400 }
      );
    }

    const detail = await getWalletDetail(address);
    if (!detail) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    const flows = await getWalletFlows(address);
    return NextResponse.json({ ...detail, flows }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('[api/wallet]', error);
    return NextResponse.json({ error: 'Failed to load wallet profile' }, { status: 500 });
  }
}
