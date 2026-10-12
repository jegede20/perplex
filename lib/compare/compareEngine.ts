/**
 * Perplex — wallet comparison engine.
 *
 * Puts two smart-money wallets head-to-head across 10 metrics, decides
 * a winner per metric and overall, and normalizes everything to 0-100
 * for the radar chart. Pure functions — tested in
 * tests/compareEngine.test.ts.
 */
import type {
  ComparisonMetric,
  ComparisonMetrics,
  ComparisonWinner,
  RadarDataPoint,
  WalletComparison,
  WalletProfile,
} from '@/lib/types';
import { formatDuration, formatPnL, formatPercent, formatUSD, formatLeverage, isValidAddress } from '@/lib/utils/format';

// ─── validation ────────────────────────────────────────────────────

/**
 * Address-level request validation shared by the API route and tests.
 * Returns an error message, or null when the pair is comparable.
 */
export function validateComparisonAddresses(
  addressA: string,
  addressB: string
): string | null {
  if (!isValidAddress(addressA) || !isValidAddress(addressB)) {
    return 'Invalid wallet address';
  }
  if (addressA.toLowerCase() === addressB.toLowerCase()) {
    return 'Cannot compare a wallet with itself';
  }
  return null;
}

// ─── normalization ─────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Convert a raw metric value to a 0-100 radar scale.
 * Each metric has its own min/max normalization; risk metrics are
 * inverted (lower drawdown/leverage → higher radar score).
 */
export function normalizeForRadar(value: number, metric: string): number {
  switch (metric) {
    case 'winRate':
      return clamp(value, 0, 100);
    case 'smartMoneyScore':
      return clamp(value, 0, 100);
    case 'profitFactor':
      return clamp(value / 5, 0, 1) * 100;
    case 'realizedPnl':
      return clamp(value / 100000, 0, 1) * 100;
    case 'totalVolume':
      return clamp(value / 1000000, 0, 1) * 100;
    case 'maxDrawdown':
      return 100 - clamp(value, 0, 100);
    case 'avgLeverage':
      return 100 - clamp((value / 30) * 100, 0, 100);
    case 'totalTrades':
      return clamp(value / 300, 0, 1) * 100;
    case 'avgHoldTime':
      return clamp(value / (7 * 24 * 3600), 0, 1) * 100;
    case 'longestWinStreak':
      return clamp(value / 15, 0, 1) * 100;
    default:
      return clamp(value, 0, 100);
  }
}

// ─── metric construction ───────────────────────────────────────────

function winnerOf(valueA: number, valueB: number, higherIsBetter: boolean): 'A' | 'B' | 'TIE' {
  if (valueA === valueB) return 'TIE';
  const aWins = higherIsBetter ? valueA > valueB : valueA < valueB;
  return aWins ? 'A' : 'B';
}

function advantageOf(valueA: number, valueB: number): number {
  return Math.abs(valueA - valueB);
}

interface MetricSpec {
  key: keyof ComparisonMetrics;
  label: string;
  higherIsBetter: boolean;
  raw: (w: WalletProfile) => number;
  format: (value: number) => string;
  advantageText: (advantage: number) => string;
}

const METRIC_SPECS: MetricSpec[] = [
  {
    key: 'winRate',
    label: 'Win Rate',
    higherIsBetter: true,
    raw: (w) => w.winRate,
    format: (v) => formatPercent(v / 100),
    advantageText: (v) => `${Math.round(v)} points`,
  },
  {
    key: 'realizedPnl',
    label: 'PnL (realized)',
    higherIsBetter: true,
    raw: (w) => w.realizedPnl,
    format: (v) => formatPnL(v),
    advantageText: (v) => formatUSD(v),
  },
  {
    key: 'totalVolume',
    label: 'Volume',
    higherIsBetter: true,
    raw: (w) => w.totalVolume,
    format: (v) => formatUSD(v),
    advantageText: (v) => formatUSD(v),
  },
  {
    key: 'avgLeverage',
    label: 'Avg Leverage',
    higherIsBetter: false,
    raw: (w) => w.avgLeverage,
    format: (v) => formatLeverage(v),
    advantageText: (v) => `${v.toFixed(1)}x less`,
  },
  {
    key: 'smartMoneyScore',
    label: 'Score',
    higherIsBetter: true,
    raw: (w) => w.smartMoneyScore,
    format: (v) => String(Math.round(v)),
    advantageText: (v) => `${Math.round(v)} points`,
  },
  {
    key: 'profitFactor',
    label: 'Profit Factor',
    higherIsBetter: true,
    raw: (w) => w.profitFactor,
    format: (v) => v.toFixed(2),
    advantageText: (v) => v.toFixed(2),
  },
  {
    key: 'maxDrawdown',
    label: 'Max Drawdown',
    higherIsBetter: false,
    raw: (w) => w.maxDrawdown,
    format: (v) => formatPercent(-v / 100),
    advantageText: (v) => `${Math.round(v)} points less`,
  },
  {
    key: 'totalTrades',
    label: 'Total Trades',
    higherIsBetter: true,
    raw: (w) => w.totalTrades,
    format: (v) => String(Math.round(v)),
    advantageText: (v) => `${Math.round(v)} trades`,
  },
  {
    key: 'avgHoldTime',
    label: 'Avg Hold',
    higherIsBetter: true,
    raw: (w) => w.avgHoldSeconds,
    format: (v) => formatDuration(v),
    advantageText: (v) => formatDuration(v),
  },
  {
    key: 'longestWinStreak',
    label: 'Win Streak',
    higherIsBetter: true,
    raw: (w) => w.longestWinStreak,
    format: (v) => String(Math.round(v)),
    advantageText: (v) => `${Math.round(v)} wins`,
  },
];

