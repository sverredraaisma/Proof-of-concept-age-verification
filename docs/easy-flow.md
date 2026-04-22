# The "easy" flow

The manual flow requires the user to copy two strings between two browser tabs. That is
the privacy-preserving default, but it is annoying. The easy flow trades one piece of
privacy — the provider learns which consumer the user is verifying for — for a smooth
redirect-based experience.

## Steps

1. Consumer generates `nonce` and builds a URL:

   ```
   http://localhost:3002/verify/auto?nonce=<nonce>&callback=<encoded consumer URL>
   ```

   The `callback` URL is a page on the consumer that can receive `?token=…`.

2. The user clicks the link. The provider page loads, prompts for login (fake dropdown),
   then calls the provider's `/api/sign` and redirects:

   ```
   <callback>?token=<token>&nonce=<nonce>
   ```

3. The consumer callback page picks the token out of the URL, calls `/api/verify`, and
   displays the verdict.

## What the provider learns

The `callback` URL, which reveals the origin (and possibly path) of the consumer. The
manual flow does not reveal this.

## What the provider still does not learn

- The user's identity *at the consumer*. From the provider's point of view, a logged-in
  user asked to sign a claim about themselves. It sees a callback origin, not a consumer
  user-id.

## What the user must trust

The consumer builds the callback URL. A malicious consumer could send the user somewhere
unexpected, but the provider can refuse to redirect to non-allowlisted callbacks. In this
demo there is **no allowlist** — production systems would add one.

## Failure modes unique to this flow

- User lands on the callback with no token → nonce was issued but never redeemed. The
  consumer UI should offer to restart.
- Nonce in the callback does not match what the consumer issued → the consumer rejects
  even before verifying the signature.
- Token's `nonce` does not match the URL `nonce` → tampering or cache confusion. Reject.
