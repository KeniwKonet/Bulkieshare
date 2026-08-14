# BulkieShare

Group-buying platform for bulk food in Nigeria, starting in Abuja. Members pay for a slot in a
pool (e.g. one slot of a 40-slot cow), the pool proceeds only once it passes a threshold, and
members collect their portion at a neighbourhood hub on a share date.

This is the full frontend — public site, member app, coordinator area, supplier area, and ops
back office — built with **Next.js (App Router) + TypeScript + Tailwind CSS**, implementing the
design handoff in `design/` (`BulkieShare *.dc.html`, reference only, not built from directly at
runtime).

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript**
- **Tailwind CSS v4**, configured with the BulkieShare design tokens (colour, type, spacing,
  zero border radius) in `app/globals.css`
- Fonts: Archivo, Archivo Black, IBM Plex Mono via `next/font/google`
- No backend — all data is static mock data in `lib/mock-data.ts`, typed against the domain
  entities described in the design handoff (`lib/types.ts`)

## Structure

```
app/
  [area]/                 public site: home, pool listing, pool detail, report, hubs
  how-it-works, trust, help, terms, privacy, pool-policy
  join, otp                member sign-in
  pools/[id]/reserve       reserve a slot
  pay/[reservation]        payment screen with countdown
  commitments/[id]/...     people, settlement
  my-pools, collections/... member dashboard, booking, collection pass
  refunds/[id], disputes/... refund + dispute tracking
  account/...              profile, credit, notifications, data export
  groups/...                coordinator acquisition + dashboard + tools
  supply/...                supplier acquisition + portal + WhatsApp path
  admin/...                 ops back office (pools, refunds, disputes, reconciliation, ...)
  hub/...                    offline-style hub agent handover tool
components/
  ui.tsx                   shared primitives: buttons, progress bar, grid tables, pool card
  nav.tsx                   per-area shells/headers (site, app, groups, supply, ops)
  interactive.tsx           client-side bits: stepper, countdown, toggle, OTP input
lib/
  types.ts, mock-data.ts    domain types + mock data
```

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The root route redirects to `/abuja`.

## Build

```bash
npm run build
npm run lint
```
