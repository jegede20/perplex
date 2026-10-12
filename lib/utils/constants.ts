// ═══════════════════════════════════════════════════════════════════
// App-wide constants
// ═══════════════════════════════════════════════════════════════════

/** Min USD notional for a trade to trigger a whale alert. */
export const WHALE_THRESHOLD_SIZE = 50000;

/** Leaderboard rows per page. */
export const LEADERBOARD_PAGE_SIZE = 20;

/** Wallet trade-history rows per page. */
export const TRADE_HISTORY_PAGE_SIZE = 15;

/** Max events retained in the full feed buffer. */
export const FEED_MAX_EVENTS = 100;

/** Max events visible in the compact live-feed panel. */
export const FEED_PANEL_MAX = 20;

/** Smart money score thresholds. */
export const SCORE_WHALE_MIN = 75;
export const SCORE_SHARK_MIN = 50;

/** Volume thresholds for tier classification (USD). */
export const VOLUME_WHALE_MIN = 500000;
export const VOLUME_SHARK_MIN = 100000;

/** Live block-number poll interval (ms) — Monad produces ~500ms blocks. */
export const BLOCK_POLL_INTERVAL = 500;

/** Open-positions refresh interval (ms). */
export const POSITIONS_REFRESH_INTERVAL = 30000;

/** Feed panel poll interval (ms). */
export const FEED_POLL_INTERVAL = 10000;

/** Order book refresh interval (ms). */
export const ORDERBOOK_REFRESH_INTERVAL = 5000;

/** Perpl REST request timeout (ms). */
export const PERPL_API_TIMEOUT = 10000;

/** WebSocket reconnect: max attempts and base delay (ms). */
export const WS_MAX_RETRIES = 5;
export const WS_BASE_RETRY_DELAY = 1000;

/** ScoreBar color thresholds (0-100). */
export const SCORE_PURPLE_MIN = 70;
export const SCORE_YELLOW_MIN = 40;

/** Funding settles 3× daily on Perpl (every 8h). */
export const FUNDING_PERIODS_PER_YEAR = 3 * 365;

/** Risk rating thresholds. */
export const RISK_DRAWDOWN_LOW = 20;
export const RISK_DRAWDOWN_HIGH = 40;
