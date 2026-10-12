import type { BehaviorTag, WalletData } from '@/lib/types';

// ═══════════════════════════════════════════════════════════════════
// Behavior tag generation — auto-profiling from trading stats
// ═══════════════════════════════════════════════════════════════════

/** Accept 0–1 fractions or 0–100 percents and normalize to a 0–1 fraction. */
function asFraction(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return 0;
  return value > 1 ? value / 100 : value;
}

/**
 * Generate behavior tags from wallet trading data:
 *   HIGH_LEVERAGE  → avgLeverage > 15
 *   SCALPER        → avgHoldSeconds < 7200 (under 2 hours)
 *   SWING_TRADER   → avgHoldSeconds 86400–604800 (1–7 days)
 *   DIAMOND_HANDS  → avgHoldSeconds > 604800 (over 7 days)
 *   BTC_MAXI       → btcVolumeRatio > 0.70
 *   CONSISTENT     → winRate > 0.70
 *   HIGH_VOLUME    → totalVolume > 1,000,000
 *   RISK_TAKER     → maxLeverage >= 25
 *   CONTRARIAN     → tradesAgainstTrend > 60%
 *   LOSS_CUTTER    → avg loss hold < 1 hour
 */
export function generateBehaviorTags(data: WalletData): BehaviorTag[] {
  const tags: BehaviorTag[] = [];

  const winRate = asFraction(data.winRate);
  const againstTrend = asFraction(data.tradesAgainstTrend);
  const btcRatio = asFraction(data.btcVolumeRatio);
  const hold = Number.isFinite(data.avgHoldSeconds) ? data.avgHoldSeconds : 0;

  if (data.avgLeverage > 15) tags.push('HIGH_LEVERAGE');
  if (hold < 7200) tags.push('SCALPER');
  if (hold >= 86400 && hold <= 604800) tags.push('SWING_TRADER');
  if (hold > 604800) tags.push('DIAMOND_HANDS');
  if (btcRatio > 0.7) tags.push('BTC_MAXI');
  if (againstTrend > 0.6) tags.push('CONTRARIAN');
  if (winRate > 0.7) tags.push('CONSISTENT');
  if (data.totalVolume > 1_000_000) tags.push('HIGH_VOLUME');
  if (data.maxLeverage >= 25) tags.push('RISK_TAKER');
  if (
    data.avgLossHoldSeconds !== undefined &&
    data.avgLossHoldSeconds > 0 &&
    data.avgLossHoldSeconds < 3600
  ) {
    tags.push('LOSS_CUTTER');
  }

  return tags;
}
