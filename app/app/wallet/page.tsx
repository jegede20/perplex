'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Trophy } from 'lucide-react';
import WalletSearch from '@/components/wallet/WalletSearch';
import Leaderboard from '@/components/leaderboard/Leaderboard';
import ErrorBoundary from '@/components/ui/ErrorBoundary';

/**
 * WALLET SEARCH — address lookup landing + full smart money leaderboard.
 */
export default function WalletSearchPage() {
  const router = useRouter();
  const [copied, setCopied] = useState<string | null>(null);

  const handleSearch = useCallback(
    (address: string) => {
      router.push(`/app/wallet/${address}`);
    },
    [router]
  );

  const handleCopyAddress = useCallback((address: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(address).then(() => {
        setCopied(address);
        setTimeout(() => setCopied(null), 1600);
      });
    }
  }, []);

  return (
    <ErrorBoundary label="Wallet Search">
      <div className="space-y-8">
        {/* Hero search */}
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 pb-4 pt-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20 text-primary">
            <Search size={26} aria-hidden />
          </div>
          <h1 className="text-center text-page text-textPrimary">Wallet Intelligence</h1>
          <p className="text-center text-[13px] text-textSecondary">
            Enter any wallet address (0x...) to unlock its full Perpl profile:
            Smart Money Score, PnL curve, risk metrics, and live positions.
          </p>
          <div className="w-full">
            <WalletSearch onSearch={handleSearch} large />
          </div>
          <p className="text-[11px] text-textMuted">
            Example: paste any address that has traded on Perpl — or browse the leaderboard below.
          </p>
        </div>

        {/* Leaderboard */}
        <section>
          <h2 className="mb-2 flex items-center gap-2 text-section text-textSecondary">
            <Trophy size={15} className="text-primary" aria-hidden /> Or browse the leaderboard
          </h2>
          <Leaderboard limit={10} showViewAll={false} onCopyAddress={handleCopyAddress} />
          {copied && (
            <p className="mt-2 text-[11px] text-success" role="status">
              ✓ Address copied to clipboard
            </p>
          )}
        </section>
      </div>
    </ErrorBoundary>
  );
}
