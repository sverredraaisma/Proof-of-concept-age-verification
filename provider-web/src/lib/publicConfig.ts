/**
 * Runtime config injected into the client via `window.__APP_CONFIG__` by the
 * root layout. Lets the same built image be redeployed with a different
 * provider branding just by changing env vars.
 */

export type PublicConfig = {
  PROVIDER_NAME: string;
};

export const DEFAULT_PUBLIC_CONFIG: PublicConfig = {
  PROVIDER_NAME: 'Demo National ID Provider',
};

declare global {
  interface Window {
    __APP_CONFIG__?: Partial<PublicConfig>;
  }
}

export function resolvePublicConfig(): PublicConfig {
  if (typeof window === 'undefined') {
    return {
      PROVIDER_NAME: process.env.PROVIDER_NAME ?? DEFAULT_PUBLIC_CONFIG.PROVIDER_NAME,
    };
  }
  const injected = window.__APP_CONFIG__ ?? {};
  return {
    PROVIDER_NAME: injected.PROVIDER_NAME ?? DEFAULT_PUBLIC_CONFIG.PROVIDER_NAME,
  };
}