// ─── core ──────────────────────────────────────────────────────────

/**
 * Full head-to-head comparison of two wallet profiles.
 *
 * Winner per metric: higher is better, except maxDrawdown and
 * avgLeverage where LOWER wins. Overall winner = most metrics won.
 */
export function compareWallets(
  walletA: WalletProfile,
  walletB: WalletProfile
): WalletComparison {
  const metrics = {} as ComparisonMetrics;

  for (const spec of METRIC_SPECS) {
    const valueA = spec.raw(walletA);
    const valueB = spec.raw(walletB);
    metrics[spec.key] = {
      label: spec.label,
      valueA,
      valueB,
      formattedA: spec.format(valueA),
      formattedB: spec.format(valueB),
      winner: winnerOf(valueA, valueB, spec.higherIsBetter),
      advantage: advantageOf(valueA, valueB),
      higherIsBetter: spec.higherIsBetter,
    };
  }

  let metricsWonA = 0;
  let metricsWonB = 0;
  for (const spec of METRIC_SPECS) {
    const result = metrics[spec.key].winner;
    if (result === 'A') metricsWonA += 1;
    else if (result === 'B') metricsWonB += 1;
  }

  const winnerSide: 'A' | 'B' | 'TIE' =
    metricsWonA > metricsWonB ? 'A' : metricsWonB > metricsWonA ? 'B' : 'TIE';

  // key advantage: the winner's largest relative edge
  const winnerScore = normalizeForRadar;
  let bestSpec: MetricSpec | null = null;
  let bestGap = -Infinity;
  for (const spec of METRIC_SPECS) {
    const m = metrics[spec.key];
    if (m.winner !== winnerSide || winnerSide === 'TIE') continue;
    const gap = Math.abs(
      winnerScore(Number(m.valueA), spec.key) - winnerScore(Number(m.valueB), spec.key)
    );
    if (gap > bestGap) {
      bestGap = gap;
      bestSpec = spec;
    }
  }

  let keyAdvantage = 'Evenly matched across all metrics';
  if (bestSpec) {
    const m = metrics[bestSpec.key];
    const direction = bestSpec.higherIsBetter ? 'Higher' : 'Lower';
    keyAdvantage = `${direction} ${bestSpec.label} by ${bestSpec.advantageText(m.advantage)}`;
  }

  const winnerAddress =
    winnerSide === 'A' ? walletA.address : winnerSide === 'B' ? walletB.address : '';

  const winner: ComparisonWinner = {
    winner: winnerSide,
    walletAddress: winnerAddress,
    metricsWon: Math.max(metricsWonA, metricsWonB),
    metricsLost: Math.min(metricsWonA, metricsWonB),
    verdict:
      winnerSide === 'A'
        ? 'Wallet A outperforms across most metrics'
        : winnerSide === 'B'
          ? 'Wallet B has the stronger track record'
          : 'Both wallets show comparable performance',
    keyAdvantage,
  };

  const radarData: RadarDataPoint[] = [
    {
      metric: 'Win Rate',
      valueA: normalizeForRadar(walletA.winRate, 'winRate'),
      valueB: normalizeForRadar(walletB.winRate, 'winRate'),
    },
    {
      metric: 'PnL',
      valueA: normalizeForRadar(walletA.realizedPnl, 'realizedPnl'),
      valueB: normalizeForRadar(walletB.realizedPnl, 'realizedPnl'),
    },
    {
      metric: 'Volume',
      valueA: normalizeForRadar(walletA.totalVolume, 'totalVolume'),
      valueB: normalizeForRadar(walletB.totalVolume, 'totalVolume'),
    },
    {
      metric: 'Score',
      valueA: normalizeForRadar(walletA.smartMoneyScore, 'smartMoneyScore'),
      valueB: normalizeForRadar(walletB.smartMoneyScore, 'smartMoneyScore'),
    },
    {
      metric: 'Profit Factor',
      valueA: normalizeForRadar(walletA.profitFactor, 'profitFactor'),
      valueB: normalizeForRadar(walletB.profitFactor, 'profitFactor'),
    },
    {
      metric: 'Risk Control',
      valueA:
        (normalizeForRadar(walletA.maxDrawdown, 'maxDrawdown') +
          normalizeForRadar(walletA.avgLeverage, 'avgLeverage')) /
        2,
      valueB:
        (normalizeForRadar(walletB.maxDrawdown, 'maxDrawdown') +
          normalizeForRadar(walletB.avgLeverage, 'avgLeverage')) /
        2,
    },
  ];

  return {
    walletA,
    walletB,
    metrics,
    winner,
    radarData,
    pnlHistoryA: [],
    pnlHistoryB: [],
  };
}

/** Radar area sum — used to badge the dominating wallet. */
export function radarArea(points: RadarDataPoint[], side: 'A' | 'B'): number {
  return points.reduce((sum, p) => sum + (side === 'A' ? p.valueA : p.valueB), 0);
}
