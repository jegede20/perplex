import { generateBehaviorTags } from '@/lib/scoring/behaviorTags';
import type { WalletData } from '@/lib/types';

const base: WalletData = {
  winRate: 0.5,
  realizedPnl: 5_000,
  totalVolume: 50_000,
  longestWinStreak: 3,
  totalTrades: 10,
  avgLeverage: 5,
  maxLeverage: 10,
  avgHoldSeconds: 100_000,
};

describe('generateBehaviorTags', () => {
  it('includes HIGH_LEVERAGE when avgLeverage is 20', () => {
    expect(generateBehaviorTags({ ...base, avgLeverage: 20 })).toContain('HIGH_LEVERAGE');
  });

  it('includes SCALPER when avgHoldSeconds is 1800', () => {
    expect(generateBehaviorTags({ ...base, avgHoldSeconds: 1800 })).toContain('SCALPER');
  });

  it('includes SWING_TRADER when avgHoldSeconds is 172800 (2 days)', () => {
    expect(generateBehaviorTags({ ...base, avgHoldSeconds: 172800 })).toContain('SWING_TRADER');
  });

  it('includes DIAMOND_HANDS when avgHoldSeconds exceeds 7 days', () => {
    expect(generateBehaviorTags({ ...base, avgHoldSeconds: 700_000 })).toContain('DIAMOND_HANDS');
  });

  it('includes CONSISTENT when winRate is 0.78', () => {
    expect(generateBehaviorTags({ ...base, winRate: 0.78 })).toContain('CONSISTENT');
  });

  it('includes RISK_TAKER when maxLeverage is 25', () => {
    expect(generateBehaviorTags({ ...base, maxLeverage: 25 })).toContain('RISK_TAKER');
  });

  it('includes HIGH_VOLUME when totalVolume is 2,000,000', () => {
    expect(generateBehaviorTags({ ...base, totalVolume: 2_000_000 })).toContain('HIGH_VOLUME');
  });

  it('includes BTC_MAXI when btcVolumeRatio exceeds 0.70', () => {
    expect(generateBehaviorTags({ ...base, btcVolumeRatio: 0.75 })).toContain('BTC_MAXI');
  });

  it('includes CONTRARIAN when tradesAgainstTrend exceeds 60%', () => {
    expect(generateBehaviorTags({ ...base, tradesAgainstTrend: 0.65 })).toContain('CONTRARIAN');
    expect(generateBehaviorTags({ ...base, tradesAgainstTrend: 65 })).toContain('CONTRARIAN');
  });

  it('includes LOSS_CUTTER when avg loss hold is under 1 hour', () => {
    expect(generateBehaviorTags({ ...base, avgLossHoldSeconds: 1800 })).toContain('LOSS_CUTTER');
  });

  it('returns no tags for a plain mid-profile wallet', () => {
    const tags = generateBehaviorTags({
      ...base,
      winRate: 0.5,
      avgHoldSeconds: 50_000,
      avgLeverage: 5,
      maxLeverage: 10,
      totalVolume: 50_000,
    });
    expect(tags).toEqual([]);
  });
});
