# DeliveryPass

A Next.js App Router prototype for Nigerian sellers: collect recipient details, check a postcode, prepare a delivery note, and record dispatch.

**Demo:** https://deliverypass-ng-prototype.racingtarragon.chatgpt.site/

**Status:** working prototype; successful end-to-end NIPOST sandbox validation remains unverified. Authenticated requests returned HTTP 200, but the five documented sandbox codes returned `valid:false` / `status:not_found`, and autocomplete returned empty suggestions during testing.

## Run locally

Requires Node.js 22.13 or newer.

```sh
npm install
npm run dev
```

The hosted preview uses Vinext, a Next.js-compatible runtime for Cloudflare Workers. The pages and route handlers use Next.js App Router conventions. To use the conventional Next.js development server, run `npm run dev:next` instead.

## Postcode API

Without `POSTCODE_API_KEY`, the app uses four labelled fixtures. No request to the national API is made in demo mode. Sample customers, addresses, and phone numbers are fictional. Fixture matching is not live postcode verification.

For conventional Next.js, copy `.env.example` to `.env.local` and set your own key. For the hosted Site, configure `POSTCODE_API_KEY` as a server-side secret in the hosting environment, then redeploy. Never prefix the key with `NEXT_PUBLIC_` or paste it into the application UI.

The server calls only `https://api.postcode.gov.ng`: autocomplete at `/v1/search/autocomplete` and basic L1 validation at `/v1/lookup`. The API key is sent through the `X-API-Key` header, never returned to the browser. L1 checks postcode validity only; street addresses and delivery instructions are entered by customers. Codes for test keys must come from the API sandbox dataset, which differs from live codes.

With a `nipost_test_` key, the app displays **NIPOST sandbox** and saves checks as sandbox results. Use `FC-01-A01-KP-27` or `FC-01-A01-LR-01` to test. Existing demo orders retain their demo labels. With no key it remains in demo mode. Production checks use a live key after KYB approval.

Official documentation: https://docs.postcode.gov.ng/quickstart
Access levels: https://docs.postcode.gov.ng/concepts/lookup-levels

## Pitch rehearsal (90 seconds)

1. Explain the problem: sellers and riders need a consistent address reference plus human delivery instructions.
2. Show the dashboard and clearly labelled demonstration orders.
3. Open a sample delivery pass and copy the rider note.
4. Record dispatch and show filtering and search.
5. Open New delivery and demonstrate a sandbox postcode check; disclose the current not-found response.
6. Explain the next milestone: obtain working sandbox codes and test with sellers.

To rehearse a successful simulated creation locally, leave the API key unset and use the clearly labelled demo dataset. Never present a simulated match as a successful NIPOST lookup.

Say clearly that reduced delivery failures are a hypothesis to test with sellers, not a measured result.

## Prototype boundaries

Orders are saved in localStorage on the current browser; there is no database or cross-device order sharing. Reloading preserves orders when browser storage is available. Copy delivery note shares plain text through the clipboard; it does not send a message. Dispatch is a manual status update, not rider tracking. CSV export contains the currently filtered orders. The public hosted demo can be opened without login. Use fictional customer details only. There is no multi-seller account system, shared order database, or cross-device order access.

Before collecting real customer information or running a seller pilot, add authenticated seller accounts, database-backed order ownership, retention controls, and an appropriately protected customer intake flow. Do not treat browser storage as secure multi-user storage.

## Validation

```sh
npm run typecheck
npm run test:postcode
npm run build
```

Tests cover code normalization, malformed codes, demo matching, upstream L1 requests, upstream failure handling, and ensuring live errors never silently fall back to demo data. Unit tests use mocked upstream responses. They do not establish that the external sandbox can resolve a postcode; that result remains pending.
