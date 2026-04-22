'use client';

import { useEffect, useState } from 'react';
import { Terminal } from '@/components/Terminal';
import { useLog } from '@/lib/useLog';
import { useBrokerFeed } from '@/lib/useBrokerFeed';
import { CONSUMER_NAME } from '@/lib/config';
import { resolvePublicConfig } from '@/lib/publicConfig';

type Verdict =
  | { kind: 'none' }
  | { kind: 'ok'; dob: string; ageYears: number; kid: string; keyRole: string }
  | { kind: 'err'; reason: string };

export default function Page() {
  const log = useLog();
  useBrokerFeed(log);
  const [nonce, setNonce] = useState('');
  const [token, setToken] = useState('');
  const [verdict, setVerdict] = useState<Verdict>({ kind: 'none' });
  const [working, setWorking] = useState(false);

  useEffect(() => {
    log.info(`${CONSUMER_NAME} ready. Click "Start verification" to begin.`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleStart() {
    log.step('Asking our backend for a fresh random nonce…');
    const r = await fetch('/api/start', { method: 'POST' });
    const { nonce: n } = (await r.json()) as { nonce: string };
    setNonce(n);
    setToken('');
    setVerdict({ kind: 'none' });
    sessionStorage.setItem('pendingNonce', n);
    log.success(`Generated nonce ${n.slice(0, 12)}…`);
    log.info('Show this nonce to the user, or use the "easy flow" link below.');
  }

  async function handleVerify(tokenToVerify = token) {
    if (!tokenToVerify) {
      log.error('Paste the token the provider gave the user first.');
      return;
    }
    if (!nonce) {
      log.error('No outstanding nonce — start a verification first.');
      return;
    }
    setWorking(true);
    log.step('Sending token to our backend for signature verification…');
    try {
      const r = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: tokenToVerify, expectedNonce: nonce }),
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
    } finally {
      setWorking(false);
    }
  }

  const { PROVIDER_WEB_URL } = resolvePublicConfig();
  const callback =
    typeof window !== 'undefined' ? `${window.location.origin}/callback` : '';
  const easyLink =
    nonce && callback
      ? `${PROVIDER_WEB_URL}/?nonce=${encodeURIComponent(
          nonce,
        )}&callback=${encodeURIComponent(callback)}`
      : '';

  return (
    <div className="page">
      <div className="header">
        <div>
          <h1>{CONSUMER_NAME}</h1>
          <div className="sub">Age verification demo — consumer side</div>
        </div>
        <span className="badge">decoupled verifier</span>
      </div>

      <div className="stack">
        <div className="card">
          <h2>1. Start a verification</h2>
          <p>We mint a random nonce and keep it in memory. The user must prove someone signed this specific nonce.</p>
          <div className="row">
            <button onClick={handleStart}>
              {nonce ? 'Generate a new nonce' : 'Start verification'}
            </button>
          </div>
          {nonce && (
            <div style={{ marginTop: 12 }} className="stack">
              <div className="sub">Current challenge:</div>
              <div className="mono">{nonce}</div>
            </div>
          )}
        </div>

        {nonce && (
          <div className="card">
            <h2>2a. Manual flow (maximum privacy)</h2>
            <p>
              Ask the user to go to the provider, log in, type the nonce above, and copy
              the resulting token back here.
            </p>
            <div className="field">
              <label>Token from the provider</label>
              <textarea
                value={token}
                onChange={(e) => setToken(e.target.value.trim())}
                placeholder="paste the token the user copied from the provider"
              />
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              <button onClick={() => handleVerify()} disabled={working || !token}>
                {working ? 'Verifying…' : 'Verify token'}
              </button>
            </div>
          </div>
        )}

        {nonce && (
          <div className="card">
            <h2>2b. Easy flow (less privacy)</h2>
            <p>
              One-click redirect: the user logs in at the provider and is sent back here
              with the token in the URL. The provider will learn our callback origin.
            </p>
            <div className="row">
              <a href={easyLink}>
                <button className="secondary" type="button">
                  Continue at {new URL(PROVIDER_WEB_URL).host} →
                </button>
              </a>
            </div>
          </div>
        )}

        {verdict.kind !== 'none' && (
          <div className={`verdict ${verdict.kind === 'ok' ? 'ok' : 'err'}`}>
            {verdict.kind === 'ok' ? (
              <>
                ✓ Age verified: user is <strong>{verdict.ageYears}</strong> years old
                (dob {verdict.dob}). Signed with {verdict.keyRole} key {verdict.kid}.
              </>
            ) : (
              <>✗ {verdict.reason}</>
            )}
          </div>
        )}
      </div>

      <Terminal entries={log.entries} title="consumer-web · activity log" />
    </div>
  );
}
