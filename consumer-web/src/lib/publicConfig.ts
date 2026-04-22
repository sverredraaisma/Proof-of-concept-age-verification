/**
 * Client-side runtime config. Values are injected into `window.__APP_CONFIG__`
 * by the root layout (server component) from the container's env vars, so the
 * same built image can be redeployed with different domains just by changing
 * `docker-compose.yml` — no rebuild needed.
 */

export type PublicConfig = {
  PROVIDER_WEB_URL: string;
  WS_PUBLIC_URL: string;
};

export const DEFAULT_PUBLIC_CONFIG: PublicConfig = {
  PROVIDER_WEB_URL: 'http://localhost:3002',
  WS_PUBLIC_URL: 'ws://localhost:3011/terminal',
};

declare global {
  interface Window {
    __APP_CONFIG__?: Partial<PublicConfig>;
  }
}

export function resolvePublicConfig(): PublicConfig {
  // On the server, fall back to process.env (this path is only used if a server
  // component reads config; normally the injected values win on the client).
  if (typeof window === 'undefined') {
    return {
      PROVIDER_WEB_URL:
        process.env.PROVIDER_WEB_URL ?? DEFAULT_PUBLIC_CONFIG.PROVIDER_WEB_URL,
      WS_PUBLIC_URL:
        process.env.WS_PUBLIC_URL ?? DEFAULT_PUBLIC_CONFIG.WS_PUBLIC_URL,
    };
  }
  const injected = window.__APP_CONFIG__ ?? {};
  return {
    PROVIDER_WEB_URL: injected.PROVIDER_WEB_URL ?? DEFAULT_PUBLIC_CONFIG.PROVIDER_WEB_URL,
    WS_PUBLIC_URL: injected.WS_PUBLIC_URL ?? DEFAULT_PUBLIC_CONFIG.WS_PUBLIC_URL,
  };
}
