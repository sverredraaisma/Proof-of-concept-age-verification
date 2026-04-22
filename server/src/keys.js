import { generateKeyPairSync, randomBytes } from 'node:crypto';
import { KEY_TIMESPAN_MS } from './config.js';

function mintKeyPair() {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const kid =
    'k_' +
    new Date().toISOString().replace(/[.:]/g, '-') +
    '_' +
    randomBytes(3).toString('hex');
  return { kid, publicKey, privateKey, createdAt: Date.now() };
}

let current = mintKeyPair();
let next = mintKeyPair();
let rotatedAt = Date.now();

function rotate() {
  const old = current;
  current = next;
  next = mintKeyPair();
  rotatedAt = Date.now();
  console.log(
    `[keys] rotated at ${new Date(rotatedAt).toISOString()} | ` +
      `retired=${old.kid} current=${current.kid} next=${next.kid}`,
  );
}

setInterval(rotate, KEY_TIMESPAN_MS).unref();

export function getCurrent() {
  return current;
}

export function getPublicKeys() {
  return {
    timespanMs: KEY_TIMESPAN_MS,
    rotatedAt,
    keys: [
      {
        kid: current.kid,
        role: 'current',
        publicKeyPem: current.publicKey.export({ type: 'spki', format: 'pem' }),
      },
      {
        kid: next.kid,
        role: 'next',
        publicKeyPem: next.publicKey.export({ type: 'spki', format: 'pem' }),
      },
    ],
  };
}

console.log(
  `[keys] initialised | timespan=${KEY_TIMESPAN_MS}ms ` +
    `current=${current.kid} next=${next.kid}`,
);
