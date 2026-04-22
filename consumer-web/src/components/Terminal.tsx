'use client';
import { useEffect, useRef } from 'react';
import type { LogEntry } from '@/lib/useLog';

const LEVEL_COLOR: Record<LogEntry['level'], string> = {
  info: '#8be9fd',
  step: '#f1fa8c',
  success: '#50fa7b',
  warn: '#ffb86c',
  error: '#ff5555',
};

const LEVEL_LABEL: Record<LogEntry['level'], string> = {
  info: 'INFO ',
  step: 'STEP ',
  success: ' OK  ',
  warn: 'WARN ',
  error: 'ERR  ',
};

export function Terminal({ entries, title }: { entries: LogEntry[]; title: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [entries]);

  return (
    <div className="terminal">
      <div className="terminal-title">
        <span className="terminal-dot" style={{ background: '#ff5f56' }} />
        <span className="terminal-dot" style={{ background: '#ffbd2e' }} />
        <span className="terminal-dot" style={{ background: '#27c93f' }} />
        <span className="terminal-title-text">{title}</span>
      </div>
      <div className="terminal-body" ref={ref}>
        {entries.length === 0 && (
          <div className="terminal-line" style={{ color: '#6272a4' }}>
            waiting for activity…
          </div>
        )}
        {entries.map((e) => (
          <div key={e.id} className="terminal-line">
            <span style={{ color: '#6272a4' }}>{e.ts}</span>{' '}
            <span style={{ color: LEVEL_COLOR[e.level] }}>[{LEVEL_LABEL[e.level]}]</span>{' '}
            <span style={{ color: '#f8f8f2' }}>{e.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
