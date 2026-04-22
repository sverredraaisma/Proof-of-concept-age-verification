'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Terminal } from '@/components/Terminal';
import { useLog } from '@/lib/useLog';
import { CONSUMER_NAME } from '@/lib/config';

type Verdict =
  | { kind: 'pending' }
  | { kind: 'ok'; dob: string; ageYears: number; kid: string; keyRole: string }
  | { kind: 'err'; reason: string };

export default function CallbackClient() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const urlNonce = params.get('nonce') ?? '';
  const log = useLog();
  const [verdict, setVerdict] = useState<Verdict>({ kind: 'pending' });

  useEffect(() => {
    (async () => {
      log.info(`${CONSUMER_NAME} · easy-flow callback.`);
      const stored = sessionStorage.getItem('pendingNonce') ?? '';
      if (!token || !urlNonce) {
        log.error('Callback URL is missing token or nonce.');
        setVerdict({ kind: 'err', reason: 'Missing token or nonce in callback URL.' });
        return;
      }
      log.step(`Received token (${token.length} chars) and nonce ${urlNonce.slice(0, 12)}…`);
      if (stored && stored !== urlNonce) {
        log.error('URL nonce does not match the nonce this browser issued — rejecting.');
        setVerdict({
          kind: 'err',
          reason: 'Callback nonce does not match issued nonce.',
        });
        return;
      }
      log.success('URL nonce matches our issued nonce.');

      log.step('Sending token to our backend for signature verification…');
      const r = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, expectedNonce: urlNonce }),
      });
      const { result, trace } = (await r.json()) as {
        result:
          | { ok: true; dob: string; ageYears: number; kid: string; keyRole: string }
          | { ok: false; reason: string };
        trace: { level: 'info' | 'step' | 'success' | 'warn' | 'error'; msg: string }[];
      };
      for (const line of trace) log[line.level](`[backend] ${line.msg}`);
      if (result.ok) {
        setVerdict({
          kind: 'ok',
          dob: result.dob,
          ageYears: result.ageYears,
          kid: result.kid,
          keyRole: result.keyRole,
        });
        log.success(`Verification passed — user is ${result.ageYears} years old.`);
        sessionStorage.removeItem('pendingNonce');
      } else {
        setVerdict({ kind: 'err', reason: result.reason });
        log.error(`Verification failed: ${result.reason}`);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="page">
      <div className="header">
        <div>
          <h1>{CONSUMER_NAME}</h1>
          <div className="sub">Easy flow callback</div>
        </div>
        <a href="/">← back to start</a>
      </div>

      <div className="stack">
        <div className="card">
          <h2>Result</h2>
          {verdict.kind === 'pending' && <p>Verifying…</p>}
          {verdict.kind === 'ok' && (
            <div className="verdict ok">
              ✓ Age verified: user is <strong>{verdict.ageYears}</strong> years old
              (dob {verdict.dob}). Signed with {verdict.keyRole} key {verdict.kid}.
            </div>
          )}
          {verdict.kind === 'err' && (
            <div className="verdict err">✗ {verdict.reason}</div>
          )}
        </div>
      </div>

      <Terminal entries={log.entries} title="consumer-web · callback log" />
    </div>
  );
}
