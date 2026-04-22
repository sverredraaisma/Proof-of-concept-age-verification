# Age Verification PoC

A proof of concept for a privacy-preserving age verification system using rotating asymmetric
key pairs. The age provider signs a challenge plus the user's date of birth; the consumer
verifies the signature locally against published public keys. No personal data flows through
the consumer's backend and the provider never learns *which* consumer is asking.

## Parts

| Part            | Stack     | Port | Purpose                                                 |
| --------------- | --------- | ---- | ------------------------------------------------------- |
| `server/`       | Node.js   | 4000 | Holds the private keys, rotates them, signs DoB claims. |
| `provider-web/` | Next.js   | 3002 | Demo UI for the age provider (bank / government).       |
| `consumer-web/` | Next.js   | 3001 | Demo UI for a consumer that wants the user verified.    |

Each frontend renders a live terminal-style log so you can see every step of the flow.

## Quick start — Docker (recommended)

```bash
cp .env.example .env        # tweak URLs/ports for your host
docker compose up --build
```

Then open <http://localhost:3001> (consumer) and <http://localhost:3002> (provider).

## Quick start — local dev

```bash
# install everything
npm install --prefix server
npm install --prefix provider-web
npm install --prefix consumer-web

# run all three in separate terminals
npm --prefix server run dev
npm --prefix provider-web run dev
npm --prefix consumer-web run dev
```

## Deployment

All public URLs and ports are env-driven via `docker-compose.yml`. `.env.example`
documents every knob; the important ones when moving off `localhost` are:

| Variable            | What it is                                           |
| ------------------- | ---------------------------------------------------- |
| `PROVIDER_WEB_URL`  | Public URL the browser uses for the easy-flow link.  |
| `WS_PUBLIC_URL`     | Public URL the browser uses for the terminal stream. |
| `SERVER_INTERNAL_URL` | How the frontend containers reach the key server.  |
| `PROVIDER_NAME` / `CONSUMER_NAME` | Branding shown in each UI.             |
| `KEY_TIMESPAN_MS`   | How often the key server rotates keys.               |

Public URLs are *injected at request time* into the client's HTML, so the same
built images can be redeployed against different domains without rebuilding.

## The two flows

### Manual flow (maximum privacy)

1. Consumer generates a random nonce, displays it.
2. User logs in at the provider, types the nonce into the provider UI.
3. Provider signs `{ nonce, dob }` with its current private key and shows the user a token.
4. User copies the token back to the consumer.
5. Consumer verifies the signature against its stored public keys and checks the nonce.

The provider never talks to the consumer directly. The consumer never tells the provider
who the user is trying to verify *to*.

### Easy flow (less private, more convenient)

1. Consumer generates a nonce + callback URL, shows a link.
2. User clicks, logs in at the provider. Provider redirects to the callback with the token.
3. Consumer verifies automatically.

The provider now sees the callback URL, so it knows which service the user is verifying for.

## Key rotation

The provider keeps **two** active Ed25519 key pairs at all times. At any moment one is
"current" (used to sign) and one is "next" (pre-published). When the timespan elapses the
next key becomes current and a brand-new next key is generated. The exact rotation moment
is not shared. Consumers fetch `/keys` every `timespan / 2` so the load is spread out and
a consumer never holds a stale key set.

Demo default: `KEY_TIMESPAN_MS=60000` (60 s) so you can watch rotations during a demo.

See [docs/architecture.md](docs/architecture.md) and [docs/crypto-flow.md](docs/crypto-flow.md)
for the full details.

## Status

This is a **demonstration**. It is deliberately simple: signatures are Ed25519 over a
canonical JSON string, there is no replay protection beyond the nonce, no TLS, no login
backend (the provider "login" is a faked dropdown of test users). Do not use in production.
