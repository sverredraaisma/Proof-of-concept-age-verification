# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this project is

A **proof of concept** for age verification using rotating asymmetric keys. Three sibling
apps talk to each other; there are no shared packages and no monorepo tooling — each app
has its own `package.json` and is installed/run independently.

- `server/` — Node.js + Express, holds the private keys, port 4000.
- `provider-web/` — Next.js (App Router, TS), the age provider's UI, port 3002.
- `consumer-web/` — Next.js (App Router, TS), the consumer's UI, port 3001.

## Non-negotiable principles

1. **User feedback is the product.** This is a demo. Every action on either frontend must
   produce a clear, timestamped line in the on-screen terminal. If you add a step and do
   not log it, you've broken the demo. Log lines should read like a narrated story: "Generated
   nonce `abcd1234…`", "Fetched 2 public keys from provider", "Signature valid ✓".
2. **Keep it simple.** No auth system, no database, no persistence. The "login" at the
   provider is a fake dropdown. State lives in memory (server) or React state (frontends).
3. **The manual flow must stay fully decoupled.** The consumer backend and provider backend
   must never exchange requests during the manual flow — everything crosses the boundary
   as text the user copy-pastes. Do not "cheat" by adding a direct API call.
4. **Signatures are verified on the consumer's Next.js server**, not in the browser. Public
   keys are fetched there and cached. This keeps the key cache lifetime honest (one cache
   per consumer deployment, not per browser tab).
5. **Key fetches must be independent of verify requests.** If the consumer fetches `/keys`
   lazily on verify, the provider can time-correlate the fetch with a nearby signing
   request. The `broker` module (`src/lib/broker.ts`) owns a cron timer (base
   `timespan/2` ± 20% jitter) that refreshes the cache regardless of activity, booted by
   `src/instrumentation.ts`. `verifyToken` only *reads* the cache via `getCachedKeys()` —
   it must never call `fetch`. Do not re-introduce a lazy refresh path.
6. **Broker events stream to the browser over WebSocket** (`src/lib/wsServer.ts`, port
   3011, path `/terminal`). The `useBrokerFeed` hook pipes them into the same `useLog`,
   so the terminal shows cron refreshes and rotations even when no user action is
   happening. The server does **not** buffer or replay past events — reloading the page
   intentionally clears the terminal so it never grows unbounded across the demo's
   lifetime. A freshly opened tab only sees events that fire while its socket is open.

## Cryptography

- **Algorithm:** Ed25519, via Node's built-in `crypto` module (`generateKeyPairSync('ed25519')`,
  `sign(null, data, privateKey)`, `verify(null, data, publicKey, sig)`). No external crypto
  libraries. Public keys are exported as SPKI PEM; signatures are base64url.
- **Signed payload:** the exact UTF-8 bytes of `` `${nonce}|${dob}` ``. Pipe-delimited, not
  JSON, so there is no canonicalization ambiguity. If you change the payload format you
  must change it in `server/src/sign.js` and `consumer-web/src/lib/verify.ts` together.
- **Token format:** URL-safe base64 of a JSON object `{ nonce, dob, kid, sig }`. `kid` is
  the key id the consumer uses to pick which stored public key to verify with.

## Key rotation contract

- The server always has exactly two keys: `current` and `next`. `current` signs; `next` is
  published ahead of time.
- `KEY_TIMESPAN_MS` (default 60000) is how long a key stays `current`. Rotation fires on
  that interval: `next` becomes `current`, a fresh `next` is generated, the old `current`
  is discarded.
- The **exact rotation moment is not advertised**. The `/keys` response tells the consumer
  the *timespan*, not the next rotation timestamp. Consumers refetch every `timespan / 2`.
- Consumer must accept signatures from either stored key (the incoming signature's `kid`
  picks which one).

## Ports, env & deployment

Every port and URL is env-driven for Docker deployment. Defaults are set in
`docker-compose.yml` and explained in `.env.example`.

- **Server-side env** (`SERVER_URL`, `WS_PORT`, `PROVIDER_NAME`, `CONSUMER_NAME`,
  `KEY_TIMESPAN_MS`) is read directly via `process.env` in the Node runtime.
- **Client-side URLs** (`PROVIDER_WEB_URL`, `WS_PUBLIC_URL`) cannot be read from
  `process.env` in the browser bundle, so each Next app injects them into
  `window.__APP_CONFIG__` from its root layout. Client code reads them via
  `resolvePublicConfig()` in `src/lib/publicConfig.ts`. `layout.tsx` is marked
  `export const dynamic = 'force-dynamic'` so the injected values are re-read on
  every request — the same image can be redeployed against different domains
  with only an env-var change.
- Both Next apps use `output: 'standalone'` in `next.config.mjs`; the Dockerfile
  copies `.next/standalone` + `.next/static` into the runtime image and runs
  `node server.js` with `PORT`/`HOSTNAME` env vars.

## Conventions

- TypeScript on both frontends, plain JS on the server (nothing in the server needs types
  badly enough to justify a build step for a demo).
- Tailwind on both frontends. Terminal uses a monospace font, dark background, green text,
  and auto-scrolls to the bottom.
- Log entries have a `level` of `info` | `step` | `success` | `warn` | `error` and a
  monospace timestamp `HH:MM:SS.mmm`.
- Do not introduce a shared npm workspace. The apps installing independently is a feature
  — it makes the demo robust to partial setup.

## When extending

- **Changing the signed payload** (e.g. to "over18" instead of DoB): touch `server/src/sign.js`
  and `consumer-web/src/lib/verify.ts`. Update the terminal log strings so the user sees
  what is being signed.
- **Adding a flow variant**: add a new route under both frontends and a new doc under `docs/`.
  Do not fork the existing flow files — keep `manual` and `easy` independent.
- **Before reporting the task complete**, run each of the three apps and walk through both
  flows in a browser. Type-checking alone does not validate a demo.
