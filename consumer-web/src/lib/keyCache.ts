import { SERVER_URL } from './config';

// Module-level cache, lives for the lifetime of the Next.js server process.
type CachedKey = { kid: string; role: 'current' | 'next'; publicKeyPem: string };
type Cache = { keys: CachedKey[]; timespanMs: number; fetchedAt: number } | null;

let cache: Cache = null;
let inflight: Promise<Cache> | null = null;

export type KeyCacheEvents = {
  onFetchStart?: () => void;
  onFetchDone?: (c: NonNullable<Cache>) => void;
  onCacheHit?: (c: NonNullable<Cache>) => void;
  onError?: (e: Error) => void;
};

async function fetchKeys(ev: KeyCacheEvents): Promise<Cache> {
  ev.onFetchStart?.();
  const r = await fetch(`${SERVER_URL}/keys`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`/keys → HTTP ${r.status}`);
  const data = (await r.json()) as {
    timespanMs: number;
    keys: CachedKey[];
  };
  const next: NonNullable<Cache> = {
    keys: data.keys,
    timespanMs: data.timespanMs,
    fetchedAt: Date.now(),
  };
  cache = next;
  ev.onFetchDone?.(next);
  return next;
}

export async function getKeys(ev: KeyCacheEvents = {}): Promise<NonNullable<Cache>> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < cache.timespanMs / 2) {
    ev.onCacheHit?.(cache);
    return cache;
  }
  if (!inflight) {
    inflight = fetchKeys(ev).finally(() => {
      inflight = null;
    });
  }
  const result = await inflight;
  if (!result) throw new Error('key fetch failed');
  return result;
}
