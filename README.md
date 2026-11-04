# DeliveryPass

A full-stack Next.js MVP for Nigerian sellers. DeliveryPass combines managed account authentication, private delivery orders, NIPOST postcode checks, and rider-ready delivery passes.

## Included

- Sign-up and sign-in with managed Neon Auth (Better Auth).
- Email verification gate before seller data or postcode requests are accessible.
- Verification-code, forgot-password, and password-reset screens.
- Private PostgreSQL orders scoped to the authenticated seller on every server operation.
- Save a draft, edit and validate an order, dispatch, mark delivered, archive, and restore.
- Store profile, password change, sign-out, and sign out other devices.
- CSV export and printable/copyable delivery notes.
- A separate `/demo` workspace with fictional, temporary data and no access to seller records.

## NIPOST status

The real integration uses `/v1/search/autocomplete` and `/v1/lookup` at L1. Search supports individual postcode segments. During testing, authenticated sandbox requests returned HTTP 200 but the five documented sample codes returned `valid:false` / `status:not_found`, and autocomplete returned no suggestions. A successful external lookup remains unverified. Drafts can still be saved. Dispatch is allowed only after a successful server-side check. Demonstration checks never become production validations.

## Local setup

Requires Node.js 22.13 or newer.

```sh
npm ci
```

Copy `.env.example` to `.env.local` and configure:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Server-only PostgreSQL connection string |
| `NEON_AUTH_BASE_URL` | Managed Neon Auth endpoint |
| `NEON_AUTH_COOKIE_SECRET` | Cryptographically random secret, at least 32 characters |
| `APP_URL` | Exact application origin, e.g. `http://127.0.0.1:3000` |
| `POSTCODE_API_KEY` | Server-only NIPOST test or live key |

Enable Better Auth for your Neon project and add the app's exact origin to its trusted domains. Apply `migrations/001_mvp.sql` with the database owner's approval. The DeliveryPass database created for this project already has that migration applied.

```sh
npm run dev:next
```

Open `http://127.0.0.1:3000/auth/sign-in`. Create an account, then request and enter an email verification code. `/demo` works without an application account.

Secrets belong in `.env.local` or your hosting provider's environment settings. Never commit them or prefix them with `NEXT_PUBLIC_`. The supplied `.env.example` contains names only.

## Deployment

The conventional Next.js app is suitable for a Render Node web service. Use:

- Build: `npm ci --include=dev && npm run build:next`
- Start: `npm run start:next -- --port $PORT`
- Health check: `/api/health`
- Node: 22 or newer, satisfying `package.json` engines.

Configure all environment variables above on the host. Set `APP_URL` to the exact HTTPS deployment origin and add that origin to Neon's trusted domains. The frontend never receives the database password, cookie secret, or NIPOST secret.

The existing Sites deployment uses the retained Vinext build (`npm run build`). Its platform access policy is separate from DeliveryPass accounts; a private Site still requires ChatGPT access before the application login.

## Security implementation

Passwords are handled by managed authentication, not by application tables or browser storage. Session cookies are HttpOnly; production cookies require HTTPS. Server authorization fetches a fresh provider session and checks email verification. Mutation routes validate the exact request origin. SQL uses parameterized queries and every order read/update includes the server-derived owner ID. Requests are validated with Zod, mutation bodies are size-limited, and authentication/order/postcode requests have database-backed throttling. Status transitions are checked server-side. Version checks prevent stale edits from silently overwriting changes. Auth proxy routes expose an explicit allowlist; admin endpoints are not forwarded. Authenticated API responses are non-cacheable.

Production Next.js responses include CSP, anti-framing, content-type, referrer, permissions, and HTTPS security headers. No claim is made that these controls replace a security review.

## Before real customer rollout

- Configure a custom SMTP provider in Neon Auth. The shared sender is for development/testing, with delivery limits.
- Test email verification and reset delivery with your own inbox; delivery has not been independently verified here.
- Confirm working NIPOST data and the permitted production access level.
- Set a retention policy and operational backup/restore procedures; monitor errors and request limits.
- Confirm the chosen hosting audience and Render workspace before creating a public service.

No multi-staff roles, payments, rider GPS tracking, or automatic route optimisation are included. Orders are manually moved through dispatch/delivery states. The dashboard currently loads up to the latest 1,000 orders for the seller. Existing browser-only prototype records are not silently imported into the account database.

## Checks

```sh
npm run typecheck
npm run test:postcode
npm run test:security
npm run build:next
```

Postcode tests use controlled upstream responses. Security tests cover rejected ownership fields, invalid transitions, and unsafe return paths. When `DATABASE_URL` is supplied, they also exercise real PostgreSQL isolation, optimistic versions, status transitions, and throttling, with test authentication contexts and clearly synthetic QA orders. Test rows are retained instead of being deleted automatically. Separate HTTP checks exercised actual managed sign-up/login, HttpOnly cookies, sign-out, verification gating, origin rejection, and blocked admin proxy routes. Email delivery itself remains a launch check.
