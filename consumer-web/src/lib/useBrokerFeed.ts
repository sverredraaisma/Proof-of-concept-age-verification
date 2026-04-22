'use client';
import { useEffect } from 'react';
import { resolvePublicConfig } from './publicConfig';
import type { LogLevel } from './useLog';

type BrokerMsg =
  | { type: 'hello'; msg: string }
  | { type: 'log'; level: LogLevel; msg: string; ts: string };

type LogFns = Record<LogLevel, (m: string) => void>;

/**
 * Open a WebSocket to the consumer broker and stream its events into the
 * terminal log. The browser sees key refreshes live — fully decoupled from
 * any /api/verify call this tab is making.
 */
export function useBrokerFeed(log: LogFns) {
  useEffect(() => {
    let ws: WebSocket | null = null;
    let closed = false;
    let retry = 0;

    const { WS_PUBLIC_URL } = resolvePublicConfig();

    function connect() {
      log.info(`Opening WebSocket to broker at ${WS_PUBLIC_URL}…`);
      ws = new WebSocket(WS_PUBLIC_URL);
      ws.onopen = () => {
        retry = 0;
        log.success('Broker WebSocket connected.');
      };
      ws.onmessage = (ev) => {
        let m: BrokerMsg;
        try {
          m = JSON.parse(String(ev.data));
        } catch {
          return;
        }
        if (m.type === 'hello') {
          log.info(`[broker] ${m.msg}`);
        } else if (m.type === 'log') {
          log[m.level](`[broker] ${m.msg}`);
        }
      };
      ws.onclose = () => {
        if (closed) return;
        log.warn('Broker WebSocket closed — retrying…');
        const delay = Math.min(5000, 500 * 2 ** retry++);
        setTimeout(connect, delay);
      };
      ws.onerror = () => {
        // onclose will handle reconnection; avoid double-logging.
      };
    }

    connect();
    return () => {
      closed = true;
      ws?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
