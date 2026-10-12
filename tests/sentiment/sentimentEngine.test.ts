import {
  computeOverallSentiment,
  computeMarketSentiment,
  detectSentimentShifts,
  sentimentLabelFor,
} from '@/lib/sentiment/sentimentEngine';
import type {
  FeedEvent,
  OpenPosition,
  WalletProfile,
} from '@/lib/types';

function makeProfile(overrides: Partial<WalletProfile> = {}): WalletProfile {
  return {
    address: '0xabc0000000000000000000000000000000000001',
    shortAddress: '0xAbc...0001',
    tier: 'WHALE',
    smartMoneyScore: 80,
    winRate: 60,
    winCount: 60,
    lossCount: 40,
    totalTrades: 100,
    realizedPnl: 50_000,
    unrealizedPnl: 0,
    totalVolume: 1_000_000,
    avgLeverage: 10,
    maxLeverage: 20,
    avgHoldSeconds: 3600,
    longestWinStreak: 5,
    longestLossStreak: 2,
    maxDrawdown: 10,
    profitFactor: 2,
    behaviorTags: [],
    primaryMarkets: ['BTC'],
    collateralBalance: 100_000,
    firstSeen: '2026-09-01T00:00:00.000Z',
    lastActive: '2026-10-12T00:00:00.000Z',
    openPositions: [],
    ...overrides,
  };
}

function makePosition(overrides: Partial<OpenPosition> = {}): OpenPosition {
  return {
    walletAddress: '0xabc0000000000000000000000000000000000001',
    market: 'BTC',
    side: 'LONG',
    size: 1,
    notionalValue: 100_000,
    entryPrice: 100_000,
    markPrice: 100_000,
    unrealizedPnl: 0,
    unrealizedPnlPercent: 0,
    leverage: 10,
    liquidationPrice: 95_000,
    distanceToLiq: -5,
    marginRatio: 10,
    openedAt: '2026-10-01T00:00:00.000Z',
    txHash: '0xdeadbeef00000000000000000000000000000000',
    ...overrides,
  };
}

describe('sentimentEngine', () => {
  it('returns +100 when smart money is all long', () => {
    const wallet = makeProfile();
    const positions = [makePosition({ side: 'LONG' }), makePosition({ side: 'LONG', notionalValue: 50_000 })];
    const result = computeOverallSentiment(positions, [wallet]);
    expect(result.netSentiment).toBeCloseTo(100);
    expect(result.longPercent).toBeCloseTo(100);
  });

  it('returns -100 when smart money is all short', () => {
    const wallet = makeProfile();
    const positions = [makePosition({ side: 'SHORT' }), makePosition({ side: 'SHORT', notionalValue: 50_000 })];
    const result = computeOverallSentiment(positions, [wallet]);
    expect(result.netSentiment).toBeCloseTo(-100);
    expect(result.shortPercent).toBeCloseTo(100);
  });

  it('returns ≈ 0 for an even 50/50 split', () => {
    const wallet = makeProfile();
    const positions = [makePosition({ side: 'LONG' }), makePosition({ side: 'SHORT' })];
    const result = computeOverallSentiment(positions, [wallet]);
    expect(result.netSentiment).toBeCloseTo(0, 5);
    expect(result.sentimentLabel).toBe('NEUTRAL');
  });

  it('labels +65 as EXTREME GREED', () => {
    expect(sentimentLabelFor(65)).toBe('EXTREME GREED');
    const wallet = makeProfile();
    // 3 long vs 1 short of equal size → net = +50 … construct exact via weights:
    const positions = [
      makePosition({ side: 'LONG', notionalValue: 65 }),
      makePosition({ side: 'SHORT', notionalValue: 35 }),
    ];
    const result = computeOverallSentiment(positions, [wallet]);
    expect(result.netSentiment).toBeCloseTo(30);
    expect(sentimentLabelFor(result.netSentiment)).toBe('GREED');
    expect(sentimentLabelFor(65)).toBe('EXTREME GREED');
  });

  it('labels -65 as EXTREME FEAR', () => {
    expect(sentimentLabelFor(-65)).toBe('EXTREME FEAR');
    const wallet = makeProfile();
    const positions = [
      makePosition({ side: 'SHORT', notionalValue: 65 }),
      makePosition({ side: 'LONG', notionalValue: 35 }),
    ];
    const result = computeOverallSentiment(positions, [wallet]);
    expect(result.netSentiment).toBeCloseTo(-30);
    expect(result.sentimentLabel).toBe('FEAR');
  });

  it('ignores FISH wallets and weights by smart money score', () => {
    const whale = makeProfile({ smartMoneyScore: 100 });
    const fish = makeProfile({
      address: '0xfaaa000000000000000000000000000000000010',
      tier: 'FISH',
      smartMoneyScore: 0,
    });
    const positions = [
      makePosition({ side: 'LONG', notionalValue: 100_000 }), // whale
      makePosition({
        side: 'SHORT',
        notionalValue: 900_000,
        walletAddress: fish.address,
      }), // fish — must be ignored
    ];
    const result = computeOverallSentiment(positions, [whale, fish]);
    expect(result.netSentiment).toBeCloseTo(100);
  });

  it('computes per-market sentiment and trend vs previous', () => {
    const wallet = makeProfile();
    const positions = [makePosition({ market: 'ETH', side: 'LONG' })];
    const detail = computeMarketSentiment('ETH', positions, [wallet], -30);
    expect(detail.market).toBe('ETH');
    expect(detail.netSentiment).toBeCloseTo(100);
    expect(detail.trend).toBe('MORE_BULLISH');
    expect(detail.trendChange).toBeCloseTo(130);
  });

  it('detects shifts when sentiment moves more than 10 points', () => {
    const previous = [computeMarketSentiment('BTC', [], [], undefined)];
    const wallet = makeProfile();
    const positions = [makePosition({ market: 'BTC', side: 'LONG', notionalValue: 200_000 })];
    const current = [computeMarketSentiment('BTC', positions, [wallet], -15)];

    const event: FeedEvent = {
      id: 'e1',
      type: 'OPEN',
      walletAddress: wallet.address,
      shortAddress: wallet.shortAddress,
      tier: 'WHALE',
      smartMoneyScore: 80,
      market: 'BTC',
      side: 'LONG',
      size: 200_000,
      price: 100_000,
      txHash: '0xfeed000000000000000000000000000000000000',
      timestamp: '2026-10-12T12:00:00.000Z',
    };

    // previous 0 → current +100 is a >10pt move
    const shifts = detectSentimentShifts(current, previous, [event]);
    expect(shifts.length).toBe(1);
    expect(shifts[0].direction).toBe('TURNED_BULLISH');
    expect(shifts[0].market).toBe('BTC');
    expect(shifts[0].cause).toContain('opened LONG');
  });
});
