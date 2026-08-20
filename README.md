# BulkieShare

Group-buying platform for bulk food in Nigeria, starting in Abuja. Members pay for a slot in a
pool (e.g. one slot of a 40-slot cow), the pool proceeds only once it passes a threshold, and
members collect their portion at a neighbourhood hub on a share date.

This is the full web application — public site, member app, coordinator area, supplier portal,
hub agent tool and ops back office — built with **Next.js (App Router) + TypeScript + Tailwind
CSS** on **Postgres**, implementing the design handoff in `design/`.

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript**
- **Tailwind CSS v4**, configured with the BulkieShare design tokens in `app/globals.css`
- **Postgres** via **Drizzle ORM** — Supabase in production, embedded PGlite locally
- **Server Actions** for every mutation, with authorisation enforced in the data access layer
- **Paystack** for bank-transfer payments, **Termii** for WhatsApp/SMS one-time codes
- Fonts: Archivo, Archivo Black, IBM Plex Mono via `next/font/google`

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

No database setup, no Docker, no accounts needed. On first run the app creates an embedded
Postgres in `./.pglite`, applies the schema and seeds the launch dataset: Abuja live with four
hubs, eight pools across every lifecycle state, and around fifty members.

### Signing in locally

Sign-in is by phone number and a six digit code. When Supabase phone auth is enabled the code
comes from Supabase; otherwise the app falls back to its own OTP, and with no Termii key the code
is not sent anywhere — it is logged to the server console and the OTP screen offers to show it.

Seeded accounts, one per role:

| Role        | Phone           | Sees                                  |
| ----------- | --------------- | ------------------------------------- |
| Member      | `0803 441 9022` | `/my-pools`, five pools, ₦1,940 credit |
| Coordinator | `0812 007 5510` | `/groups/karu-estate`                 |
| Hub agent   | `0705 332 8841` | `/hub`                                |
| Supplier    | `0906 118 2043` | `/supply/orders`                      |
| Ops         | `0803 000 0001` | `/admin/pools`                        |

To skip the code entirely while developing, mint a session cookie directly:

```bash
npm run dev:session -- ops     # member | coordinator | hubAgent | supplier | ops
```

> PGlite is single-writer. Stop `npm run dev` before running `db:*` or `dev:session`.

## Connecting Supabase

Supabase is used for two separate things, configured separately.

**Postgres** needs a connection string, not an API key. Get it from the dashboard under
Project Settings → Database → Connection string → URI, replace `[YOUR-PASSWORD]`, and set it as
`DATABASE_URL`. Then provision:

```bash
npm run db:setup             # schema + seed data
npm run db:setup -- --fresh  # drop and rebuild first
```

Nothing else changes: the schema, the SQL and every query are identical on both drivers, because
PGlite *is* Postgres. The app talks to Postgres directly rather than through PostgREST so it can
use transactions and row locks — the reserve path depends on `SELECT … FOR UPDATE`.

**Storage** holds dispute photos and hub evidence. Set `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`
and `SUPABASE_SECRET_KEY`, then create the bucket:

```bash
npm run storage:setup
```

The bucket is private. Photos are only ever readable through a signed URL that expires in five
minutes, because a member photographing spoiled food is handing us evidence about themselves.

**Auth** is Supabase Auth, phone sign-in. Supabase generates the code, sends it, enforces expiry
and rate limits, and issues the session; this app never sees the code. It needs two things
switched on in the dashboard, and **is not enabled on the project yet**:

1. Authentication → Sign In / Providers → **Phone** → enable
2. An SMS provider: Twilio, Vonage, MessageBird or Textlocal. Termii is not a native Supabase
   provider — to keep delivering through Termii, use a **Send SMS auth hook** pointing at a
   function that calls it.

Until both are done, `lib/auth/supabase-otp.ts` reports itself unavailable and sign-in falls back
to the app's own OTP (see below). The fallback exists only for that gap; once phone auth is on,
the legacy branch in `lib/auth/dal.ts` stops being reachable and can be deleted.

Sessions are Supabase access + refresh tokens in httpOnly cookies. The access token is verified
against the project JWKS (ES256) on every request with no network call. Refresh happens in
`proxy.ts`, because a Server Component cannot set cookies.

Members are linked to `auth.users` by `members.auth_user_id`. The app keeps its own primary key
so every foreign key in the schema stays stable if the auth provider is ever swapped out.

## Going live

Every external provider is optional and degrades to a working mock, so you can turn them on one
at a time. See `.env.example` for each.

| Set this                              | Turns on                                                        |
| ------------------------------------- | --------------------------------------------------------------- |
| `DATABASE_URL`                        | Supabase Postgres instead of the local embedded database         |
| `SUPABASE_URL` + `SUPABASE_SECRET_KEY` | Real photo upload on disputes, stored privately                 |
| `SESSION_SECRET`                      | A real signing key for session cookies (required in production)  |
| `PAYSTACK_SECRET_KEY`                 | Real bank transfers and the settlement webhook                   |
| `TERMII_API_KEY`                      | Real WhatsApp and SMS delivery of sign-in codes                  |

