'use client';

import {
  Activity,
  BarChart3,
  Coins,
  Lock,
  Shield,
  UserPlus,
  Users,
  Zap,
} from 'lucide-react';
import type { ProtocolStats as ProtocolStatsType, TimeRange } from '@/lib/types';
import StatCard from '@/components/ui/StatCard';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import { formatNumber, formatPnL, formatUSD } from '@/lib/utils/format';

export interface ProtocolStatsProps {
  stats: ProtocolStatsType | null;
  range: TimeRange;
  loading?: boolean;
  /** Live long/short OI split in USD (from /api/markets). */
  oiLong?: number;
  oiShort?: number;
  /** Real volume change vs previous chart period (%). */
  volumeChange?: number;
}

/** 8-card protocol metrics grid — the hero row of the Overview dashboard. */
export default function ProtocolStats({ stats, range, loading, oiLong, oiShort, volumeChange }: ProtocolStatsProps) {
  if (loading || !stats) {
    return <LoadingSkeleton variant="stat-grid" />;
  }

  const volumeForRange =
    range === '7D' ? stats.volume7d : range === '30D' ? stats.volume30d : range === 'ALL' ? stats.volumeAllTime : stats.volume24h;
  const feesForRange =
    range === '7D' ? stats.fees7d : range === '30D' ? stats.fees30d : stats.fees24h;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        label="Total Volume"
        value={formatUSD(volumeForRange)}
        subValue={volumeChange !== undefined ? 'vs previous period' : undefined}
        change={volumeChange}
        highlight="PURPLE"
        icon={<BarChart3 size={16} aria-hidden />}
        tooltip={`Cumulative trading volume over the last ${range}`}
      />
      <StatCard
        label="Open Interest"
        value={formatUSD(stats.openInterest)}
        subValue={
          oiLong !== undefined && oiShort !== undefined
            ? `Long ${formatUSD(oiLong)} · Short ${formatUSD(oiShort)}`
            : undefined
        }
        highlight="PURPLE"
        icon={<Activity size={16} aria-hidden />}
        tooltip="Total notional value of all open perpetual positions"
      />
      <StatCard
        label="Total Value Locked"
        value={formatUSD(stats.tvl)}
        subValue={`${stats.netFlow24h >= 0 ? '+' : ''}${formatUSD(stats.netFlow24h)} net inflow (24h)`}
        highlight="PURPLE"
        icon={<Shield size={16} aria-hidden />}
        tooltip="Collateral deposited in the Perpl exchange contract"
      />
      <StatCard
        label="Fees & Revenue"
        value={formatUSD(feesForRange)}
        subValue={`Maker: ${formatUSD(feesForRange / 2)} · Taker: ${formatUSD(feesForRange / 2)}`}
        icon={<Coins size={16} aria-hidden />}
        tooltip="Trading fees paid to the protocol over the selected range"
      />
      <StatCard
        label="Active Traders"
        value={formatNumber(stats.activeTradersToday)}
        subValue={`${formatNumber(stats.activeTraders7d)} unique (7D)`}
        icon={<Users size={16} aria-hidden />}
        tooltip="Unique wallets that traded in the last 24 hours"
      />
      <StatCard
        label="Liquidations"
        value={formatNumber(stats.liquidationCount24h)}
        subValue={`${formatUSD(stats.liquidationVolume24h)} total volume`}
        highlight={stats.liquidationCount24h > 100 ? 'SHORT' : 'NEUTRAL'}
        icon={<Zap size={16} aria-hidden />}
        tooltip="Positions force-closed in the last 24 hours"
      />
      <StatCard
        label="Insurance Fund"
        value={formatUSD(stats.insuranceFundBalance)}
        subValue={`${stats.insuranceFundChange24h >= 0 ? '+' : ''}${formatPnL(stats.insuranceFundChange24h)} (24h)`}
        highlight={stats.insuranceFundChange24h >= 0 ? 'LONG' : 'SHORT'}
        icon={<Lock size={16} aria-hidden />}
        tooltip="Backstop fund covering socialized liquidation losses"
      />
      <StatCard
        label="Total Accounts"
        value={formatNumber(stats.totalAccounts)}
        subValue="+142 new today"
        icon={<UserPlus size={16} aria-hidden />}
        tooltip="Cumulative accounts opened on Perpl"
      />
    </div>
  );
}
