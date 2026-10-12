'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FeedEvent, LiquidationEvent, Market, TradeSide, WalletTier } from '@/lib/types';
import {
  FEED_MAX_EVENTS,
  WHALE_THRESHOLD_SIZE,
  WS_BASE_RETRY_DELAY,
  WS_MAX_RETRIES,
} from '@/lib/utils/constants';

// ═══════════════════════════════════════════════════════════════════
// Perpl WebSocket: wss://app.perpl.xyz/ws/v1/market-data
// Native WebSocket lifecycle + exponential-backoff reconnect + parsing
// into FeedEvent / LiquidationEvent streams.
// ═══════════════════════════════════════════════════════════════════

const WS_URL = process.env.NEXT_PUBLIC_PERPL_WS_URL ?? 'wss://app.perpl.xyz/ws/v1/market-data';

const SUBSCRIPTIONS: string[] = [
  JSON.stringify({ type: 'subscribe', channel: 'trades', market: 'ALL' }),
  JSON.stringify({ type: 'subscribe', channel: 'liquidations' }),
  JSON.stringify({ type: 'subscribe', channel: 'orderbook', market: 'BTC' }),
];

const MARKET_LIST: Market[] = ['BTC', 'ETH', 'SOL', 'MON', 'HYPE', 'ZEC'];
const TIER_LIST: WalletTier[] = ['WHALE', 'SHARK', 'FISH'];

