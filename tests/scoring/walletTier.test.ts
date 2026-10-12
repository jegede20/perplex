import { classifyTier } from '@/lib/scoring/walletTier';

describe('classifyTier', () => {
  it('returns WHALE for score 80 + volume $600K', () => {
    expect(classifyTier(80, 600_000)).toBe('WHALE');
  });

  it('returns SHARK for score 80 + volume $100K (volume too low for whale)', () => {
    expect(classifyTier(80, 100_000)).toBe('SHARK');
  });

  it('returns SHARK for score 55 + volume $50K (score qualifies)', () => {
    expect(classifyTier(55, 50_000)).toBe('SHARK');
  });

  it('returns FISH for score 30 + volume $10K', () => {
    expect(classifyTier(30, 10_000)).toBe('FISH');
  });

  it('returns SHARK for volume $100K even with low score (volume qualifies)', () => {
    expect(classifyTier(20, 150_000)).toBe('SHARK');
  });

  it('returns WHALE at the exact whale thresholds (75 + $500K)', () => {
    expect(classifyTier(75, 500_000)).toBe('WHALE');
  });
});
