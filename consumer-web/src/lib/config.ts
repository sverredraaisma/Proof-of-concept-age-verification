// Server-side config (safe to read process.env here — these imports are only used
// from the Next server or from server components).
export const SERVER_URL = process.env.SERVER_URL ?? 'http://localhost:4000';
export const CONSUMER_NAME = process.env.CONSUMER_NAME ?? 'Demo Shop';

// Broker WebSocket bind port. Browsers connect to WS_PUBLIC_URL (possibly via a
// reverse proxy), which is injected separately at request time.
export const WS_PORT = Number(process.env.WS_PORT ?? 3011);

// Jitter factor applied to timespan/2 so consumers don't herd on a synchronized boundary.
export const KEY_REFRESH_JITTER = 0.2;
