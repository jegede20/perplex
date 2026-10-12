// ═══════════════════════════════════════════════════════════════════
// Monad-specific helpers
// ═══════════════════════════════════════════════════════════════════

export const MONAD_CHAIN_ID = Number(process.env.NEXT_PUBLIC_MONAD_CHAIN_ID ?? 143);
export const MONAD_RPC_URL = process.env.NEXT_PUBLIC_MONAD_RPC_URL ?? 'https://rpc.monad.xyz';
export const MONAD_EXPLORER_URL = process.env.NEXT_PUBLIC_EXPLORER_URL ?? 'https://monadexplorer.com';
export const PERPL_EXCHANGE_ADDRESS =
  process.env.NEXT_PUBLIC_PERPL_EXCHANGE_ADDRESS ?? '0x34B6552d57a35a1D042CcAe1951BD1C370112a6F';

/** Monad targets ~500ms blocks. */
export const MONAD_BLOCK_TIME_MS = 500;

/** Explorer URL for a transaction. */
export function monadTxUrl(hash: string): string {
  return `${MONAD_EXPLORER_URL}/tx/${hash}`;
}

/** Explorer URL for an address. */
export function monadAddressUrl(address: string): string {
  return `${MONAD_EXPLORER_URL}/address/${address}`;
}

/**
 * Convert a raw 18-decimal token amount (bigint or decimal string) to a float.
 * Graceful on malformed input.
 */
export function fromWad(value: bigint | string | number, decimals = 18): number {
  try {
    const raw = typeof value === 'bigint' ? value : BigInt(Math.trunc(Number(value)) || 0);
    const denom = 10 ** decimals;
    return Number(raw) / denom;
  } catch {
    return 0;
  }
}

/** Convert a float USD/price amount into an 18-decimal bigint. */
export function toWad(value: number, decimals = 18): bigint {
  try {
    return BigInt(Math.round(value * 10 ** decimals));
  } catch {
    return 0n;
  }
}

/**
 * Approximate blocks elapsed for a duration — used for "N blocks ago" style copy.
 */
export function blocksForDuration(ms: number): number {
  return Math.max(1, Math.round(ms / MONAD_BLOCK_TIME_MS));
}

/** Chain metadata for wallet/network UI pills. */
export function monadNetworkPill(): { name: string; chainId: number; rpc: string } {
  return { name: 'Monad Mainnet', chainId: MONAD_CHAIN_ID, rpc: MONAD_RPC_URL };
}
