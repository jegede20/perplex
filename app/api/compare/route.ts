import { NextRequest, NextResponse } from 'next/server';
import { getWalletDetail } from '@/lib/protocol/aggregator';
import { compareWallets, validateComparisonAddresses } from '@/lib/compare/compareEngine';
import type { WalletComparison } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/compare?walletA=0x..&walletB=0x..
 *
 * Head-to-head wallet comparison: 10 metrics with per-metric winners,
 * overall verdict, and normalized radar data. Cache: no-store.
 *
 * Errors:
 *   400 Invalid wallet address
 *   400 Cannot compare a wallet with itself
 *   404 Wallet not found on Perpl
 *   500 Failed to compare wallets
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const addressA = (searchParams.get('walletA') ?? '').toLowerCase();
    const addressB = (searchParams.get('walletB') ?? '').toLowerCase();

    const validationError = validateComparisonAddresses(addressA, addressB);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const [detailA, detailB] = await Promise.all([
      getWalletDetail(addressA),
      getWalletDetail(addressB),
    ]);

    if (!detailA) {
      return NextResponse.json(
        { error: 'Wallet A not found on Perpl' },
        { status: 404 }
      );
    }
    if (!detailB) {
      return NextResponse.json(
        { error: 'Wallet B not found on Perpl' },
        { status: 404 }
      );
    }

    const comparison: WalletComparison = {
      ...compareWallets(detailA.wallet, detailB.wallet),
      pnlHistoryA: detailA.pnlHistory,
      pnlHistoryB: detailB.pnlHistory,
      dataSource: detailA.dataSource ?? 'demo',
    };

    return NextResponse.json(comparison, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('[api/compare]', error);
    return NextResponse.json(
      { error: 'Failed to compare wallets' },
      { status: 500 }
    );
  }
}
