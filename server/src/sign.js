import { sign as edSign } from 'node:crypto';
import { getCurrent } from './keys.js';

// The exact bytes that get signed. Keep in sync with consumer-web/src/lib/verify.ts.
export function payloadBytes(nonce, dob) {
  return Buffer.from(`${nonce}|${dob}`, 'utf8');
}

function toBase64Url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function signClaim({ nonce, dob }) {
  const key = getCurrent();
  const sig = edSign(null, payloadBytes(nonce, dob), key.privateKey);
  const body = { nonce, dob, kid: key.kid, sig: toBase64Url(sig) };
  const token = toBase64Url(Buffer.from(JSON.stringify(body), 'utf8'));
  return { token, kid: key.kid };
}
