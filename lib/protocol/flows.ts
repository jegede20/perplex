import type { NetFlowPoint, WalletFlow } from '@/lib/types';

// ═══════════════════════════════════════════════════════════════════
// Net flow computation — deposits vs withdrawals across the protocol
// and per-wallet flow history processing.
// ═══════════════════════════════════════════════════════════════════

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Aggregate wallet flows into daily NetFlowPoints:
 * deposits (green), withdrawals (red), and net = deposits − withdrawals.
 */
export function computeNetFlows(flows: WalletFlow[], days = 30): NetFlowPoint[] {
  const cutoff = Date.now() - days * 86_400_000;
  const byDay = new Map<string, { deposits: number; withdrawals: number }>();

  for (const flow of flows) {
    const t = new Date(flow.timestamp).getTime();
    if (Number.isNaN(t) || t < cutoff) continue;
    const key = dayKey(new Date(t));
    const entry = byDay.get(key) ?? { deposits: 0, withdrawals: 0 };
    if (flow.type === 'DEPOSIT') entry.deposits += flow.amount;
    else entry.withdrawals += flow.amount;
    byDay.set(key, entry);
  }

  const points: NetFlowPoint[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const key = dayKey(new Date(Date.now() - i * 86_400_000));
    const entry = byDay.get(key) ?? { deposits: 0, withdrawals: 0 };
    points.push({
      date: key,
      deposits: entry.deposits,
      withdrawals: entry.withdrawals,
      net: entry.deposits - entry.withdrawals,
    });
  }
  return points;
}

/** Sum of flows in the last `hours` (positive = net inflow). */
export function netFlowInWindow(flows: WalletFlow[], hours: number): number {
  const cutoff = Date.now() - hours * 3_600_000;
  return flows.reduce((sum, f) => {
    const t = new Date(f.timestamp).getTime();
    if (Number.isNaN(t) || t < cutoff) return sum;
    return sum + (f.type === 'DEPOSIT' ? f.amount : -f.amount);
  }, 0);
}

// ─── deterministic demo flow generation ────────────────────────────

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate deterministic daily net-flow points (demo mode).
 * Deposits slightly exceed withdrawals on most days — healthy protocol inflow.
 */
export function generateDemoNetFlows(days = 30, seed = 4242): NetFlowPoint[] {
  const rng = mulberry32(seed);
  const points: NetFlowPoint[] = [];

  for (let i = days - 1; i >= 0; i -= 1) {
    const date = dayKey(new Date(Date.now() - i * 86_400_000));
    const wave = Math.sin((days - i) / 4.5) * 0.35 + 1;
    const deposits = Math.round((180_000 + rng() * 420_000) * wave);
    const withdrawals = Math.round((120_000 + rng() * 360_000) * wave * (rng() > 0.82 ? 1.6 : 1));
    points.push({ date, deposits, withdrawals, net: deposits - withdrawals });
  }
  return points;
}

/**
 * Generate deterministic per-wallet flows (demo mode) — 4–14 events
 * spread over the last 45 days.
 */
export function generateDemoWalletFlows(
  walletAddress: string,
  seed: number
): WalletFlow[] {
  const rng = mulberry32(seed);
  const count = 4 + Math.floor(rng() * 10);
  const flows: WalletFlow[] = [];

  for (let i = 0; i < count; i += 1) {
    const isDeposit = rng() > 0.38;
    const amount = Math.round((5_000 + rng() * 120_000) / 100) * 100;
    // Newest flows land in the last few hours (top of the desc-sorted
    // list); older ones keep the 45-day deposit/withdrawal history.
    const ts =
      i < 2
        ? Date.now() - Math.floor(rng() * 3 * 3_600_000) - 5 * 60_000
        : Date.now() - Math.floor(rng() * 45 * 86_400_000);
    flows.push({
      id: `flow_${walletAddress.slice(2, 10)}_${i}`,
      type: isDeposit ? 'DEPOSIT' : 'WITHDRAWAL',
      amount,
      txHash: `0x${Math.floor(rng() * 1e16).toString(16).padStart(16, '0')}${Math.floor(rng() * 1e16).toString(16).padStart(16, '0')}${Math.floor(rng() * 1e8).toString(16).padStart(8, '0')}`,
      timestamp: new Date(ts).toISOString(),
    });
  }

  return flows.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
