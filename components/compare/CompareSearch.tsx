'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { WalletSummary } from '@/lib/types';
import TierBadge from '@/components/ui/TierBadge';
import { formatAddress, isValidAddress } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

export interface CompareSearchProps {
  initialA?: string;
  initialB?: string;
  loading?: boolean;
}

type FocusedSide = 'A' | 'B';

/**
 * Dual wallet search with VS divider — paste two addresses (or pick
 * from the leaderboard) and launch a head-to-head comparison.
 */
export default function CompareSearch({ initialA, initialB, loading }: CompareSearchProps) {
  const router = useRouter();
  const [addressA, setAddressA] = useState(initialA ?? '');
  const [addressB, setAddressB] = useState(initialB ?? '');
  const [focused, setFocused] = useState<FocusedSide>('A');
  const [touchedA, setTouchedA] = useState(false);
  const [touchedB, setTouchedB] = useState(false);
  const [quickPicks, setQuickPicks] = useState<WalletSummary[]>([]);

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/wallets?limit=5')
      .then((res) => res.json() as Promise<{ wallets?: WalletSummary[] }>)
      .then((json) => {
        if (!cancelled && json.wallets) setQuickPicks(json.wallets);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const invalidA = touchedA && addressA.length > 0 && !isValidAddress(addressA);
  const invalidB = touchedB && addressB.length > 0 && !isValidAddress(addressB);

  const submit = useCallback(
    (event: FormEvent) => {
      event.preventDefault();
      if (!isValidAddress(addressA) || !isValidAddress(addressB)) {
        setTouchedA(true);
        setTouchedB(true);
        return;
      }
      if (addressA.toLowerCase() === addressB.toLowerCase()) return;
      router.push(`/app/compare?a=${addressA.toLowerCase()}&b=${addressB.toLowerCase()}`);
    },
    [addressA, addressB, router]
  );

  const applyQuickPick = useCallback(
    (address: string) => {
      if (focused === 'A') setAddressA(address);
      else setAddressB(address);
    },
    [focused]
  );

  return (
    <div className="card-surface p-6">
      <form onSubmit={submit}>
        <div className="flex flex-col items-stretch gap-4 md:flex-row md:items-center">
          {/* wallet A */}
          <div className="flex-1">
            <label
              htmlFor="compare-a"
              className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-textSecondary"
            >
              Wallet A
            </label>
            <input
              id="compare-a"
              type="text"
              value={addressA}
              placeholder="0x... or paste address"
              onChange={(e) => setAddressA(e.target.value.trim())}
              onFocus={() => setFocused('A')}
              onBlur={() => setTouchedA(true)}
              className={cn(
                'w-full rounded-lg border bg-surface2 px-4 py-3 font-mono text-[13px] text-textPrimary outline-none transition-colors duration-150 placeholder:text-textMuted focus:border-primary',
                invalidA ? 'border-danger' : 'border-border'
              )}
            />
            {invalidA && (
              <p className="mt-1 text-[11px] text-danger">Invalid address</p>
            )}
          </div>

          {/* VS divider */}
          <div className="flex shrink-0 items-center justify-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-primary/50 bg-primary/15 text-[13px] font-black text-primary">
              VS
            </div>
          </div>

          {/* wallet B */}
          <div className="flex-1">
            <label
              htmlFor="compare-b"
              className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-textSecondary"
            >
              Wallet B
            </label>
            <input
              id="compare-b"
              type="text"
              value={addressB}
              placeholder="0x... or paste address"
              onChange={(e) => setAddressB(e.target.value.trim())}
              onFocus={() => setFocused('B')}
              onBlur={() => setTouchedB(true)}
              className={cn(
                'w-full rounded-lg border bg-surface2 px-4 py-3 font-mono text-[13px] text-textPrimary outline-none transition-colors duration-150 placeholder:text-textMuted focus:border-primary',
                invalidB ? 'border-danger' : 'border-border'
              )}
            />
            {invalidB && (
              <p className="mt-1 text-[11px] text-danger">Invalid address</p>
            )}
          </div>
        </div>

        <div className="mt-4 flex justify-center">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-primary px-8 py-3 text-[14px] font-semibold text-white transition-all duration-150 hover:bg-primary/90 disabled:opacity-60"
          >
            {loading ? 'Comparing…' : 'Compare Wallets →'}
          </button>
        </div>
      </form>

      {/* quick picks */}
      <div className="mt-5 border-t border-border pt-4">
        <p className="text-[11px] text-textMuted">
          Or pick from leaderboard{' '}
          <span className="text-textSecondary">
            (fills {focused === 'A' ? 'Wallet A' : 'Wallet B'})
          </span>
          :
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {quickPicks.map((wallet) => (
            <button
              key={wallet.address}
              type="button"
              onClick={() => applyQuickPick(wallet.address)}
              className={cn(
                'flex items-center gap-1.5 rounded-full border border-border bg-surface2 px-3 py-1.5 text-[11px] transition-colors duration-150 hover:border-primary/50 hover:text-primary',
                (focused === 'A' ? addressA : addressB).toLowerCase() === wallet.address.toLowerCase()
                  ? 'border-primary/60 text-primary'
                  : 'text-textSecondary'
              )}
            >
              <TierBadge tier={wallet.tier} size="sm" />
              <span className="font-mono">{formatAddress(wallet.address)}</span>
              <span className="tabular text-textMuted">{wallet.smartMoneyScore}</span>
            </button>
          ))}
          {quickPicks.length === 0 && (
            <p className="text-[11px] text-textMuted">Loading leaderboard…</p>
          )}
        </div>
      </div>
    </div>
  );
}
