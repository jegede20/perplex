import {
  buildLiquidationMap,
  calculateCascadeRisk,
  synthesizeMarketBook,
} from '@/lib/liquidation/mapBuilder';
import type { OpenPosition } from '@/lib/types';

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

describe('mapBuilder', () => {
  it('buckets positions correctly by liquidation price', () => {
    // 0.5% of $100K = $500 bucket width → 95,000 and 95,100 share a bucket
    const positions = [
      makePosition({ liquidationPrice: 95_000, notionalValue: 50_000, walletAddress: '0xa000000000000000000000000000000000000000' }),
      makePosition({ liquidationPrice: 95_100, notionalValue: 30_000, walletAddress: '0xb000000000000000000000000000000000000000' }),
      makePosition({ liquidationPrice: 90_000, notionalValue: 20_000, side: 'SHORT', walletAddress: '0xc000000000000000000000000000000000000000' }),
    ];
    const map = buildLiquidationMap(positions, 100_000, 'BTC', 0.5);

    expect(map.clusters.length).toBe(2);
    const near95k = map.clusters.find((c) => Math.abs(c.priceLevel - 95_000) < 300);
    expect(near95k).toBeDefined();
    expect(near95k?.longCount).toBe(2);
    expect(near95k?.longVolume).toBe(80_000);
    expect(near95k?.wallets.length).toBe(2);
  });

  it('sets intensity 100 for the largest cluster and scales the rest', () => {
    const positions = [
      makePosition({ liquidationPrice: 95_000, notionalValue: 200_000 }),
      makePosition({ liquidationPrice: 90_000, notionalValue: 50_000, walletAddress: '0xb000000000000000000000000000000000000000' }),
    ];
    const map = buildLiquidationMap(positions, 100_000, 'BTC', 0.5);
    const max = map.clusters.reduce((a, b) => (a.totalVolume > b.totalVolume ? a : b));
    const other = map.clusters.find((c) => c !== max)!;
    expect(max.intensity).toBe(100);
    expect(other.intensity).toBe(25);
    expect(map.maxVolume).toBe(200_000);
  });

  it('excludes clusters outside the ±30% price range', () => {
    const positions = [
      makePosition({ liquidationPrice: 100_000 }), // inside
      makePosition({ liquidationPrice: 60_000, walletAddress: '0xb000000000000000000000000000000000000000' }), // below 70K → excluded
      makePosition({ liquidationPrice: 140_000, side: 'SHORT', walletAddress: '0xc000000000000000000000000000000000000000' }), // above 130K → excluded
    ];
    const map = buildLiquidationMap(positions, 100_000, 'BTC', 0.5);
    expect(map.clusters.length).toBe(1);
    expect(map.priceRangeMin).toBeCloseTo(70_000);
    expect(map.priceRangeMax).toBeCloseTo(130_000);
  });

  it('classifies cascade risk EXTREME when more than $5M is liquidated', () => {
    const positions = Array.from({ length: 6 }, (_, i) =>
      makePosition({
        liquidationPrice: 95_000 + i * 100,
        notionalValue: 1_000_000,
        walletAddress: `0x${i}`,
      })
    );
    const map = buildLiquidationMap(positions, 100_000, 'BTC', 0.5);
    const result = calculateCascadeRisk(map.clusters, 100_000, 10, 'DROP');
    expect(result.totalLiquidated).toBeGreaterThan(5_000_000);
    expect(result.cascadeRisk).toBe('EXTREME');
    expect(result.priceTarget).toBeCloseTo(90_000);
    expect(result.affectedWallets).toBeGreaterThan(0);
  });

  it('classifies cascade risk LOW when less than $500K is liquidated', () => {
    const positions = [
      makePosition({ liquidationPrice: 97_000, notionalValue: 100_000, walletAddress: '0xa000000000000000000000000000000000000000' }),
    ];
    const map = buildLiquidationMap(positions, 100_000, 'BTC', 0.5);
    const result = calculateCascadeRisk(map.clusters, 100_000, 2, 'DROP');
    expect(result.totalLiquidated).toBeLessThan(500_000);
    expect(result.cascadeRisk).toBe('LOW');
  });

  it('simulates RISE liquidations against short positions', () => {
    const positions = [
      makePosition({
        side: 'SHORT',
        liquidationPrice: 104_000,
        notionalValue: 3_000_000,
        walletAddress: '0xaaaaa00000000000000000000000000000000000',
      }),
    ];
    const map = buildLiquidationMap(positions, 100_000, 'BTC', 0.5);
    const drop = calculateCascadeRisk(map.clusters, 100_000, 5, 'DROP');
    const rise = calculateCascadeRisk(map.clusters, 100_000, 5, 'RISE');
    expect(drop.totalLiquidated).toBe(0);
    expect(rise.totalLiquidated).toBe(3_000_000);
    expect(rise.cascadeRisk).toBe('HIGH');
    expect(rise.priceTarget).toBeCloseTo(105_000);
  });

  it('synthesizes a deterministic book scaled to target OI', () => {
    const book = synthesizeMarketBook({
      market: 'ETH',
      markPrice: 3_000,
      longOI: 500_000,
      shortOI: 250_000,
      sampleCount: 10,
    });
    const longs = book.filter((p) => p.side === 'LONG');
    const shorts = book.filter((p) => p.side === 'SHORT');
    expect(longs.length).toBe(10);
    expect(shorts.length).toBe(10);
    const longSum = longs.reduce((s, p) => s + p.notionalValue, 0);
    const shortSum = shorts.reduce((s, p) => s + p.notionalValue, 0);
    expect(longSum).toBeCloseTo(500_000, -2);
    expect(shortSum).toBeCloseTo(250_000, -2);
    // every long liquidates below its entry; shorts above
    for (const p of longs) expect(p.liquidationPrice).toBeLessThan(p.entryPrice);
    for (const p of shorts) expect(p.liquidationPrice).toBeGreaterThan(p.entryPrice);
  });
});
