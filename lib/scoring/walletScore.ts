import type { WalletData, WalletProfile } from '@/lib/types';
import { clamp } from '@/lib/utils/format';

// ═══════════════════════════════════════════════════════════════════
// Smart Money Score — proprietary 0–100 wallet quality algorithm
//
//   winRateScore     = (winRate / 100) × 40     max 40 pts
//   pnlScore         = min(realizedPnl / 10000, 1) × 30   max 30 pts
//   volumeScore      = min(totalVolume / 500000, 1) × 15  max 15 pts
//   consistencyScore = (longestWinStreak / max(totalTrades, 1)) × 15   max 15 pts
//
//   TOTAL = round(clamp(sum, 0, 100))
// ═══════════════════════════════════════════════════════════════════

/** Accept win rates expressed as 0–1 or 0–100 and normalize to 0–100. */
function normalizeWinRate(winRate: number): number {
  if (!Number.isFinite(winRate)) return 0;
  return winRate <= 1 ? winRate * 100 : winRate;
}

/**
 * Calculate the Smart Money Score (0–100) for a wallet.
 * Components: win rate 40pts · PnL 30pts · volume 15pts · consistency 15pts.
 */
export function calculateSmartMoneyScore(wallet: WalletData): number {
  const winRate = normalizeWinRate(wallet.winRate);

  const winRateScore = (winRate / 100) * 40;
  const pnlScore = Math.min(wallet.realizedPnl / 10000, 1) * 30;
  const volumeScore = Math.min(wallet.totalVolume / 500000, 1) * 15;
  const consistencyScore =
    (wallet.longestWinStreak / Math.max(wallet.totalTrades, 1)) * 15;

  const total = winRateScore + pnlScore + volumeScore + consistencyScore;
  return Math.round(clamp(total, 0, 100));
}

/**
 * Rank wallets by Smart Money Score (desc). Ties break on realized PnL (desc).
 * Assigns the `.rank` field (1-based) and returns a new sorted array.
 */
export function rankWallets(wallets: WalletProfile[]): WalletProfile[] {
  return [...wallets]
    .sort((a, b) => {
      if (b.smartMoneyScore !== a.smartMoneyScore) {
        return b.smartMoneyScore - a.smartMoneyScore;
      }
      return b.realizedPnl - a.realizedPnl;
    })
    .map((wallet, index) => ({ ...wallet, rank: index + 1 }));
}