Point your Paystack webhook at `https://YOUR_DOMAIN/api/webhooks/paystack`. Requests are rejected
unless the HMAC signature verifies, and settlement is idempotent, so retries are safe.

## Structure

```
app/
  [area]/                  public site: home, pool listing, pool detail, report, hubs
  join, otp                phone sign-in
  pools/[id]/reserve       reserve slots, applying store credit
  pay/[reservation]        transfer instructions with a live hold countdown
  commitments/[id]/...     your stake: people, settlement
  collections/[id]/...     book a window, collection pass
  my-pools, account/...    member dashboard, credit ledger, notifications, data export
  disputes/..., refunds/... after-care tracking
  groups/...               coordinator dashboard, roster, members, fees, pool builder
  supply/...               supplier portal, quotes, orders, payouts, scorecard
  hub/...                  hub agent handover tool
  admin/                   ops home: what needs a person today
  admin/procurement/...    request quotes, compare them, award, issue the PO
  admin/...                pools, payments, refunds, disputes, reconciliation,
                           members, suppliers, cooperatives, hubs, areas, audit
  actions/                 Server Actions, grouped by audience
  api/                     Paystack webhook, data export, report CSV
  api/v1/handovers         bearer-token sync for the offline hub agent tool
components/                shared UI, forms, and the per-audience shells
lib/
  db/                      Drizzle schema, client, seed
  domain/                  business rules: pools, checkout, commitments, support, supply, ops
  auth/                    Supabase Auth OTP + sessions, legacy OTP fallback, data access layer
  supabase/                client factories and project capability detection
  providers/               Paystack, Termii and Storage adapters, each with a mock
  money.ts, time.ts, phone.ts
proxy.ts                   optimistic auth gate (Next.js 16 renamed middleware to proxy)
scripts/                   db setup, flow verification, dev session minting
drizzle/                   generated SQL migration
```

## Money and correctness

- Every amount is stored as **integer kobo**. `lib/money.ts` is the only place naira appears.
- Reserving locks the pool row, so two members cannot both take the last slot.
- Store credit is debited **when a payment settles**, never when a hold is created, so an
  abandoned reservation costs nobody their credit.
- Payment settlement is **idempotent** — a replayed Paystack webhook creates no second commitment.
- A payment whose reference we do not recognise becomes an **unmatched transfer** for ops rather
  than being dropped.

## The buying chain

The whole company is one chain, and every link has a screen:

```
pool funds → request quotes → suppliers quote → ops awards one
  → purchase order + deposit → delivery → QC → balance paid
```

Awarding is the moment money is committed, so it happens in one transaction: the winning
quote, the losing quotes, the request, the pool's supplier and a new purchase order all move
together. A half-awarded request would leave a supplier believing they hold an order that does
not exist.

Two rules the chain enforces:

- **Nothing can be awarded to a supplier we cannot pay.** Approval requires bank details, and
  the award re-checks it at the moment it would create the obligation.
- **A funded pool with nothing on order is surfaced everywhere** — the ops home, the buying
  board and the pool's own page. Members have paid; that is the state that quietly goes wrong.

## Two sides of every relationship

Suppliers and cooperatives each have a portal *and* an ops screen, and they are not the same
thing:

| Who        | Their own portal    | What ops sees                        |
| ---------- | ------------------- | ------------------------------------ |
| Supplier   | `/supply/*`         | `/admin/suppliers`, `/admin/suppliers/[id]` |
| Coordinator| `/groups/[org]/*`   | `/admin/groups`, `/admin/groups/[slug]`     |

Two rules the ops side enforces:

- **A supplier cannot be approved without bank details.** Approval is what makes them eligible
  for a purchase order, so approving one we cannot pay would strand an order.
- **A coordinator role follows the cooperative.** Handing a group over promotes the incoming
  coordinator and demotes the outgoing one — unless they still run another group. A role that
  outlives its reason is how stale privilege accumulates.

## Checks

```bash
npm run typecheck     # tsc --noEmit
npm run lint          # eslint
npm run build         # production build
npm run verify        # both suites below
npm run verify:flow   # the money path
npm run verify:admin  # supplier and cooperative administration
npm run verify:procurement  # the buying chain
```

`verify:flow` walks a member through reserve → pay → commit → name a slot → book a window →
collect, and asserts slot counts, the credit ledger and pool state after every step, including
over-reservation, webhook replay and double-refund protection.

`verify:admin` covers the approval gate, partial edits not blanking captured bank details,
portal-access grants, slug collisions, and coordinator handover in both directions.

`verify:procurement` walks a request through quotes to an issued purchase order, asserting
that an award values the order correctly, splits the deposit, refuses a supplier with no bank
account, cannot happen twice, and settles the losing quotes rather than leaving them dangling.
