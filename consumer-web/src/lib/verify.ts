import { createPublicKey, verify as edVerify } from 'node:crypto';
import { getCachedKeys } from './broker';

// Matches server/src/sign.js: bytes signed are `${nonce}|${dob}` in UTF-8.
function payloadBytes(nonce: string, dob: string) {
  return Buffer.from(`${nonce}|${dob}`, 'utf8');
}

function fromBase64Url(s: string): Buffer {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

export type VerifyOk = {
  ok: true;
  nonce: string;
  dob: string;
  kid: string;
  keyRole: 'current' | 'next';
  ageYears: number;
};

export type VerifyFail = { ok: false; reason: string };
export type VerifyResult = VerifyOk | VerifyFail;

export type VerifyTrace = {
  log: (level: 'info' | 'step' | 'success' | 'warn' | 'error', msg: string) => void;
};

function computeAge(dobIso: string): number {
  const [y, m, d] = dobIso.split('-').map(Number);
  const today = new Date();
  let age = today.getFullYear() - y;
  const hadBirthday =
    today.getMonth() + 1 > m ||
    (today.getMonth() + 1 === m && today.getDate() >= d);
  if (!hadBirthday) age -= 1;
  return age;
}

export async function verifyToken(
  token: string,
  expectedNonce: string,
  trace: VerifyTrace,
): Promise<VerifyResult> {
  let payload: { nonce: string; dob: string; kid: string; sig: string };
  try {
    payload = JSON.parse(fromBase64Url(token).toString('utf8'));
  } catch {
    return { ok: false, reason: 'Token is not valid base64url JSON.' };
  }
  const { nonce, dob, kid, sig } = payload;
  if (!nonce || !dob || !kid || !sig) {
    return { ok: false, reason: 'Token is missing required fields.' };
  }
  trace.log('info', `Token decoded · nonce=${nonce.slice(0, 12)}… dob=${dob} kid=${kid}`);

  if (nonce !== expectedNonce) {
    return {
      ok: false,
      reason: 'Nonce mismatch — token nonce does not match the challenge we issued.',
    };
  }
  trace.log('success', 'Nonce matches the challenge this consumer issued.');

  trace.log('step', 'Reading signing keys from the broker cache (NOT fetching).');
  const keyset = await getCachedKeys();
  const ageSec = Math.floor((Date.now() - keyset.fetchedAt) / 1000);
  trace.log(
    'info',
    `Cache age ${ageSec}s, holds ${keyset.keys
      .map((k) => `${k.role}:${k.kid}`)
      .join(', ')}`,
  );

  const match = keyset.keys.find((k) => k.kid === kid);
  if (!match) {
    return {
      ok: false,
      reason: `Unknown signing key (kid=${kid}). Broker cache holds ${keyset.keys
        .map((k) => k.kid)
        .join(', ')}.`,
    };
  }
  trace.log('info', `Verifying with stored ${match.role} key ${match.kid}.`);

  const pub = createPublicKey(match.publicKeyPem);
  const valid = edVerify(null, payloadBytes(nonce, dob), pub, fromBase64Url(sig));
  if (!valid) return { ok: false, reason: 'Signature verification failed.' };
  trace.log('success', 'Ed25519 signature is valid.');

  const ageYears = computeAge(dob);
  trace.log('info', `Computed age from dob: ${ageYears} years.`);

  return { ok: true, nonce, dob, kid, keyRole: match.role, ageYears };
}
