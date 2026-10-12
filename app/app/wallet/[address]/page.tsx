'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ChevronRight, Home, Search } from 'lucide-react';
import type {
  PnLPoint,
  Trade,
  WalletDetailResponse,
  WalletFlow,
  WalletProfile,
} from '@/lib/types';
import WalletSearch from '@/components/wallet/WalletSearch';
import WalletIdentity from '@/components/wallet/WalletIdentity';
import PnLChart from '@/components/wallet/PnLChart';
import RiskMetrics from '@/components/wallet/RiskMetrics';
import OpenPositions from '@/components/wallet/OpenPositions';
import TradeHistory from '@/components/wallet/TradeHistory';
import WalletFlows from '@/components/wallet/WalletFlows';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import { isValidAddress } from '@/lib/utils/format';

/**
 * WALLET EXPLORER — deepest layer of the drill-down.
 * Protocol → Market → [THIS PAGE]: identity, PnL curve, risk metrics,
 * live positions (uPnL + liq price), trade history, capital flows.
 */
export default function WalletExplorerPage() {
  const params = useParams<{ address: string }>();
  const router = useRouter();
  const rawAddress = params?.address ?? '';
  const valid = isValidAddress(rawAddress);

  const [wallet, setWallet] = useState<WalletProfile | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [pnlHistory, setPnlHistory] = useState<PnLPoint[]>([]);
  const [flows, setFlows] = useState<WalletFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!valid) {
      setLoading(false);
      setError('Invalid wallet address format');
      return;
    }
    let cancelled = false;
    const load = async (): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/wallet/${rawAddress.toLowerCase()}`);
        const data = (await res.json()) as WalletDetailResponse & { error?: string; flows?: WalletFlow[] };
        if (!cancelled) {
          if (data.wallet) {
            setWallet(data.wallet);
            setTrades(data.trades ?? []);
            setPnlHistory(data.pnlHistory ?? []);
            setFlows(data.flows ?? []);
          } else {
            setError(data.error ?? 'Wallet not found');
          }
        }
      } catch (e) {
        console.error('[WalletExplorer]', e);
        if (!cancelled) setError('Failed to load wallet profile');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [rawAddress, valid]);

  const handleSearch = useCallback(
    (address: string) => {
      router.push(`/app/wallet/${address}`);
    },
    [router]
  );

  return (
    <ErrorBoundary label="Wallet Explorer">
      <div className="space-y-4">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[11px] text-textMuted">
          <Link href="/app" className="flex items-center gap-1 transition-colors duration-150 hover:text-primary">
            <Home size={11} aria-hidden /> Home
          </Link>
          <ChevronRight size={11} aria-hidden />
          <Link href="/app/wallet" className="transition-colors duration-150 hover:text-primary">
            Wallets
          </Link>
          <ChevronRight size={11} aria-hidden />
          <span className="tabular font-semibold text-textPrimary">
            {rawAddress ? `${rawAddress.slice(0, 8)}…${rawAddress.slice(-6)}` : '—'}
          </span>
        </nav>

        {/* Search bar to inspect another wallet */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <WalletSearch onSearch={handleSearch} placeholder="Inspect another wallet (0x...)" />
          </div>
          <Link
            href="/app/wallet"
            aria-label="Wallet search home"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-textSecondary transition-colors duration-150 hover:border-primary hover:text-primary"
          >
            <Search size={15} aria-hidden />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-4">
            <LoadingSkeleton />
            <LoadingSkeleton variant="chart" />
            <LoadingSkeleton variant="table" />
          </div>
        ) : error || !wallet ? (
          <div className="card-surface flex flex-col items-center justify-center gap-2 p-12 text-center">
            <p className="text-[15px] font-semibold text-textPrimary">
              {error ?? 'Wallet not found'}
            </p>
            <p className="text-[12px] text-textMuted">
              Expected format: 0x followed by 40 hexadecimal characters.
            </p>
            <Link
              href="/app/wallet"
              className="mt-2 rounded-lg bg-primary px-4 py-2 text-[12px] font-semibold text-white transition-opacity duration-150 hover:opacity-90"
            >
              Search wallets
            </Link>
          </div>
        ) : (
          <>
            {/* Row 1: identity (35%) + PnL chart (65%) */}
            <div className="flex flex-col gap-4 xl:flex-row">
              <div className="xl:w-[35%]">
                <WalletIdentity wallet={wallet} percentile={Math.max(1, Math.min(50, Math.round((100 - wallet.smartMoneyScore) / 1.6)))} />
                <Link
                  href={`/app/compare?a=${wallet.address}`}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-primary/50 bg-primary/10 px-4 py-2.5 text-[13px] font-semibold text-primary transition-all duration-150 hover:bg-primary/20 hover:text-white"
                >
                  Compare with another wallet →
                </Link>
              </div>
              <div className="xl:w-[65%]">
                <PnLChart points={pnlHistory} />
              </div>
            </div>

            {/* Row 2: risk metrics (35%) + open positions (65%) */}
            <div className="flex flex-col gap-4 xl:flex-row">
              <div className="xl:w-[35%]">
                <RiskMetrics wallet={wallet} />
              </div>
              <div className="xl:w-[65%]">
                <OpenPositions positions={wallet.openPositions} walletAddress={wallet.address} />
              </div>
            </div>

            {/* Row 3: trade history */}
            <TradeHistory trades={trades} />

            {/* Row 4: wallet flows */}
            <WalletFlows flows={flows} />
          </>
        )}
      </div>
    </ErrorBoundary>
  );
}
