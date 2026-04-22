import { EventEmitter } from 'node:events';
import { KEY_REFRESH_JITTER, SERVER_URL } from './config';

/**
 * Broker: owns the public-key cache and refreshes it on a cron timer that is
 * independent of verify requests. This prevents the provider from correlating
 * a nearby /keys fetch with a signing request (timing side-channel).
 *
 * Instantiated exactly once per Node process via `instrumentation.ts`. HMR-safe
 * by pinning state to globalThis.
 */

type CachedKey = { kid: string; role: 'current' | 'next'; publicKeyPem: string };
export type KeyCache = { keys: CachedKey[]; timespanMs: number; fetchedAt: number };

export type BrokerLogLevel = 'info' | 'step' | 'success' | 'warn' | 'error';
export type BrokerLog = { level: BrokerLogLevel; msg: string; ts: string };

type BrokerState = {
  cache: KeyCache | null;
  emitter: EventEmitter;
  firstFetch: Promise<void> | null;
  started: boolean;
  timer: NodeJS.Timeout | null;
  recentLogs: BrokerLog[]; // small ring buffer for WS clients that connect late
};

const g = globalThis as unknown as { __consumerBroker?: BrokerState };
const state: BrokerState =
  g.__consumerBroker ??
  (g.__consumerBroker = {
    cache: null,
    emitter: new EventEmitter(),
    firstFetch: null,
    started: false,
    timer: null,
    recentLogs: [],
  });
state.emitter.setMaxListeners(100);

function emit(level: BrokerLogLevel, msg: string) {
  const entry: BrokerLog = { level, msg, ts: new Date().toISOString() };
  state.recentLogs.push(entry);
  if (state.recentLogs.length > 200) state.recentLogs.shift();
  state.emitter.emit('log', entry);
  // eslint-disable-next-line no-console
  console.log(`[broker][${level}] ${msg}`);
}

function kidList(c: KeyCache) {
  return c.keys.map((k) => `${k.role}:${k.kid}`).join(', ');
}

async function fetchKeys() {
  emit('step', `Cron tick → GET ${SERVER_URL}/keys`);
  try {
    const r = await fetch(`${SERVER_URL}/keys`, { cache: 'no-store' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = (await r.json()) as {
      timespanMs: number;
      keys: CachedKey[];
    };
    const prev = state.cache;
    state.cache = {
      keys: data.keys,
      timespanMs: data.timespanMs,
      fetchedAt: Date.now(),
    };
    emit(
      'success',
      `Cached ${state.cache.keys.length} keys (timespan ${data.timespanMs}ms): ${kidList(
        state.cache,
      )}`,
    );
    if (prev) {
      const seen = new Set(prev.keys.map((k) => k.kid));
      const fresh = state.cache.keys.filter((k) => !seen.has(k.kid));
      const dropped = prev.keys.filter((k) => !state.cache!.keys.some((n) => n.kid === k.kid));
      if (fresh.length || dropped.length) {
        emit(
          'info',
          `Rotation observed — added [${fresh.map((k) => k.kid).join(', ')}] ` +
            `dropped [${dropped.map((k) => k.kid).join(', ')}]`,
        );
      }
    }
  } catch (e) {
    emit('error', `Key fetch failed: ${(e as Error).message}`);
  }
}

function scheduleNext() {
  if (state.timer) clearTimeout(state.timer);
  if (!state.cache) {
    // no timespan known yet — retry in 1s
    state.timer = setTimeout(tick, 1000);
    return;
  }
  const base = state.cache.timespanMs / 2;
  const j = base * KEY_REFRESH_JITTER;
  const delay = Math.max(500, base + (Math.random() * 2 - 1) * j);
  emit('info', `Next refresh scheduled in ${Math.round(delay)}ms (base ${base}ms ± ${j}ms)`);
  state.timer = setTimeout(tick, delay);
}

async function tick() {
  await fetchKeys();
  scheduleNext();
}

export function startBroker() {
  if (state.started) return;
  state.started = true;
  emit('info', 'Key-refresh broker starting.');
  state.firstFetch = tick();
}

/** Read-only access for /api/verify. Will NEVER trigger a network fetch. */
export async function getCachedKeys(): Promise<KeyCache> {
  if (!state.cache && state.firstFetch) await state.firstFetch;
  if (!state.cache) throw new Error('key cache is empty — broker has not produced a cache yet');
  return state.cache;
}

export function subscribe(listener: (entry: BrokerLog) => void): () => void {
  state.emitter.on('log', listener);
  return () => state.emitter.off('log', listener);
}

export function recentLogs(): BrokerLog[] {
  return state.recentLogs.slice();
}
