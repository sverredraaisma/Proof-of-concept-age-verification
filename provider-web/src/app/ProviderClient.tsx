'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Terminal } from '@/components/Terminal';
import { useLog } from '@/lib/useLog';
import { DEMO_USERS, type DemoUser } from '@/lib/config';
import { resolvePublicConfig } from '@/lib/publicConfig';

type Mode = 'manual' | 'easy';

export default function ProviderClient() {
  const { PROVIDER_NAME } = resolvePublicConfig();
  const params = useSearchParams();
  const urlNonce = params.get('nonce') ?? '';
  const urlCallback = params.get('callback') ?? '';
  const mode: Mode = urlNonce && urlCallback ? 'easy' : 'manual';

  const log = useLog();
  const [user, setUser] = useState<DemoUser | null>(null);
  const [nonce, setNonce] = useState(urlNonce);
  const [token, setToken] = useState('');
  const [working, setWorking] = useState(false);

  const title = useMemo(
    () => (mode === 'easy' ? 'Automated verification' : 'Manual verification'),
    [mode],
  );

  useEffect(() => {
    log.info(`${PROVIDER_NAME} ready — mode: ${mode}`);
    if (mode === 'easy') {
      log.step(`Received nonce from consumer: ${urlNonce.slice(0, 16)}…`);
      log.step(`Callback URL: ${urlCallback}`);
      log.info('Waiting for user to log in before signing.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogin(u: DemoUser) {
    setUser(u);
    log.success(`Logged in as ${u.name} (dob ${u.dob})`);
  }

  async function handleSign() {
    if (!user) {
      log.error('Must be logged in before signing.');
      return;
    }
    if (!nonce) {
      log.error('Nonce is empty — ask the consumer for their challenge.');
      return;
    }
    setWorking(true);
    log.step(`Signing claim { nonce=${nonce.slice(0, 12)}…, dob=${user.dob} }`);
    try {
      const r = await fetch('/api/sign', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ nonce, dob: user.dob }),
      });
      if (!r.ok) {
        const err = await r.text();
        log.error(`Sign failed: ${err}`);
        return;
      }
      const data = (await r.json()) as { token: string; kid: string };
      log.success(`Signed with key ${data.kid}`);
      setToken(data.token);
      log.info('Token is ready for the user to copy back to the consumer.');

      if (mode === 'easy') {
        const url = new URL(urlCallback);
        url.searchParams.set('token', data.token);
        url.searchParams.set('nonce', nonce);
        log.step(`Redirecting to consumer: ${url.toString().slice(0, 80)}…`);
        setTimeout(() => {
          window.location.href = url.toString();
        }, 600);
      }
    } catch (e) {
      log.error(`Network error: ${(e as Error).message}`);
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="page">
      <div className="header">
        <div>
          <h1>{PROVIDER_NAME}</h1>
          <div className="sub">{title}</div>
        </div>
        <span className={`badge ${mode === 'easy' ? 'ok' : ''}`}>
          {mode === 'easy' ? 'easy flow (auto-redirect)' : 'manual flow (copy & paste)'}
        </span>
      </div>

      <div className="stack">
        <div className="card">
          <h2>1. Log in</h2>
          <p>In a real system this would be your bank or government ID login. Pick a demo user:</p>
          <div className="row">
            {DEMO_USERS.map((u) => (
              <button
                key={u.id}
                onClick={() => handleLogin(u)}
                className={user?.id === u.id ? '' : 'secondary'}
              >
                {u.name}
              </button>
            ))}
          </div>
          {user && (
            <p style={{ marginTop: 12 }}>
              Logged in as <strong>{user.name}</strong> · dob <code>{user.dob}</code>
            </p>
          )}
        </div>

        <div className="card">
          <h2>2. Challenge from the consumer</h2>
          <p>
            {mode === 'easy'
              ? 'The consumer provided this nonce via the URL. It will be signed together with your date of birth.'
              : 'Paste the random string the consumer is showing you. It will be signed together with your date of birth.'}
          </p>
          <div className="field">
            <label>Nonce</label>
            <input
              value={nonce}
              onChange={(e) => setNonce(e.target.value.trim())}
              placeholder="paste the consumer's challenge here"
              readOnly={mode === 'easy'}
            />
          </div>
        </div>

        <div className="card">
          <h2>3. Sign</h2>
          <p>
            The server signs the UTF-8 bytes of <code>nonce|dob</code> with its current
            private key and returns a token.
          </p>
          <div className="row">
            <button onClick={handleSign} disabled={working || !user || !nonce}>
              {working ? 'Signing…' : mode === 'easy' ? 'Sign & return to consumer' : 'Produce token'}
            </button>
          </div>
          {token && mode === 'manual' && (
            <div style={{ marginTop: 12 }} className="stack">
              <div className="sub">Give this token to the consumer:</div>
              <div className="mono">{token}</div>
              <button
                className="secondary"
                onClick={() => {
                  navigator.clipboard.writeText(token);
                  log.info('Token copied to clipboard.');
                }}
              >
                Copy to clipboard
              </button>
            </div>
          )}
        </div>
      </div>

      <Terminal entries={log.entries} title="provider-web · activity log" />
    </div>
  );
}
