'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronRight, GitCompareArrows, Home, Link2, Share2 } from 'lucide-react';
import type { WalletComparison } from '@/lib/types';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import CompareSearch from '@/components/compare/CompareSearch';
import CompareHeader from '@/components/compare/CompareHeader';
import CompareWinner from '@/components/compare/CompareWinner';
import CompareStats from '@/components/compare/CompareStats';
import ComparePnLChart from '@/components/compare/ComparePnLChart';
import CompareRadar from '@/components/compare/CompareRadar';
import CompareTradeStyle from '@/components/compare/CompareTradeStyle';
import ComparePositions from '@/components/compare/ComparePositions';
import DemoDataBadge from '@/components/ui/DemoDataBadge';

function ComparePageInner() {
  const searchParams = useSearchParams();
  const walletA = (searchParams.get('a') ?? '').toLowerCase();
  const walletB = (searchParams.get('b') ?? '').toLowerCase();

  const [comparison, setComparison] = useState<WalletComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const bothPresent = walletA.length > 0 && walletB.length > 0;

  const load = useCallback(async () => {
    if (!bothPresent) {
      setComparison(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/compare?walletA=${walletA}&walletB=${walletB}`);
      const json = (await res.json()) as WalletComparison & { error?: string };
      if (!res.ok || json.error) {
        setError(json.error ?? 'Failed to compare wallets');
        setComparison(null);
      } else {
        setComparison(json);
      }
    } catch {
      setError('Failed to compare wallets');
      setComparison(null);
    } finally {
      setLoading(false);
    }
  }, [walletA, walletB, bothPresent]);

  useEffect(() => {
    void load();
  }, [load]);

  const share = useCallback(() => {
    void navigator.clipboard?.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  }, []);

  return (
    <div className="space-y-5">
      {/* breadcrumb */}
      <nav className="flex items-center gap-1.5 text-[12px] text-textMuted" aria-label="Breadcrumb">
        <Link href="/app" className="flex items-center gap-1 transition-colors duration-150 hover:text-primary">
          <Home size={12} aria-hidden /> App
        </Link>
        <ChevronRight size={12} aria-hidden />
        <span className="text-textSecondary">Compare</span>
      </nav>

      {/* title */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-[24px] font-bold text-white">
            <GitCompareArrows size={22} className="text-primary" aria-hidden />
            Compare Wallets
            {comparison && comparison.dataSource !== 'live' && <DemoDataBadge />}
          </h1>
          <p className="mt-1 text-[13px] text-textMuted">
            Put two smart money wallets head-to-head
          </p>
        </div>
        <button
          type="button"
          onClick={share}
          className="flex items-center gap-2 rounded-lg border border-border bg-surface2 px-4 py-2 text-[12px] font-medium text-textSecondary transition-colors duration-150 hover:border-primary/40 hover:text-primary"
        >
          {copied ? <Link2 size={14} aria-hidden /> : <Share2 size={14} aria-hidden />}
          {copied ? 'Link Copied!' : 'Share Comparison'}
        </button>
      </div>

      {/* search */}
      <CompareSearch initialA={walletA} initialB={walletB} loading={loading} />

      {/* error */}
      {!loading && error && (
        <div className="card-surface flex flex-col items-center gap-3 p-10 text-center">
          <p className="text-[14px] font-semibold text-textPrimary">Unable to compare these wallets</p>
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

      {/* loading */}
      {loading && (
        <div className="space-y-4">
          <LoadingSkeleton variant="card" rows={3} className="h-[180px]" />
          <LoadingSkeleton variant="card" rows={2} className="h-[120px]" />
          <LoadingSkeleton variant="chart" />
        </div>
      )}

      {/* empty prompt */}
      {!bothPresent && !loading && (
        <div className="card-surface flex flex-col items-center gap-2 p-12 text-center">
          <GitCompareArrows size={28} className="text-textMuted" aria-hidden />
          <p className="text-[14px] font-semibold text-textPrimary">
            Enter two wallet addresses to compare
          </p>
          <p className="max-w-md text-[12px] text-textMuted">
            Paste any two Perpl wallet addresses above — or pick from the leaderboard
            quick-select — then hit Compare Wallets. Results are bookmarkable via the URL.
          </p>
        </div>
      )}

      {/* results */}
      {!loading && !error && comparison && bothPresent && (
        <>
          <CompareHeader walletA={comparison.walletA} walletB={comparison.walletB} />
          <CompareWinner
            winner={comparison.winner}
            walletA={comparison.walletA}
            walletB={comparison.walletB}
          />
          <CompareStats
            metrics={comparison.metrics}
            walletA={comparison.walletA}
            walletB={comparison.walletB}
          />
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <ComparePnLChart
              pnlA={comparison.pnlHistoryA}
              pnlB={comparison.pnlHistoryB}
              walletA={comparison.walletA}
              walletB={comparison.walletB}
            />
            <CompareRadar
              data={comparison.radarData}
              walletA={comparison.walletA}
              walletB={comparison.walletB}
            />
          </div>
          <CompareTradeStyle walletA={comparison.walletA} walletB={comparison.walletB} />
          <ComparePositions walletA={comparison.walletA} walletB={comparison.walletB} />
        </>
      )}
    </div>
  );
}

/**
 * COMPARE WALLETS — head-to-head smart money analysis.
 * URL state: /app/compare?a=0x..&b=0x.. (bookmarkable/shareable).
 */
export default function ComparePage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingSkeleton variant="full" />}>
        <ComparePageInner />
      </Suspense>
    </ErrorBoundary>
  );
}
