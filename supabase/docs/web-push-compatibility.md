# Web Push compatibility decision

Issue: #70  
Validated: 2026-08-27

## Decision

Use `@mmmike/web-push@1.3.0` for the production Web Push delivery adapter in
issue #75. Import the package from npm through a function-local `deno.json` and
commit the generated Deno lockfile. Do not use the Node-focused `web-push`
package or implement Web Push cryptography in HomeTeam.

The selected package is ESM-only, has no runtime dependencies, uses the native
Web Crypto and Fetch APIs, produces RFC 8291 `aes128gcm` payloads, and creates
RFC 8292 VAPID authorization. Its send contract also distinguishes expired
subscriptions (HTTP 404/410), retryable push-service failures, and invalid
caller input without exposing a private VAPID key to the browser.

## Compatibility evidence

`supabase/functions/web-push-spike` is a non-production probe. It generates
ephemeral VAPID and subscriber key pairs, encrypts a representative payload,
captures the outbound request at a mock push-service boundary, and verifies:

- a POST with an encrypted binary body;
- `Content-Encoding: aes128gcm`;
- RFC 8292 `Authorization: vapid ...`;
- rejection of a non-HTTPS subscription endpoint.

The probe must pass both as a Deno test and while served by the local Supabase
Edge Runtime. No production VAPID value, browser subscription, endpoint, or
personal data is used or logged.

The recorded local run passed every check on
`supabase-edge-runtime-1.74.2 (compatible with Deno v2.1.4)`. A GET request was
also rejected with HTTP 405; the probe accepts only POST behind the normal Edge
Function gateway authentication boundary.

## Reproduction

Run the isolated Deno test with Deno 2.1, then exercise the local Edge Runtime:

```sh
deno test supabase/functions/web-push-spike/probe_test.ts
npx --yes supabase@2.110.0 functions serve web-push-spike --no-verify-jwt
curl --request POST http://127.0.0.1:54321/functions/v1/web-push-spike
```

The HTTP response reports the actual Deno version and each compatibility check.
The `--no-verify-jwt` flag is for this local mock probe only; deployed Edge
Functions retain gateway JWT verification unless their production contract
explicitly implements a stricter cron/service boundary.

## Production constraints for #75

- Load `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` only from Supabase secrets.
- Keep subscription endpoints and encryption keys out of payloads and logs.
- Revalidate recipient access and preferences immediately before delivery.
- Treat HTTP 404/410 as device-specific invalidation; do not disable a user's
  other subscriptions.
- Retry only temporary network, rate-limit, and server failures with bounded
  backoff and the durable outbox idempotency key.
- Pin upgrades and rerun this probe before changing the package or Edge Runtime.

## Sources checked

- [Supabase Edge Function dependencies](https://supabase.com/docs/guides/functions/dependencies)
- [Supabase changelog](https://supabase.com/changelog)
- [`@mmmike/web-push` package contract](https://www.npmjs.com/package/@mmmike/web-push)
- [RFC 8291: Message Encryption for Web Push](https://www.rfc-editor.org/rfc/rfc8291)
- [RFC 8292: VAPID](https://www.rfc-editor.org/rfc/rfc8292)

## Deferred validation

A real iPhone Home Screen subscription and push-service delivery require device
permission plus production/staging VAPID secrets. Those credential-bound checks
remain owned by #75, #77, #86, and #90; this spike resolves runtime and library
compatibility without broadening into delivery implementation.
