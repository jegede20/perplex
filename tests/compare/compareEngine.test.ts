import {
  compareWallets,
  normalizeForRadar,
  radarArea,
  validateComparisonAddresses,
} from '@/lib/compare/compareEngine';
import type { WalletProfile } from '@/lib/types';

const ADDR_A = '0xaaa0000000000000000000000000000000000001';
const ADDR_B = '0xbbb0000000000000000000000000000000000002';
const ADDR_C = '0xabc0000000000000000000000000000000000001';
const ADDR_DEF = '0xdef0000000000000000000000000000000000002';

function makeProfile(overrides: Partial<WalletProfile> = {}): WalletProfile {
  return {
    address: ADDR_C,
    shortAddress: '0xAbc...0001',
    tier: 'WHALE',
    smartMoneyScore: 70,
    winRate: 55,
    winCount: 55,
    lossCount: 45,
    totalTrades: 100,
    realizedPnl: 20_000,
    unrealizedPnl: 0,
    totalVolume: 500_000,
    avgLeverage: 10,
    maxLeverage: 20,
    avgHoldSeconds: 3600,
    longestWinStreak: 5,
    longestLossStreak: 2,
    maxDrawdown: 20,
    profitFactor: 1.5,
    behaviorTags: [],
    primaryMarkets: ['BTC'],
    collateralBalance: 50_000,
    firstSeen: '2026-09-01T00:00:00.000Z',
    lastActive: '2026-10-12T00:00:00.000Z',
    openPositions: [],
    ...overrides,
  };
}

describe('compareEngine', () => {
  it('identifies wallet A as winner when A beats B on most metrics', () => {
    const a = makeProfile({
      address: ADDR_A,
      winRate: 80,
      realizedPnl: 120_000,
      totalVolume: 2_000_000,
      smartMoneyScore: 90,
      profitFactor: 3,
      maxDrawdown: 10,
      totalTrades: 300,
      avgHoldSeconds: 7200,
      longestWinStreak: 12,
    });
    const b = makeProfile({
      address: ADDR_B,
      winRate: 40,
      realizedPnl: 5_000,
      totalVolume: 100_000,
      smartMoneyScore: 40,
      profitFactor: 0.9,
      maxDrawdown: 45,
      totalTrades: 20,
      avgHoldSeconds: 600,
      longestWinStreak: 1,
    });
    const result = compareWallets(a, b);
    expect(result.winner.winner).toBe('A');
    expect(result.winner.metricsWon).toBeGreaterThan(result.winner.metricsLost);
    expect(result.winner.verdict).toBe('Wallet A outperforms across most metrics');
  });

  it('returns TIE when both wallets are identical', () => {
    const a = makeProfile({ address: ADDR_A });
    const b = makeProfile({ address: ADDR_B });
    const result = compareWallets(a, b);
    expect(result.winner.winner).toBe('TIE');
    expect(result.winner.verdict).toBe('Both wallets show comparable performance');
    for (const key of Object.keys(result.metrics) as Array<keyof typeof result.metrics>) {
      expect(result.metrics[key].winner).toBe('TIE');
    }
  });

  it('inverts winner logic for maxDrawdown (lower is better)', () => {
    const a = makeProfile({ address: ADDR_A, maxDrawdown: 40 });
    const b = makeProfile({ address: ADDR_B, maxDrawdown: 15 });
    const result = compareWallets(a, b);
    expect(result.metrics.maxDrawdown.higherIsBetter).toBe(false);
    expect(result.metrics.maxDrawdown.winner).toBe('B'); // smaller drawdown wins
    // same for avg leverage
    const result2 = compareWallets(
      makeProfile({ address: ADDR_A, avgLeverage: 25 }),
      makeProfile({ address: ADDR_B, avgLeverage: 5 })
    );
    expect(result2.metrics.avgLeverage.higherIsBetter).toBe(false);
    expect(result2.metrics.avgLeverage.winner).toBe('B');
  });

  it('clamps normalizeForRadar results between 0 and 100', () => {
    expect(normalizeForRadar(150, 'winRate')).toBe(100);
    expect(normalizeForRadar(-20, 'winRate')).toBe(0);
    expect(normalizeForRadar(1_000_000, 'realizedPnl')).toBe(100);
    expect(normalizeForRadar(10_000_000, 'totalVolume')).toBe(100);
    expect(normalizeForRadar(50, 'maxDrawdown')).toBe(50);
    expect(normalizeForRadar(200, 'maxDrawdown')).toBe(0);
    expect(normalizeForRadar(60, 'avgLeverage')).toBe(0); // 100 - clamp(200) = 0
    expect(normalizeForRadar(15, 'avgLeverage')).toBe(50);
    for (const metric of ['winRate', 'profitFactor', 'smartMoneyScore', 'totalTrades']) {
      const v = normalizeForRadar(50, metric);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });

  it('rejects comparing a wallet with itself and invalid addresses', () => {
    expect(validateComparisonAddresses(ADDR_C, ADDR_C)).toBe(
      'Cannot compare a wallet with itself'
    );
    expect(
      validateComparisonAddresses(ADDR_C, ADDR_C.toUpperCase().replace('0X', '0x'))
    ).toBe('Cannot compare a wallet with itself');
    expect(validateComparisonAddresses('0xnope', ADDR_C)).toBe('Invalid wallet address');
    expect(validateComparisonAddresses(ADDR_C, '')).toBe('Invalid wallet address');
    expect(validateComparisonAddresses(ADDR_C, ADDR_DEF)).toBeNull();
  });

  it('computes radar areas for dominance badge', () => {
    const a = makeProfile({ address: ADDR_A, winRate: 90 });
    const b = makeProfile({ address: ADDR_B, winRate: 20 });
    const result = compareWallets(a, b);
    expect(radarArea(result.radarData, 'A')).toBeGreaterThan(radarArea(result.radarData, 'B'));
    expect(result.radarData.length).toBe(6);
  });
});