interface WsMessage {
  channel?: string;
  type?: string;
  event?: string;
  market?: string;
  wallet?: string;
  walletAddress?: string;
  address?: string;
  side?: string;
  size?: number | string;
  notional?: number | string;
  amount?: number | string;
  price?: number | string;
  leverage?: number | string;
  pnl?: number | string;
  loss?: number | string;
  realizedPnl?: number | string;
  tx?: string;
  txHash?: string;
  block?: number | string;
  timestamp?: string | number;
  tier?: string;
  score?: number;
  data?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toNumber(value: unknown, fallback = 0): number {
  const n = typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : fallback;
  return Number.isFinite(n) ? n : fallback;
}

function toMarket(value: unknown): Market {
  const upper = typeof value === 'string' ? value.toUpperCase() : '';
  return MARKET_LIST.includes(upper as Market) ? (upper as Market) : 'BTC';
}

function toSide(value: unknown): TradeSide {
  const upper = typeof value === 'string' ? value.toUpperCase() : '';
  return upper === 'SHORT' || upper === 'SELL' ? 'SHORT' : 'LONG';
}

function toTier(value: unknown, size: number): WalletTier {
  const upper = typeof value === 'string' ? value.toUpperCase() : '';
  if (TIER_LIST.includes(upper as WalletTier)) return upper as WalletTier;
  if (size >= 500_000) return 'WHALE';
  if (size >= 100_000) return 'SHARK';
  return 'FISH';
}

function shortAddressOf(address: string): string {
  return address.length > 12 ? `${address.slice(0, 6)}...${address.slice(-4)}` : address;
}

function safeTx(value: unknown): string {
  return typeof value === 'string' && value.startsWith('0x') ? value : '';
}

function eventId(): string {
  return `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Parse a raw trades-channel message into a FeedEvent (null if not a trade). */
export function parseTradeMessage(raw: string): FeedEvent | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    const msg = parsed as WsMessage;
    const payload: WsMessage = isRecord(msg.data) ? (msg.data as WsMessage) : msg;

    const channel = String(msg.channel ?? payload.channel ?? '');
    const kind = String(msg.type ?? msg.event ?? payload.type ?? '');
    if (!/trade|fill|open|close|flip/i.test(`${channel} ${kind}`)) return null;

    const walletAddress =
      payload.walletAddress ?? payload.wallet ?? payload.address ?? msg.walletAddress ?? '';
    if (typeof walletAddress !== 'string' || !walletAddress.startsWith('0x')) return null;

    const size = toNumber(payload.size ?? payload.notional ?? payload.amount);
    const price = toNumber(payload.price);
    const side = toSide(payload.side);
    const isClose = /close|close/i.test(kind);
    const isFlip = /flip/i.test(kind);
    const realizedRaw = payload.realizedPnl ?? payload.pnl;

    return {
      id: eventId(),
      type: isFlip ? 'FLIP' : isClose ? 'CLOSE' : 'OPEN',
      walletAddress,
      shortAddress: shortAddressOf(walletAddress),
      tier: toTier(payload.tier, size),
      smartMoneyScore: toNumber(payload.score, 50),
      market: toMarket(payload.market ?? msg.market),
      side,
      size,
      price,
      leverage: payload.leverage !== undefined ? toNumber(payload.leverage) : undefined,
      realizedPnl: realizedRaw !== undefined ? toNumber(realizedRaw) : undefined,
      txHash: safeTx(payload.txHash ?? payload.tx ?? msg.txHash),
      timestamp:
        typeof payload.timestamp === 'string'
          ? payload.timestamp
          : new Date(toNumber(payload.timestamp, Date.now())).toISOString(),
    };
  } catch (error) {
    console.error('[perplex/ws] parseTradeMessage:', error);
    return null;
  }
}

/** Parse a raw liquidations-channel message into a LiquidationEvent. */
export function parseLiquidationMessage(raw: string): LiquidationEvent | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    const msg = parsed as WsMessage;
    const payload: WsMessage = isRecord(msg.data) ? (msg.data as WsMessage) : msg;

    const channel = String(msg.channel ?? payload.channel ?? '');
    const kind = String(msg.type ?? msg.event ?? payload.type ?? '');
    if (!/liquidat/i.test(`${channel} ${kind}`)) return null;

    const walletAddress =
      payload.walletAddress ?? payload.wallet ?? payload.address ?? msg.walletAddress ?? '';
    if (typeof walletAddress !== 'string' || !walletAddress.startsWith('0x')) return null;

    const size = toNumber(payload.size ?? payload.amount);
    return {
      id: eventId(),
      walletAddress,
      shortAddress: shortAddressOf(walletAddress),
      tier: toTier(payload.tier, size),
      market: toMarket(payload.market ?? msg.market),
      side: toSide(payload.side),
      size,
      price: toNumber(payload.price),
      loss: toNumber(payload.loss ?? payload.realizedPnl ?? payload.pnl),
      txHash: safeTx(payload.txHash ?? payload.tx ?? msg.txHash),
      timestamp:
        typeof payload.timestamp === 'string'
          ? payload.timestamp
          : new Date(toNumber(payload.timestamp, Date.now())).toISOString(),
    };
  } catch (error) {
    console.error('[perplex/ws] parseLiquidationMessage:', error);
    return null;
  }
}

export interface UsePerplWebSocketOptions {
  onWhaleDetected?: (event: FeedEvent) => void;
  onLiquidation?: (event: LiquidationEvent) => void;
  enabled?: boolean;
}

export interface UsePerplWebSocketResult {
  events: FeedEvent[];
  liquidations: LiquidationEvent[];
  isConnected: boolean;
  lastBlock: number;
}

/**
 * usePerplWebSocket — live trade + liquidation streams from Perpl.
 * - Reconnects with exponential backoff (max 5 retries, base 1s)
 * - Keeps the last 100 parsed events in state
 * - Fires onWhaleDetected for events > $50K notional
 * - Fires onLiquidation for every liquidation event
 * - Cleans up the socket on unmount
 */
export function usePerplWebSocket(
  options: UsePerplWebSocketOptions = {}
): UsePerplWebSocketResult {
  const { onWhaleDetected, onLiquidation, enabled = true } = options;

  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [liquidations, setLiquidations] = useState<LiquidationEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastBlock, setLastBlock] = useState(0);

  const whaleRef = useRef(onWhaleDetected);
  const liqRef = useRef(onLiquidation);
  whaleRef.current = onWhaleDetected;
  liqRef.current = onLiquidation;

  const pushEvent = useCallback((event: FeedEvent) => {
    setEvents((prev) => [event, ...prev].slice(0, FEED_MAX_EVENTS));
    if (event.size > WHALE_THRESHOLD_SIZE && whaleRef.current) {
      whaleRef.current(event);
    }
  }, []);

  const pushLiquidation = useCallback((event: LiquidationEvent) => {
    setLiquidations((prev) => [event, ...prev].slice(0, FEED_MAX_EVENTS));
    if (liqRef.current) liqRef.current(event);
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || typeof WebSocket === 'undefined') {
      return;
    }

    let socket: WebSocket | null = null;
    let disposed = false;
    let retries = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = (): void => {
      if (disposed) return;
      try {
        socket = new WebSocket(WS_URL);
      } catch (error) {
        console.error('[perplex/ws] construct failed:', error);
        scheduleReconnect();
        return;
      }

      socket.onopen = () => {
        if (disposed) return;
        retries = 0;
        setIsConnected(true);
        for (const sub of SUBSCRIPTIONS) {
          socket?.send(sub);
        }
      };

      socket.onmessage = (message: MessageEvent<string>) => {
        if (disposed || typeof message.data !== 'string') return;

        const blockMatch = /"block"\s*:\s*(\d+)/.exec(message.data);
        if (blockMatch) setLastBlock(Number(blockMatch[1]));

        const liq = parseLiquidationMessage(message.data);
        if (liq) {
          pushLiquidation(liq);
          return;
        }
        const trade = parseTradeMessage(message.data);
        if (trade) pushEvent(trade);
      };

      socket.onerror = () => {
        // onclose follows; reconnect is handled there.
      };

      socket.onclose = () => {
        if (disposed) return;
        setIsConnected(false);
        scheduleReconnect();
      };
    };

    const scheduleReconnect = (): void => {
      if (disposed || retries >= WS_MAX_RETRIES) return;
      const delay = WS_BASE_RETRY_DELAY * 2 ** retries;
      retries += 1;
      reconnectTimer = setTimeout(connect, delay);
    };

    connect();

    return () => {
      disposed = true;
      setIsConnected(false);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (socket) {
        socket.onopen = null;
        socket.onmessage = null;
        socket.onerror = null;
        socket.onclose = null;
        try {
          socket.close();
        } catch {
          // already closed
        }
      }
    };
  }, [enabled, pushEvent, pushLiquidation]);

  return { events, liquidations, isConnected, lastBlock };
}
