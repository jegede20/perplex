/**
 * Perplex — Supabase client factories.
 *
 * - `getSupabaseServerClient()` — server-only, service-role key (bypasses
 *   RLS). Every DB write and every indexed read goes through it.
 * - `getSupabaseBrowserClient()` — anon key, read-only, for realtime
 *   feed subscriptions on the client.
 *
 * Credentials come from .env.local (never hard-coded). When Supabase is
 * not configured, the server client returns null and all query helpers
 * fall back to live-chain / deterministic sources.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import WebSocketImpl from 'ws';

// Node.js < 22 exposes no global WebSocket constructor, which
// @supabase/supabase-js requires when it initialises its realtime
// transport. Polyfill before any client is constructed. (Browsers and
// Node ≥ 22 use their native global instead.)
if (typeof globalThis.WebSocket === 'undefined') {
  (globalThis as { WebSocket?: unknown }).WebSocket = WebSocketImpl;
}

let serverClient: SupabaseClient | null = null;
let serverClientMissing = false;
let browserClient: SupabaseClient | null = null;

/**
 * Server-only Supabase client authenticated with the service-role key
 * (RLS bypass). Returns null when env vars are absent.
 */
export function getSupabaseServerClient(): SupabaseClient | null {
  if (serverClient) return serverClient;
  if (serverClientMissing) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    serverClientMissing = true;
    return null;
  }
  serverClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return serverClient;
}

/**
 * Browser-safe Supabase client (anon key, RLS read-only policies).
 * Returns null when public env vars are absent.
 */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  if (!browserClient) {
    browserClient = createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return browserClient;
}
