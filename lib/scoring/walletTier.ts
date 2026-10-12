import type { WalletTier } from '@/lib/types';
import {
  SCORE_WHALE_MIN,
  SCORE_SHARK_MIN,
  VOLUME_WHALE_MIN,
  VOLUME_SHARK_MIN,
} from '@/lib/utils/constants';

// ═══════════════════════════════════════════════════════════════════
// Tier classification
//   🐋 WHALE → score ≥ 75  AND volume ≥ $500K
//   🦈 SHARK → score ≥ 50  OR  volume ≥ $100K
//   🐟 FISH  → everything else
// ═══════════════════════════════════════════════════════════════════

export function classifyTier(score: number, volume: number): WalletTier {
  const safeScore = Number.isFinite(score) ? score : 0;
  const safeVolume = Number.isFinite(volume) ? volume : 0;

  if (safeScore >= SCORE_WHALE_MIN && safeVolume >= VOLUME_WHALE_MIN) {
    return 'WHALE';
  }
  if (safeScore >= SCORE_SHARK_MIN || safeVolume >= VOLUME_SHARK_MIN) {
    return 'SHARK';
  }
  return 'FISH';
}
