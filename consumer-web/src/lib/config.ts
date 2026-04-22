export const SERVER_URL = process.env.SERVER_URL ?? 'http://localhost:4000';
export const PROVIDER_WEB_URL = process.env.PROVIDER_WEB_URL ?? 'http://localhost:3002';
export const CONSUMER_NAME = 'Demo Shop';

// Broker WebSocket port — separate from Next so we can attach a ws server without a
// custom HTTP server. The browser connects to ws://localhost:<WS_PORT>/terminal.
export const WS_PORT = Number(process.env.WS_PORT ?? 3011);
export const WS_PUBLIC_URL =
  process.env.NEXT_PUBLIC_WS_URL ?? `ws://localhost:${WS_PORT}/terminal`;

// Jitter factor applied to timespan/2 so consumers don't herd on a synchronized boundary.
export const KEY_REFRESH_JITTER = 0.2;
