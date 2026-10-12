import { calculateSmartMoneyScore, rankWallets } from '@/lib/scoring/walletScore';
import type { WalletData, WalletProfile } from '@/lib/types';

const highPerformer: WalletData = {
  winRate: 80,
  realizedPnl: 50_000,
  totalVolume: 1_000_000,
  longestWinStreak: 15,
  totalTrades: 20,
  avgLeverage: 8,
  maxLeverage: 12,
  avgHoldSeconds: 20_000,
};

const poorPerformer: WalletData = {
  winRate: 30,
  realizedPnl: -5_000,
  totalVolume: 10_000,
  longestWinStreak: 1,
  totalTrades: 10,
  avgLeverage: 20,
  maxLeverage: 30,
  avgHoldSeconds: 900,
};

function makeProfile(score: number, pnl: number, address: string): WalletProfile {
  return {
    address,
    shortAddress: `${address.slice(0, 6)}...${address.slice(-4)}`,
    tier: 'FISH',
    smartMoneyScore: score,
    winRate: 50,
    winCount: 5,
    lossCount: 5,
    totalTrades: 10,
    realizedPnl: pnl,
    unrealizedPnl: 0,
    totalVolume: 100_000,
    avgLeverage: 5,
    maxLeverage: 10,
    avgHoldSeconds: 3600,
    longestWinStreak: 3,
    longestLossStreak: 2,
    maxDrawdown: 10,
    profitFactor: 1.2,
    behaviorTags: [],
    primaryMarkets: ['BTC'],
    collateralBalance: 5000,
    firstSeen: '2026-01-01T00:00:00Z',
    lastActive: '2026-10-01T00:00:00Z',
    openPositions: [],
  };
}

describe('calculateSmartMoneyScore', () => {
  it('scores a high performer (80% WR, $50K PnL, $1M vol) above 80', () => {
    const score = calculateSmartMoneyScore(highPerformer);
    expect(score).toBeGreaterThan(80);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('scores a poor performer (30% WR, -$5K PnL, $10K vol) below 25', () => {
    const score = calculateSmartMoneyScore(poorPerformer);
    expect(score).toBeLessThan(25);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it('clamps scores between 0 and 100', () => {
    const godTier = calculateSmartMoneyScore({
      ...highPerformer,
      winRate: 100,
      realizedPnl: 10_000_000,
      totalVolume: 100_000_000,
      longestWinStreak: 100,
      totalTrades: 100,
    });
    expect(godTier).toBeLessThanOrEqual(100);

    const zero = calculateSmartMoneyScore({
      ...poorPerformer,
      winRate: 0,
      realizedPnl: -1_000_000,
      totalVolume: 0,
      longestWinStreak: 0,
    });
    expect(zero).toBeGreaterThanOrEqual(0);
  });

  it('accepts win rates as fractions (0-1) and percents (0-100)', () => {
    const asFraction = calculateSmartMoneyScore({ ...highPerformer, winRate: 0.8 });
    const asPercent = calculateSmartMoneyScore({ ...highPerformer, winRate: 80 });
    expect(asFraction).toBe(asPercent);
  });
});

describe('rankWallets', () => {
  it('sorts wallets descending by smart money score', () => {
    const wallets = [
      makeProfile(42, 1000, '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'),
      makeProfile(91, 5000, '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'),
      makeProfile(68, 2000, '0xcccccccccccccccccccccccccccccccccccccccc'),
    ];
    const ranked = rankWallets(wallets);
    expect(ranked.map((w) => w.smartMoneyScore)).toEqual([91, 68, 42]);
  });

  it('assigns correct 1-based .rank values', () => {
    const wallets = [
      makeProfile(42, 1000, '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'),
      makeProfile(91, 5000, '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'),
      makeProfile(68, 2000, '0xcccccccccccccccccccccccccccccccccccccccc'),
    ];
    const ranked = rankWallets(wallets);
    expect(ranked.map((w) => w.rank)).toEqual([1, 2, 3]);
  });

  it('does not mutate the input array', () => {
    const wallets = [
      makeProfile(10, 0, '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'),
      makeProfile(99, 0, '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'),
    ];
    const copy = [...wallets];
    rankWallets(wallets);
    expect(wallets.map((w) => w.smartMoneyScore)).toEqual(copy.map((w) => w.smartMoneyScore));
  });
});
