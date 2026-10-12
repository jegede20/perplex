'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronRight, Home, Map as MapIcon, RotateCw } from 'lucide-react';
import type { LiquidationMapData, Market } from '@/lib/types';
import { MARKET_SYMBOLS, isMarketSymbol } from '@/lib/perpl/markets';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import TimeRangeTabs from '@/components/ui/TimeRangeTabs';
import LiquidationMapChart from '@/components/liquidation-map/LiquidationMapChart';
import LiquidationMapControls from '@/components/liquidation-map/LiquidationMapControls';
import LiquidationMapStats from '@/components/liquidation-map/LiquidationMapStats';
import PositionCluster from '@/components/liquidation-map/PositionCluster';

const BUCKET_OPTIONS = ['0.25%', '0.5%', '1%', '2%'] as const;

function parseBucket(label: string): number {
  return Number.parseFloat(label.replace('%', ''));
}

function LiquidationMapPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlMarket = searchParams.get('market') ?? '';

  const [market, setMarket] = useState<Market>(
    isMarketSymbol(urlMarket) ? urlMarket : 'BTC'
  );
  const [bucket, setBucket] = useState<string>('0.5%');
  const [data, setData] = useState<LiquidationMapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBucket, setSelectedBucket] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/liquidation-map?market=${market}&bucket=${parseBucket(bucket)}`
      );
      const json = (await res.json()) as LiquidationMapData & { error?: string };
      if (!res.ok || json.error) {
        setError(json.error ?? 'Failed to load liquidation map');
        setData(null);
      } else {
        setData(json);
        setSelectedBucket(null);
      }
    } catch {
      setError('Failed to load liquidation map');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [market, bucket]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectMarket = useCallback(
    (next: Market) => {
      setMarket(next);
      router.replace(`${pathname}?market=${next}`);
    },
    [pathname, router]
  );

  return (
    <div className="space-y-5">
      {/* breadcrumb */}
      <nav className="flex items-center gap-1.5 text-[12px] text-textMuted" aria-label="Breadcrumb">
        <Link href="/app" className="flex items-center gap-1 transition-colors duration-150 hover:text-primary">
          <Home size={12} aria-hidden /> App
        </Link>
        <ChevronRight size={12} aria-hidden />
        <span className="text-textSecondary">Liquidation Map</span>
      </nav>

      {/* title + controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-[24px] font-bold text-white">
            <MapIcon size={22} className="text-primary" aria-hidden />
            Liquidation Map
          </h1>
          <p className="mt-1 text-[13px] text-textMuted">See where the market breaks</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-textMuted">
              Market
            </p>
            <TimeRangeTabs<Market> value={market} onChange={selectMarket} options={MARKET_SYMBOLS} />
          </div>
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-textMuted">
              Bucket Size
            </p>
            <TimeRangeTabs<string> value={bucket} onChange={setBucket} options={BUCKET_OPTIONS} />
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface2 text-textSecondary transition-colors duration-150 hover:border-primary/40 hover:text-primary"
            aria-label="Refresh liquidation map"
          >
            <RotateCw size={15} aria-hidden />
          </button>
        </div>
      </div>

      {/* content */}
      {loading && (
        <div className="space-y-4">
          <LoadingSkeleton variant="stat-grid" className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" />
          <LoadingSkeleton variant="chart" className="h-[440px]" />
          <LoadingSkeleton variant="card" rows={4} />
        </div>
      )}

      {!loading && error && (
        <div className="card-surface flex flex-col items-center gap-3 p-10 text-center">
          <p className="text-[14px] font-semibold text-textPrimary">Unable to load the liquidation map</p>
          <p className="text-[12px] text-textMuted">{error}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg bg-primary px-5 py-2 text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && data && (
        <>
          <LiquidationMapStats data={data} />

          <div className="card-surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[13px] font-semibold uppercase tracking-widest text-textSecondary">
                {data.market} Liquidation Heatmap
              </h2>
              <p className="text-[11px] text-textMuted">
                {data.clusters.length} clusters · generated live
              </p>
            </div>
            <LiquidationMapChart
              data={data}
              selectedBucket={selectedBucket}
              onSelectCluster={setSelectedBucket}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <LiquidationMapControls data={data} />
            </div>
            <div className="lg:col-span-2">
              <PositionCluster
                data={data}
                selectedBucket={selectedBucket}
                onSelect={setSelectedBucket}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * LIQUIDATION MAP — cluster every open position by liquidation price.
 * Where does a wave of liquidations trigger? Route: /app/liquidation-map
 */
export default function LiquidationMapPage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingSkeleton variant="full" />}>
        <LiquidationMapPageInner />
      </Suspense>
    </ErrorBoundary>
  );
}
