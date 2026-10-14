# Perplex 🔍
### Protocol Analytics & Smart Money Intelligence for Perpl on Monad

[![MIT License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)
[![Built on Monad](https://img.shields.io/badge/Built%20on-Monad-purple)](https://www.monad.xyz)
[![Powered by Perpl](https://img.shields.io/badge/Powered%20by-Perpl-purple)](https://app.perpl.xyz)

**Perplex is the "Nansen/Arkham of Perpl"** — a protocol analytics + wallet intelligence terminal for the fully on-chain perpetual futures CLOB on Monad. Protocol → Market → Wallet, all connected.

---

## 🧐 The Problem

DeFi perp traders are completely blind to smart money movements. Whale wallets with 80%+ win rates are opening and closing positions you can't see. By the time the price moves, it's too late.

## 💡 The Solution

Perplex turns Perpl's fully on-chain CLOB into actionable intelligence. Protocol-level health metrics, per-market whale sentiment, and deep wallet profiling — all in one drill-down interface: **Protocol → Market → Wallet**.

---

## 🏆 Hackathon

| | |
|---|---|
| **Event** | Monad Metropolis Hackathon |
| **Track** | Onchain Finance & Trading |
| **Bounty** | Best Analytics / Risk Tool — sponsored by Perpl |
| **Stackable with** | $10,000 track prize |

---

## ✨ Features

### Protocol Analytics
- 📊 Real-time volume, OI, TVL, fees, liquidations, active traders (8-metric hero grid)
- 🏦 Insurance fund health tracker (balance, 24h change, coverage ratio)
- 💸 Net capital flows (deposits vs withdrawals with net-flow overlay)
- ⏱️ Time range selector: 24H / 7D / 30D / ALL — shared across all charts

### Market Intelligence (BTC · ETH · SOL · MON · HYPE · ZEC)
- Funding rate + APR per market (8h funding annualized)
- Long/Short skew with sentiment bar + whale dominance badge
- **Liquidation map** — positions clustered by liquidation price vs mark price
- L2 order book depth visualization (bids/asks cumulative, spread)
- Top traders per market (one click → full wallet profile)

### Wallet Intelligence
- 🔢 Smart Money Score (0–100 proprietary algorithm)
- 🐋 Tier Classification: Whale / Shark / Fish
- 🏷️ Auto-generated Behavior Tags (Scalper, High Leverage, Diamond Hands, etc.)
- 📈 Cumulative PnL chart (7D / 14D / 30D)
- 💀 Live open positions with uPnL, liquidation price, distance-to-liq, margin bar
- 📋 Complete trade history (Open / Closed / Liquidated) with filters, sorting, pagination
- ⚠️ **Risk metrics**: Max Drawdown, Profit Factor, Win/Loss Streaks, Avg Win/Loss, hold times, LOW/MEDIUM/HIGH risk rating

### Live Intelligence
- ⚡ Real-time whale feed via WebSocket (exponential backoff reconnect)
- 🚨 Liquidation alerts + whale detection (> $50K notional)
- 🔍 Search any Monad wallet address (validated 0x… format)
- ⬡ Live Monad block number in Navbar + Footer (500ms polling)

---

## 🟣 Why Monad?

Perplex only exists because of Monad's infrastructure:

- **Full on-chain CLOB**: Perpl puts every order, trade, and liquidation on-chain. On Ethereum, indexing this data would cost thousands in gas. On Monad, it's near-zero.
- **500ms block times**: Whale positions surface in near real-time. On Ethereum (12s blocks) you'd already be late.
- **10,000 TPS**: High-frequency event indexing is possible without RPC congestion. This tool cannot exist on Ethereum or on any CEX (data hidden). **Monad + Perpl = total transparency.**

---

## 🚀 Bonus Innovation Features

| Feature | Route | What it does |
|---|---|---|
| **Liquidation Map** | `/app/liquidation-map` | Interactive heatmap of every open position clustered by liquidation price — see exactly where liquidation waves trigger. Includes a cascade risk simulator (LOW→EXTREME) for simulated ±30% price moves. |
| **Whale Sentiment Gauge** | `/app/sentiment` | Live market "temperature" from all tracked Whale + Shark positioning: animated speedometer, per-market sentiment cards, 24h history with fear/greed zones, shift feed, bull/bear whale tables. |
| **Compare Wallets** | `/app/compare` | Head-to-head wallet analysis: 10 metrics with per-metric winners (lower wins for leverage/drawdown), performance radar, dual PnL curves, shared behavior tags, opposite-side position flags. Bookmarkable via `?a=&b=`. |

Plus a full marketing **landing page** at `/` (hero, live protocol snapshot, features, how-it-works, Smart Money Score explainer, why-Monad, live feed preview, CTA, footer) — the analytics workspace moved to `/app/*`.

## ✅ Live Data Sources (verified against Monad mainnet)

| Source | Endpoint / Call | Status |
|---|---|---|
| **Perpl REST** | `GET /v1/pub/context` | ✅ Live — all markets: prices, OI, volume, TVL, funding (real fixed-point decode) |
| **Perpl REST** | `GET /v1/market-data/{id}/book` | ✅ Live — real L2 order book depth |
| **Monad RPC** | `eth_blockNumber` + block watcher | ✅ Live — footer/Navbar block counter |
| **Monad RPC** | `getPerpetualInfoV2(marketId)` | ✅ Selector verified on-chain (18-dec fixed point) |
| **Monad RPC** | `getPositionsV2(marketId, start, end)` | ✅ Live call verified — paginated signature discovered on-chain |
| **Monad RPC** | `getLiquidationInfo`, `getMarginFractions`, `getAccountByAddr`, `getPosition` | ⏳ Spec'd surface — gracefully degrades (verified ABI not yet published on the explorer) |
| **Perpl REST** | `/v1/pub/trades`, `/funding`, `/oi`, `/stats` | ⏳ Geo-restricted from some regions (451) — clients degrade gracefully |
| **Supabase** | wallets / trades / feed / snapshots | ✅ Live — 7 tables + RLS (read-only anon), seeded: 32 wallets, 2,001 trades, 168 feed events, 26 liquidations, 286 flows |

Real Perpl market IDs were verified live: **BTC=1 · MON=10 · ETH=20 · SOL=31 · HYPE=40 · ZEC=50** (each with its own `price_decimals`/`size_decimals` fixed-point scaling).

## 🗂️ Data sources — what's live and what's demo

Perplex is a layered data pipeline: **live Perpl feeds → indexed Supabase rows → deterministic demo dataset**. Every response is served from the freshest source available, and the UI labels provenance.

| Surface | Source | Real? |
|---|---|---|
| Protocol stats (volume, OI, fees), open positions, liquidation config | On-chain reads from the Perpl exchange `0x34B6552d57a35a1D042CcAe1951BD1C370112a6F` on Monad mainnet (chain 143) | ✅ Real |
| Markets, prices, order book | Perpl public API (`/pub/context`, `/pub/book`) | ✅ Real |
| Wallets, trades, feed events, liquidations, wallet flows, comparisons | Deterministic seeded dataset (`npm run seed`) + in-memory fallback generator | ⚠️ Demo — labeled **"Demo data"** in the UI |

**Why a demo dataset?** Perpl's market-data feeds (`/pub/trades`, `/pub/funding`, `/pub/oi`, `/pub/stats`, `wss://…/ws`) currently return HTTP 451/403 from cloud/datacenter IPs — a legal/geo restriction on Perpl's edge (details in `PERPL-API-ACCESS.md`). With no live trade feed reachable from the hosting environment, the app serves a deterministic seeded dataset so every dashboard stays fully explorable instead of empty.

**Demo rows are synthetic and labeled.** Seeded wallet addresses and tx hashes are generated, not on-chain — they will **not** resolve on a Monad block explorer, by design. Surfaces showing them carry a small **"Demo data"** badge; the tooltip and this section are the disclosure.

**Path to fully live data:** run the ingest/seed pipeline from a network Perpl allows (or once Perpl allowlists the deployment) — indexed rows automatically take priority over the fallback generator, and responses sourced from live feeds report `dataSource: 'live'`, which hides the badge.

## 🤖 AI tools disclosure (Metropolis Rules §4.1.4)

This project was built with the assistance of AI coding tools (agentic pair programming across implementation, tests and QA). All code was reviewed, type-checked (TypeScript strict, zero `any`), and is covered by 79 unit tests. The demo and pitch videos use synthesized audio and an AI-generated voiceover; the video uploads are marked as altered/synthetic content accordingly.

## 🏗️ Architecture

```
Monad RPC (Chain ID 143)
   │  viem contract reads: getPositionsV2, getPerpetualInfoV2,
   │  getLiquidationInfo, getMarginFractions, getAccountByAddr, getPosition
   ▼
Perpl REST API ──► market data, order books, funding
Perpl WebSocket ─► real-time trades + liquidations
   ▼
Event indexer / parsers ─► Supabase (PostgreSQL)
   tables: wallets, trades, feed_events, liquidations,
           protocol_snapshots, market_snapshots, wallet_flows
   ▼
Next.js API Routes (typed, cached with revalidate)
   ▼
React frontend (App Router) — real-time dashboards
```

**Data source priority** (graceful degradation at every step):
1. **Supabase** — indexed history (wallets, trades, feed, snapshots)
2. **Monad contract reads** — live OI, prices, funding, positions, insurance fund
3. **Perpl REST** — books, funding history, market context
4. **Deterministic seeded fallback** — keeps every dashboard fully explorable before an indexer is running or when a source is down

---

## 💡 Smart Money Score Algorithm

```
Score (0–100) = Win Rate × 0.40        (max 40 pts)
              + PnL × 0.30             (caps at $10K PnL = 30 pts)
              + Volume × 0.15          (caps at $500K volume = 15 pts)
              + Consistency × 0.15     (win streak / total trades = 15 pts)
```

**Tiers:**
- 🐋 **Whale** → Score ≥ 75 **AND** Volume ≥ $500K
- 🦈 **Shark** → Score ≥ 50 **OR** Volume ≥ $100K
- 🐟 **Fish** → Everything else

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict — zero `any`) |
| Styling | Tailwind CSS + shadcn/ui |
| Charts | Recharts |
| Blockchain | viem (Monad mainnet, chain ID 143) |
| WebSocket | Native WebSocket client (reconnect + backoff) |
| Database | Supabase (PostgreSQL) |
| Deployment | Vercel |
| Testing | Jest + React Testing Library |
| Icons | Lucide React |
| Font | Inter (next/font) |

---

## 🚀 Getting Started

```bash
git clone https://github.com/jegede20/perplex
cd perplex
npm install
cp .env.example .env.local
# Fill in Supabase + Monad RPC values
npm run dev
# Open http://localhost:3000
```

> **No Supabase project yet?** Leave the Supabase vars empty — Perplex runs against Monad/Perpl live reads plus a deterministic dataset, so every page works end-to-end. To switch on indexed history:
> 1. Run `lib/supabase/migrations.sql` in the Supabase SQL editor (7 tables + indexes + read-only RLS).
> 2. `npm run seed` — loads the deterministic dataset and the first live market/protocol snapshots.
> 3. From then on the API serves from Postgres first and writes back on read: wallet profiles refresh when stale, and market/protocol snapshots accumulate every 5 minutes.

## 📦 Environment Variables

| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_MONAD_RPC_URL` | Monad mainnet JSON-RPC endpoint | `https://rpc.monad.xyz` |
| `NEXT_PUBLIC_MONAD_CHAIN_ID` | Monad chain ID | `143` |
| `NEXT_PUBLIC_PERPL_EXCHANGE_ADDRESS` | Perpl Exchange contract | `0x34B6552d57a35a1D042CcAe1951BD1C370112a6F` |
| `NEXT_PUBLIC_EXPLORER_URL` | Monad block explorer base URL | `https://monadexplorer.com` |
| `NEXT_PUBLIC_PERPL_API_URL` | Perpl REST API base URL | `https://app.perpl.xyz/api` |
| `NEXT_PUBLIC_PERPL_WS_URL` | Perpl market-data WebSocket | `wss://app.perpl.xyz/ws/v1/market-data` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (browser-safe) | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (browser-safe) | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (**server only**) | `eyJ...` |

## 🧪 Tests

```bash
npm run test
npm run test:coverage
```

**79 tests / 11 suites** covering the scoring engine, tier classification, behavior tags, formatting utilities, and UI primitives (TierBadge, PnLTag, StatCard, ScoreBar).

## 📁 Project Structure

```
app/                  # Next.js 14 App Router pages + API routes
  page.tsx            # Protocol Overview dashboard (home)
  markets/            # Markets grid + [market] drill-down
  feed/               # Full-page live whale feed
  wallet/             # Wallet search + [address] explorer
  api/                # protocol, markets, market/[id], wallets,
                      # wallet/[address], feed, sentiment
components/           # layout, protocol, markets, wallet, feed,
                      # leaderboard, ui (shadcn + custom)
lib/
  perpl/              # REST client, WebSocket hook, viem contracts, ABI, markets
  scoring/            # walletScore, walletTier, behaviorTags
  protocol/           # aggregator, liquidations, flows
  supabase/           # client, typed queries, migrations.sql
  types/              # every TypeScript type
  utils/              # format, constants, monad helpers
tests/                # Jest + RTL suites
```

## 🌐 Live Demo

**https://perplex-live.vercel.app**

## 📄 License

MIT — See [LICENSE](LICENSE) file.

## 🙏 Built With

- **[Perpl](https://app.perpl.xyz)** — the fully on-chain perp CLOB on Monad
- **[Monad](https://www.monad.xyz)** — 10,000 TPS, 500ms blocks, EVM-compatible
- **Monad Metropolis Hackathon**

---

*Note for reviewers: `next.config.mjs` is used instead of `next.config.ts` because TypeScript Next config files are only supported from Next.js 15 onward; this project intentionally targets Next.js 14 per the bounty requirements.*
