import { NextResponse } from 'next/server';
import { getSentiment } from '@/lib/protocol/aggregator';

export const revalidate = 60;

/**
 * GET /api/sentiment
 * Whale sentiment per market + overall skew:
 * long/short %, dominant side, bullish/bearish/neutral signal.
 * Source: computed from current positions data (with fallback).
 */
export async function GET(): Promise<NextResponse> {
  try {
    const sentiment = await getSentiment();
    return NextResponse.json(sentiment, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    });
  } catch (error) {
    console.error('[api/sentiment]', error);
    return NextResponse.json({ error: 'Failed to load sentiment' }, { status: 500 });
  }
}
