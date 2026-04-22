# Architecture

## Parties

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│ consumer-web │         │    user      │         │ provider-web │
│  Next.js     │◀── copy │   (browser)  │ copy ──▶│   Next.js    │
│  :3001       │   paste │              │  paste  │   :3002      │
└──────┬───────┘         └──────────────┘         └──────┬───────┘
       │                                                 │
       │ fetch /keys every timespan/2                    │ POST /sign
       │                                                 │
       │                                         ┌───────▼───────┐
       └────────────────────────────────────────▶│    server     │
                                                 │   Node/Express│
                                                 │    :4000      │
                                                 │  private keys │
                                                 └───────────────┘
```

The **server** is the single source of trust. It owns the private keys, rotates them, and
signs `(nonce, dob)` claims. It publishes only public keys plus a rotation timespan.

The **provider-web** is the provider's face. The "user" logs in here (in the demo, a fake
dropdown). It calls the server to produce signed tokens.

The **consumer-web** is the relying party. It generates nonces, renders tokens back into a
verdict, and periodically refreshes its cached public keys from the server.

## Why the consumer talks to the server for keys

Public keys are public by definition, so it is fine for the consumer to fetch them directly
from the provider's infrastructure. Verification runs on the consumer's Next.js server, not
the browser, so the key cache lives in one place per deployment and rotations are
predictable.

## State

- **server**: an in-memory `{ current, next, timespanMs, rotatedAt }` object and a
  `setInterval` that rotates it.
- **provider-web**: no persistent state. A React `useState` for the fake-logged-in user.
- **consumer-web**: key cache lives in the broker module (`src/lib/broker.ts`), pinned
  to `globalThis` for HMR-safety. Refreshed by a cron timer booted from the Next
  `instrumentation` hook at process start — every `timespan/2` ± 20% jitter. Verify
  requests only read the cache; they never trigger a fetch. A WebSocket server on
  port 3011 broadcasts broker events so connected terminals see refreshes live.

Nothing is ever written to disk.

## Endpoints

### `server`
- `GET /keys` → `{ timespanMs, keys: [{ kid, publicKeyPem, role }] }` where `role ∈ {current, next}`.
- `POST /sign` → body `{ nonce, dob }` → `{ token }`. Signs with the *current* key only.

### `provider-web`
- `/` — login & flow picker.
- `/verify` — manual flow: paste nonce, produce token.
- `/verify/auto` — easy flow: accepts `?nonce=&callback=`, auto-signs post-login, redirects.
- `/api/sign` — thin proxy to `server:/sign` so the UI never holds signing state itself.

### `consumer-web`
- `/` — start a verification, displays the nonce and manual/easy flow options.
- `/callback` — easy-flow landing, reads token from URL, calls verify API.
- `/api/start` — mints a nonce (UUID v4).
- `/api/verify` — verifies a token against cached public keys (no network I/O).
- `ws://localhost:3011/terminal` — broker event stream consumed by the frontend
  `useBrokerFeed` hook and rendered into the same terminal.

## Log / terminal

Both frontends render a `<Terminal>` component that consumes a shared `useLog()` hook.
On the consumer side, a second feed — the broker WebSocket — pushes server-side events
into the same log, so the browser shows cron key refreshes live and fully decoupled from
any verify call this tab is making.

## Why a broker instead of lazy fetches

Earlier iterations fetched `/keys` on demand when the cache was stale at verify time. A
provider observing both endpoints could time-correlate a `/keys` request with a nearby
`/sign` and learn which consumer was handling which verification. Moving key refresh to a
cron timer that runs from boot — independent of any request — breaks that correlation.
