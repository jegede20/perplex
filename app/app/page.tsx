'use client';

import { useCallback, useEffect, useState } from 'react';
import type {
  MarketSummary,
  NetFlowPoint,
  ProtocolChartPoint,
  ProtocolStats as ProtocolStatsType,
  TimeRange,
} from '@/lib/types';
import ProtocolStats from '@/components/protocol/ProtocolStats';
import ProtocolCharts from '@/components/protocol/ProtocolCharts';
import NetFlows from '@/components/protocol/NetFlows';
import InsuranceFund from '@/components/protocol/InsuranceFund';
import LiquidationFeed from '@/components/protocol/LiquidationFeed';
import MarketsTable from '@/components/protocol/MarketsTable';
import TimeRangeSelector from '@/components/protocol/TimeRangeSelector';
import LiveFeedPanel from '@/components/feed/LiveFeedPanel';
import Leaderboard from '@/components/leaderboard/Leaderboard';
import SentimentMiniWidget from '@/components/sentiment/SentimentMiniWidget';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import LiveDot from '@/components/ui/LiveDot';

interface ProtocolResponse {
  stats: ProtocolStatsType;
  chart: ProtocolChartPoint[];
  flows: NetFlowPoint[];
  range: TimeRange;
}

/**
 * HOME — Protocol Overview dashboard.
 * Protocol-level analytics: volume, OI, TVL, fees, liquidations,
 * insurance fund, active traders, net flows + markets + smart money.
 */
export default function HomePage() {
  const [range, setRange] = useState<TimeRange>('24H');
  const [data, setData] = useState<ProtocolResponse | null>(null);
  const [markets, setMarkets] = useState<MarketSummary[] | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [protocolRes, marketsRes] = await Promise.all([
        fetch(`/api/protocol?range=${range}`),
        fetch('/api/markets'),
      ]);
      const json = (await protocolRes.json()) as ProtocolResponse;
      const marketsJson = (await marketsRes.json()) as { markets?: MarketSummary[] };
      setData(json);
      if (marketsJson.markets) setMarkets(marketsJson.markets);
    } catch (error) {
      console.error('[HomePage]', error);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ErrorBoundary label="Protocol Overview">
      <div className="space-y-4">
        {/* Row 1: header + time range */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-page text-textPrimary">Protocol Overview</h1>
            <p className="flex items-center gap-1.5 text-[12px] text-textMuted">
              <LiveDot /> Perpl on Monad · live on-chain analytics
              {data?.stats.lastUpdated && (
                <span className="hidden sm:inline">
                  · updated {new Date(data.stats.lastUpdated).toLocaleTimeString('en-US')}
                </span>
              )}
            </p>
          </div>
          <TimeRangeSelector value={range} onChange={setRange} />
        </div>

        {/* Row 2: 8 protocol stat cards */}
        <ProtocolStats
          stats={data?.stats ?? null}
          range={range}
          loading={loading}
          oiLong={markets ? markets.reduce((s, m) => s + m.openInterestLong, 0) : undefined}
          oiShort={markets ? markets.reduce((s, m) => s + m.openInterestShort, 0) : undefined}
          volumeChange={
            data && data.chart.length >= 2
              ? (() => {
                  const prev = data.chart[data.chart.length - 2].volume;
                  const last = data.chart[data.chart.length - 1].volume;
                  return prev > 0 ? ((last - prev) / prev) * 100 : undefined;
                })()
              : undefined
          }
        />

        {/* Row 2.5: whale sentiment teaser */}
        <SentimentMiniWidget />

        {/* Row 3: charts (65%) + live feed (35%) */}
        <div className="flex flex-col gap-4 xl:flex-row">
          <div className="space-y-4 xl:w-[65%]">
            <ProtocolCharts points={data?.chart ?? []} range={range} loading={loading} />
            <NetFlows points={data?.flows ?? []} loading={loading} />
            <div className="grid gap-4 lg:grid-cols-2">
              <InsuranceFund stats={data?.stats ?? null} />
              <LiquidationFeed limit={8} title="Protocol Liquidations" />
            </div>
          </div>
          <div className="xl:w-[35%]">
            <LiveFeedPanel />
          </div>
        </div>

        {/* Row 4: markets table */}
        <section>
          <h2 className="mb-2 text-section text-textSecondary">Markets</h2>
          <MarketsTable markets={markets} loading={loading && markets === null} />
        </section>

        {/* Row 5: smart money leaderboard */}
        <section>
          <h2 className="mb-2 text-section text-textSecondary">Smart Money</h2>
          <Leaderboard limit={10} />
        </section>
      </div>
    </ErrorBoundary>
  );
}
