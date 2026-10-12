// ═══════════════════════════════════════════════════════════════════
// Formatting utilities — every user-facing number flows through here
// ═══════════════════════════════════════════════════════════════════

/**
 * Truncate a wallet address for display: 0x1234567890abcdef → 0x1234...cdef
 */
export function formatAddress(address: string): string {
  if (!address) return '';
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Format a USD value. Compact by default: 1234567 → "$1.2M", 142400 → "$142.4K".
 * compact=false → "$1,234,567"
 */
export function formatUSD(value: number, compact = true): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '$0';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (!compact) {
    return `${sign}$${abs.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  }
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

/**
 * Format a PnL value with explicit sign: 50000 → "+$50.0K", -12000 → "-$12.0K", 0 → "$0"
 */
export function formatPnL(value: number): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '$0';
  if (value === 0) return '$0';
  const formatted = formatUSD(Math.abs(value));
  return value > 0 ? `+${formatted}` : `-${formatted}`;
}

/**
 * Format a fraction as a percent: 0.7845 → "78.5%", -0.234 → "-23.4%"
 */
export function formatPercent(value: number, decimals = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '0.0%';
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format a signed percent that is already expressed in percent units:
 * 5.2 → "+5.2%", -2.34 → "-2.34%"
 */
export function formatSignedPercent(value: number, decimals = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '0.0%';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

/**
 * Format leverage: 12.5 → "12.5x", 20 → "20x"
 */
export function formatLeverage(value: number): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '0x';
  return Number.isInteger(value) ? `${value}x` : `${value.toFixed(1)}x`;
}

/**
 * Human "time ago" from an ISO timestamp: "2s ago", "15m ago", "3h ago", "2d ago"
 */
export function formatTimeAgo(timestamp: string | number | Date): string {
  const then = new Date(timestamp).getTime();
  if (Number.isNaN(then)) return '';
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

/**
 * Format a duration in seconds: 3600 → "1h 0m", 90061 → "1d 1h 1m", 1800 → "30m"
 */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0m';
  const total = Math.floor(seconds);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/**
 * Format a block number with thousands separators: 12453211n → "12,453,211"
 */
export function formatBlockNumber(block: bigint | number): string {
  try {
    return BigInt(block).toLocaleString('en-US');
  } catch {
    return String(block);
  }
}

/**
 * Format a funding rate (fraction per 8h): 0.0003 → "+0.030%", -0.0001 → "-0.010%"
 */
export function formatFundingRate(rate: number): string {
  if (rate === null || rate === undefined || Number.isNaN(rate)) return '0.000%';
  const pct = rate * 100;
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(3)}%`;
}

/**
 * Annualize an 8h funding rate: 0.0003 → "APR: +32.8%" (0.0003 × 3 × 365 = 32.85%)
 */
export function formatAPR(rate: number): string {
  if (rate === null || rate === undefined || Number.isNaN(rate)) return 'APR: 0.0%';
  const apr = rate * 3 * 365 * 100;
  const sign = apr > 0 ? '+' : '';
  return `APR: ${sign}${apr.toFixed(1)}%`;
}

/**
 * APR without label, for tight table cells: 0.0003 → "+32.8%"
 */
export function formatAPRCompact(rate: number): string {
  if (rate === null || rate === undefined || Number.isNaN(rate)) return '0.0%';
  const apr = rate * 3 * 365 * 100;
  const sign = apr > 0 ? '+' : '';
  return `${sign}${apr.toFixed(1)}%`;
}

/**
 * Monad explorer transaction URL
 */
export function getMonadScanTxUrl(hash: string): string {
  return `https://monadexplorer.com/tx/${hash}`;
}

/**
 * Monad explorer address URL
 */
export function getMonadScanAddressUrl(address: string): string {
  return `https://monadexplorer.com/address/${address}`;
}

/**
 * Format a plain integer with thousands separators: 1842 → "1,842"
 */
export function formatNumber(value: number): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '0';
  return Math.round(value).toLocaleString('en-US');
}

/**
 * Format a price with adaptive precision (crypto-friendly): 98200 → "$98,200", 0.4821 → "$0.4821"
 */
export function formatPrice(value: number): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '$0';
  const abs = Math.abs(value);
  let decimals = 2;
  if (abs > 0 && abs < 1) decimals = 4;
  if (abs >= 1000) decimals = 0;
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/**
 * Compact date for chart axes: "2026-10-08T12:00:00Z" → "Oct 8"
 */
export function formatChartDate(date: string): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Validate an EVM address (0x + 40 hex chars)
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Clamp a number into [min, max]
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
