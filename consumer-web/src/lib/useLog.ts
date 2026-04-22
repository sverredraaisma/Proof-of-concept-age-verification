'use client';
import { useCallback, useRef, useState } from 'react';

export type LogLevel = 'info' | 'step' | 'success' | 'warn' | 'error';
export type LogEntry = { id: number; ts: string; level: LogLevel; msg: string };

function hhmmss() {
  const d = new Date();
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(
    d.getMilliseconds(),
    3,
  )}`;
}

export function useLog() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const idRef = useRef(0);

  const log = useCallback((level: LogLevel, msg: string) => {
    idRef.current += 1;
    const id = idRef.current;
    const ts = hhmmss();
    setEntries((prev) => [...prev, { id, ts, level, msg }]);
  }, []);

  return {
    entries,
    clear: () => setEntries([]),
    info: (m: string) => log('info', m),
    step: (m: string) => log('step', m),
    success: (m: string) => log('success', m),
    warn: (m: string) => log('warn', m),
    error: (m: string) => log('error', m),
  };
}
