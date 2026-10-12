'use client';

import { useCallback, useEffect, useState } from 'react';
import { getCurrentBlockNumber, watchNewBlocks } from '@/lib/perpl/contracts';

/**
 * React hook: live Monad block number for Navbar/Footer.
 * Updates every ~500ms while the chain advances (500ms Monad blocks).
 * Client-only — contract reads themselves stay server-safe in contracts.ts.
 */
export function useLiveBlockNumber(): bigint {
  const [block, setBlock] = useState<bigint>(0n);

  const handleBlock = useCallback((next: bigint) => {
    setBlock((prev) => (next > prev ? next : prev));
  }, []);

  useEffect(() => {
    let cancelled = false;
    void getCurrentBlockNumber().then((b) => {
      if (!cancelled && b > 0n) setBlock(b);
    });
    const cleanup = watchNewBlocks(handleBlock);
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [handleBlock]);

  return block;
}
