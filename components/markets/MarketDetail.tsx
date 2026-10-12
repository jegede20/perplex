'use client';

import { useEffect, useState } from 'react';
import type { MarketDetail as MarketDetailType, TimeRange } from '@/lib/types';
import StatCard from '@/components/ui/StatCard';
import MarketSentimentBar from '@/components/markets/MarketSentimentBar';
import FundingRateChart from '@/components/markets/FundingRateChart';
import LiquidationMap from '@/components/markets/LiquidationMap';
import OrderBookDepth from '@/components/markets/OrderBookDepth';
import TopTradersTable from '@/components/markets/TopTradersTable';
import LiquidationFeed from '@/components/protocol/LiquidationFeed';
import TimeRangeSelector from '@/components/protocol/TimeRangeSelector';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import {
  Activity,
  BarChart3,
  Coins,
  DollarSign,
  Percent,
  Zap,
} from 'lucide-react';
import {
  formatAPR,
  formatFundingRate,
  formatNumber,
  formatPrice,
  formatSignedPercent,
  formatUSD,
} from '@/lib/utils/format';

export interface MarketDetailProps {
  market: MarketDetailType;
  loading?: boolean;
}

/** Full market drill-down: 6 stat cards, charts, liquidation map, book, top traders. */
export default function MarketDetail({ market, loading }: MarketDetailProps) {
  const [range, setRange] = useState<TimeRange>('7D');
  const [detail, setDetail] = useState<MarketDetailType>(market);
  const [rangeLoading, setRangeLoading] = useState(false);

  useEffect(() => {
    setDetail(market);
  }, [market]);

  useEffect(() => {
    let cancelled = false;
    setRangeLoading(true);
    const load = async (): Promise<void> => {
      try {
        const res = await fetch(`/api/market/${market.id}`);
        const data = (await res.json()) as { market?: MarketDetailType };
        if (!cancelled && data.market) setDetail(data.market);
      } catch (error) {
        console.error('[MarketDetail]', error);
      } finally {
        if (!cancelled) setRangeLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  if (loading) return <LoadingSkeleton variant="full" />;

  const basis = detail.markPrice - detail.spotPrice;

  return (
    <div className="space-y-4">
      {/* Row 1: 6 stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Mark Price"
          value={formatPrice(detail.markPrice)}
          change={detail.priceChangePercent24h}
          changeLabel="24h"
          highlight="PURPLE"
          icon={<DollarSign size={15} aria-hidden />}
          tooltip="Current mark price used for PnL and liquidations"
        />
        <StatCard
          label="Spot Price"
          value={formatPrice(detail.spotPrice)}
          subValue={`Basis: ${basis >= 0 ? '+' : ''}${formatPrice(basis)}`}
          icon={<Percent size={15} aria-hidden />}
          tooltip="Underlying index price; basis = mark − spot"
        />
        <StatCard
          label="Open Interest"
          value={formatUSD(detail.openInterest)}
          subValue={`L ${formatUSD(detail.openInterestLong)} · S ${formatUSD(detail.openInterestShort)}`}
          highlight={detail.dominantSide === 'LONG' ? 'LONG' : detail.dominantSide === 'SHORT' ? 'SHORT' : 'NEUTRAL'}
          icon={<Activity size={15} aria-hidden />}
          tooltip="Total open position notional, split by side"
        />
        <StatCard
          label="Funding Rate"
          value={formatFundingRate(detail.fundingRate)}
          subValue={formatAPR(detail.fundingRate)}
          highlight={detail.fundingRate >= 0 ? 'LONG' : 'SHORT'}
          icon={<Percent size={15} aria-hidden />}
          tooltip="Positive = longs pay shorts each 8h interval"
        />
        <StatCard
          label="Volume 24h"
          value={formatUSD(detail.volume24h)}
          subValue={`${formatNumber(detail.trades24h)} trades`}
          icon={<BarChart3 size={15} aria-hidden />}
          tooltip="Total traded notional in the last 24 hours"
        />
        <StatCard
          label="Liquidations 24h"
          value={formatNumber(detail.liquidations24h)}
          subValue={`${formatUSD(detail.recentLiquidations.reduce((s, l) => s + l.size, 0))} flushed`}
          highlight={detail.liquidations24h > 50 ? 'SHORT' : 'NEUTRAL'}
          icon={<Zap size={15} aria-hidden />}
          tooltip="Positions force-closed in this market (24h)"
        />
      </div>

      {/* Row 2: charts + liquidation map */}
      <div className="flex flex-col gap-4 xl:flex-row">
        <div className="flex-1 space-y-4 xl:w-[60%]">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-bold text-textPrimary">Market Charts</h2>
            <TimeRangeSelector value={range} onChange={setRange} options={['24H', '7D', '30D']} />
          </div>
          {rangeLoading ? (
            <LoadingSkeleton variant="chart" />
          ) : (
            <FundingRateChart points={detail.fundingHistory} />
          )}
          <div className="card-surface p-4">
            <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-widest text-textSecondary">
              OI History — Long vs Short
            </h3>
            <OIHistoryChart points={detail.oiHistory} />
          </div>
          <div className="card-surface p-4">
            <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-widest text-textSecondary">
              Volume History
            </h3>
            <VolumeHistoryChart points={detail.volumeHistory} />
          </div>
        </div>
        <div className="space-y-4 xl:w-[40%]">
          <MarketSentimentBar
            longPercent={detail.longPercent}
            shortPercent={detail.shortPercent}
            dominantSide={detail.dominantSide}
          />
          <LiquidationMap
            market={detail.symbol}
            positions={detail.positionsNearLiquidation}
            markPrice={detail.markPrice}
          />
          <OrderBookDepth marketId={detail.id} initialBook={detail.orderBook} />
        </div>
      </div>

      {/* Row 3: top traders + recent liquidations */}
      <div className="flex flex-col gap-4 xl:flex-row">
        <div className="xl:w-[60%]">
          <TopTradersTable
            traders={detail.topTraders}
            positions={detail.positionsNearLiquidation}
            markPrice={detail.markPrice}
          />
        </div>
        <div className="xl:w-[40%]">
          <LiquidationFeed market={detail.symbol} title={`${detail.symbol}-PERP Liquidations`} limit={8} />
        </div>
      </div>

      {/* Sentiment strip */}
      <div className="text-[11px] text-textMuted">
        24h change: <span className={detail.priceChangePercent24h >= 0 ? 'text-success' : 'text-danger'}>
          {formatSignedPercent(detail.priceChangePercent24h)}
        </span>
      </div>
    </div>
  );
}

// ─── local chart subcomponents (kept in-file for cohesion) ─────────

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { OIPoint, VolumePoint } from '@/lib/types';
import { formatChartDate } from '@/lib/utils/format';

function OIHistoryChart({ points }: { points: OIPoint[] }) {
  return (
    <div className="h-[190px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="longOi" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22C55E" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#22C55E" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="shortOi" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EF4444" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#EF4444" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3D" vertical={false} />
          <XAxis dataKey="date" tickFormatter={formatChartDate} tick={{ stroke: '#505070', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#2A2A3D' }} />
          <YAxis tickFormatter={(v: number) => formatUSD(v)} tick={{ stroke: '#505070', fontSize: 10 }} tickLine={false} axisLine={false} width={52} />
          <Tooltip
            contentStyle={{ background: '#1A1A26', border: '1px solid #2A2A3D', borderRadius: 8, fontSize: 11 }}
            formatter={(value: number | string, name: string) => [formatUSD(Number(value)), name === 'longOI' ? 'Long OI' : 'Short OI']}
          />
          <Area type="monotone" dataKey="longOI" stackId="1" stroke="#22C55E" strokeWidth={1.5} fill="url(#longOi)" />
          <Area type="monotone" dataKey="shortOI" stackId="1" stroke="#EF4444" strokeWidth={1.5} fill="url(#shortOi)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function VolumeHistoryChart({ points }: { points: VolumePoint[] }) {
  return (
    <div className="h-[170px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={points} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3D" vertical={false} />
          <XAxis dataKey="date" tickFormatter={formatChartDate} tick={{ stroke: '#505070', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#2A2A3D' }} />
          <YAxis tickFormatter={(v: number) => formatUSD(v)} tick={{ stroke: '#505070', fontSize: 10 }} tickLine={false} axisLine={false} width={52} />
          <Tooltip
            contentStyle={{ background: '#1A1A26', border: '1px solid #2A2A3D', borderRadius: 8, fontSize: 11 }}
            formatter={(value: number | string) => [formatUSD(Number(value)), 'Volume']}
            cursor={{ fill: '#7B5EA730' }}
          />
          <Bar dataKey="volume" fill="#7B5EA7" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
