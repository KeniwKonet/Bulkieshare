# Handoff: BulkieShare — full product UI

## Overview

BulkieShare is a group-buying platform for bulk food in Nigeria, starting in Abuja. Members pay for a *slot* in a *pool* (e.g. one slot of a 40-slot cow), the pool only proceeds once it passes a threshold, and members collect their portion at a neighbourhood hub on a share date. There is no delivery in phase 0.

This bundle contains the complete designed UI: a public site, a member app, a coordinator area, a supplier area, and an ops back office. 49 route entries in total; the sitemap file is the index.

The product's hard problems are financial, not visual: members pay before the goods exist, a cow does not divide evenly, and a failed pool must refund dozens of people fast. Almost every unusual decision in these designs exists to serve one of those three facts. Read "Domain rules the UI must enforce" before writing code — implementing these screens without those rules produces something that looks right and behaves wrongly.

## About the design files

The files in `design/` are **design references created in HTML** — prototypes showing intended look, copy, and behaviour. They are not production code to copy.

They are authored in a custom preview format (`.dc.html` with a `support.js` runtime). Do not attempt to port that runtime. Open the files in a browser to see the designs, read the markup for exact values, and **recreate the UI in the target codebase's own environment** using its established patterns and libraries. If no codebase exists yet, Next.js (App Router) with TypeScript is the natural fit given the routing structure and the SEO requirement on public listing pages.

Every screen is static markup with no live state — no interaction is wired up. Placeholder photo areas are diagonal-hatch blocks labelled `PHOTO · …`; substitute real image slots.

## Fidelity

**High fidelity.** Colours, typography, spacing, copy, and table structures are final and intentional. Recreate them closely. Two caveats:

- Layouts are authored at fixed widths (1180px for desktop pages, 390px for phone screens, 576/766px for panel-sized pages). These are *canvas* widths for review, not breakpoints. You must add responsive behaviour — see "Responsive behaviour".
- All copy is final and deliberately plain. Do not rewrite it, do not make it more enthusiastic, and do not add em dashes. Several strings exist specifically to pre-empt a support call (the late/short/duplicate payment rules, the "refunds go to the payer" warning). Changing them changes the product.

## Design tokens

### Colour

| Token | Hex | Use |
| --- | --- | --- |
| ink | `#101010` | text, borders, filled bars, dark surfaces |
| paper | `#F2F0EA` | page background |
| card | `#FFFFFF` | raised surfaces inside paper |
| lime | `#CDF23A` | primary action, "live"/positive accents. On ink or paper, never as text colour on white |
| rust | `#B4441F` | urgency, countdown, thresholds, member-facing warnings |
| rust-dark | `#8A3B1E` | ops-side failure states (underfilled, rejected, investigate) |
| green | `#2F6B45` | settled, matched, verified |
| amber | `#E2A400` | ops attention (awaiting approval, logged view) |
| text-mid | `#3A382F` | body copy on paper |
| text-dim | `#54524A` | secondary copy, labels |
| text-faint | `#A8A69C` | placeholders, disabled |
| rule | `#DCD9CF` | hairlines on paper |
| rule-card | `#EDEAE1` | hairlines inside white cards |
| dark-rule | `#4A4A44` / `#333` | hairlines on ink surfaces |
| dark-dim | `#B9B7AE` / `#8C8A82` | body / label text on ink |

Hatch fill used for placeholder imagery: `repeating-linear-gradient(135deg,#EDEAE1 0 7px,#E3DFD4 7px 14px)`.
Hatch fill used for *unpaid reservations* on a progress bar: `repeating-linear-gradient(45deg,#101010 0 2px,transparent 2px 6px)`.

The canvas grey behind the review frames (`#8E8C86`) is not part of the product.

### Typography

Three families, loaded from Google Fonts:

- **Archivo Black** — display only. Headlines, big numbers, page titles. Always with `letter-spacing:-.02em` to `-.035em`; tighter as size grows.
- **Archivo** (400/500/600/700) — all UI text and body copy.
- **IBM Plex Mono** (400/500/600) — labels, table headers, IDs, timestamps, money in tables, codes, and any string a human reads aloud. Labels are uppercase at 10.5–12.5px, often with `color:#54524A`.

Money in a *headline* position uses Archivo Black; money in a *table or ledger* uses IBM Plex Mono so columns align.

Scale in use (px): display 76/72/52/44/42/38/34/30/28/26; heading 23/21/20/19/17; body 16/15.5/15/14.5/14; mono label 13/12.5/12/11.5/11/10.5. Body line-height 1.5–1.6. Long paragraphs get `text-wrap: pretty` and a `max-width` in `ch` (34–62ch depending on column).

Variant `1a` is the chosen direction and the one all product screens use. `BulkieShare Variants.dc.html` also contains three unbuilt alternatives (1b editorial/warm for coordinators, 1c serif/editorial for investors, 1d utility for suppliers) — reference only, do not build.

### Geometry

**Border radius is zero everywhere.** No rounded corners, no soft shadows, no glassmorphism. Structure comes from 1px `#101010` borders and hairline dividers. This is deliberate and load-bearing for the brand; do not "soften" it.

Spacing: 6 / 8 / 10 / 12 / 14 / 16 / 18 / 20 / 22 / 24 / 26 / 30 / 34 / 44 / 52 / 56px. Page gutters 24–30px on ops/app pages, 30–56px on marketing pages. Card padding 16–26px.

Layout is flex/grid with `gap` throughout — no margin-based spacing between siblings. Tables are CSS grid with explicit `fr` column templates, not `<table>`; a header row on `#101010` with `#8C8A82` mono labels, then body rows separated by `1px solid #EDEAE1`. Keep this pattern; it is the densest, most repeated structure in the product.

## The pool progress bar

The single most important component. It appears on the public site, in listings, in pool detail, in the member dashboard, in the coordinator roster, and in the ops board. Get it right once and share it.

Anatomy, outermost to innermost:

1. Track: `1px solid #101010`, background `#F2F0EA` (or `#fff` on paper), height 12/14/16/22/24/26px depending on context.
2. **Paid fill**: solid `#101010`, from the left, width = paid slots / total slots.
3. **Reserved-but-unpaid**: 45° hatch of `#101010` on transparent, immediately after the paid fill. Never merged into the paid fill.
4. **Threshold marker**: a 2px `#B4441F` vertical rule at threshold/total, overhanging the track by 5–8px top and bottom.

Below it, two mono captions at 11.5–12px: left `"3 reserved, payment pending"`, right the threshold state (`"threshold 16 passed"` in rust, or `"THRESHOLD 16"`).

Why: the bar must never move backwards. If unpaid holds were counted as fill, an expiring hold would shrink the bar, and a bar that retreats reads as money disappearing. Hatching also makes "nearly there" honest — 36/40 with 3 hatched is really 33 paid.

## Domain rules the UI must enforce

These are product rules, not styling. Each one is visible in at least one screen and should be enforced in code.

1. **Collection is confirmed, never assumed.** Reserve requires an explicit checkbox naming the hub and share date ("I can collect at Lugbe hub on Sunday 24 August. This pool is not delivered."). A member who cannot reach the hub becomes a no-show and a refund argument.
2. **A payment is never bounced.** The pay screen states, before payment, what happens if money is late, short, or duplicated. Late → slots re-reserve if any remain, otherwise store credit, never a silent return. Short → held as credit with the shortfall stated. Double → second payment becomes credit same day.
3. **Refunds go to the payer, never split to beneficiaries.** A coordinator who paid ₦100,800 for twelve people is refunded the whole amount; redistribution is their job. This is stated on the beneficiary screen and again on the coordinator dashboard.
4. **Escrow is not operating cash.** The reconciliation and pool-board headline figure is operating cash *excluding* escrow, with members' money shown separately and labelled "not ours". No screen in the company ever shows a combined figure.
5. **Every money movement above threshold needs a second approver who is a different user.** The refund queue shows both approval slots explicitly and cannot be completed by one person.
6. **Tolerance bands are published before payment and settled automatically.** Meat pools state ±8%. Under the band, credit is issued without the member complaining, with the scale photo attached.
7. **Allocation is seeded and the seed is published before allocation runs.** Overrides require a written reason and appear in the public pool report.
8. **Supplier payout account name must match the KYC/BVN name.** A mismatch blocks the payout with no manual override.
9. **Quote expiry constrains pool closing time.** A pool cannot close after its supplier quote expires; the ops board flags rows where it would.
10. **Area is in the URL path, never a cookie.** Manual choice > profile > IP > default, and a manual choice is never silently overridden.

## Screens

`design/BulkieShare Sitemap.dc.html` is the authoritative route inventory: every route with its purpose, states, role, and phase. Build order should follow the phase column — phase 0 is everything needed to run one real pool with real money.

### Public site — `BulkieShare Site.dc.html`

| Route | Notes |
| --- | --- |
| `/` | area resolver |
| `/{area}` | home: hero, live pool card, four stats strip, three open pools, yield-transparency table on ink, hub list + map, footer |
| `/{area}/pools` | listing; states: results, filtered empty, **area not live** (waitlist capture with a progress bar to 500 sign-ups, plus greyed-out pools from the nearest live area) |
| `/{area}/pools/{id}` | detail; states: open, threshold not met, nearly full, closed, cancelled, completed |
| `/{area}/pools/{id}/report` | public completion report, indexable |
| `/{area}/hubs` | hub list and detail |
| `/how-it-works` | four steps then "the three things people ask" |
| `/trust` | refund SLA with live performance against it, pool policy in plain words |
| `/help` | WhatsApp escalation first, accordion below |
| `/groups`, `/supply` | acquisition pages (phase 1/2) |
| `/terms`, `/privacy`, `/pool-policy` | typeset from one document template |

Public listing and report pages must be server-rendered and cacheable per area.

### Member app — `BulkieShare App.dc.html` (17 screens)

Desktop-width screens: browse (`01`), pool detail (`02`), pay (`03`), beneficiaries (`04`), public pool report (`08`).
Phone-width screens (390px): collection pass (`05`), settlement (`06`), refund tracker (`07`), hub agent queue (`09`), hub agent handover (`10`), credit ledger (`11`), sign in (`12`), my pools empty (`13`), book a window (`14`), dispute (`15`), invite (`16`), account (`17`).

Notable details:

- **Pay (`03`)**: rust banner with a live 20-minute countdown; virtual account number in 30px mono; USSD/card/cash-at-hub alternatives; a four-step waiting checklist; the late/short/double rules panel.
- **Collection pass (`05`)**: works offline. 72px code, QR, hub landmark in words ("green gate opposite the mosque"). Cache it.
- **Book a window (`14`)**: capacity-aware. Full windows are struck through and disabled, not hidden.
- **Hub agent (`09`, `10`)**: a separate offline PWA on an ink background, not part of the member app. Offline banner, queued-handover count, typed scale weight with instant in/out-of-band feedback, mandatory scale photo, signature, and first-write-wins conflict handling.
- **Account (`17`)**: transactional messages are permanently on and shown as `ALWAYS ON`, not a disabled toggle.

### Coordinator — `BulkieShare Groups.dc.html`

Dashboard, live roster, pool builder, members, fees. The coordinator **cannot set a price or invent an item** — they pool from an item we already hold a quote for, and the builder shows the quote expiry constraining their closing time. Fee is ₦300/slot, paid on completion (not on fill), 7.5% VAT withheld, and visible to members on the pool page. A cancelled pool earns nothing.

### Supplier — `BulkieShare Supply.dc.html`

Agent-led onboarding (geotagged site photos, BVN name match, signed quality standard), quote requests with expiry, orders, payouts, scorecard (on-time, yield accuracy, QC rejection, price stability). Includes the **WhatsApp path** most suppliers actually use — the same records, driven by templated messages with quick-reply buttons. Build the WhatsApp path first; the portal is phase 2.

### Ops back office — `BulkieShare Ops.dc.html`

Pool board with a five-metric strip, refund queue with dual approval and SLA clocks, unmatched-transfer console, intake/QC, seeded allocation with a fairness check, disputes with SLA timers, daily reconciliation, member 360 with view logging. Denser than the member app on purpose — rows, not cards.

## Interactions to implement

Not present in the static files; specify as follows.

- **Countdowns**: pool closing and payment holds tick every second, server-time anchored. At zero, the client re-fetches rather than assuming an outcome.
- **Pool fill**: poll or subscribe. Animate fill width over ~300ms ease-out. Never animate the bar shrinking; if a hold expires, the hatched segment disappears without moving the solid fill.
- **Payment landing**: poll the reservation while the pay screen is open; on match, advance the checklist and route to beneficiaries.
- **Hover**: links go to 75% opacity. Buttons and rows have no lift, no shadow, no colour crossfade — inversion or a border change only.
- **Loading**: skeletons matching the row/grid geometry, in `#EDEAE1`. No spinners in tables.
- **Errors**: inline and specific ("three wrong codes locks the number for 15 minutes"), never a toast for anything involving money.
- **Offline (hub tool + collection pass)**: service worker, IndexedDB queue, visible queued count, background sync, first-write-wins with a review flag on conflict.

## State and data

Core entities: `Area`, `Hub`, `Pool` (with `policy_snapshot`, `threshold`, `shortfall_rule`, `closes_at`, `locks_at`, `quote_expires_at`), `Slot`, `Reservation` (with `expires_at`), `Commitment`, `Beneficiary`, `Payment`, `LedgerEntry`, `Refund`, `Credit`, `Collection` (window, code), `Handover` (weight, photos, signature), `Dispute`, `Supplier`, `PurchaseOrder`, `Org`/`Membership`.

Money is integer kobo. Every movement is a double-entry ledger pair; escrow is a distinct account and never nets against operating. Pool state machine: `draft → open → funded → allocating → distributing → completed`, with `underfilled → refunding → cancelled` as the failure branch. The policy in force is snapshotted onto the pool at open so a later policy change cannot alter an in-flight pool.

## Assets

None supplied. Every image is a labelled placeholder; the captions state what the photo should show (intake weights, scale readouts at handover, QC verdict sheets, geotagged supplier sites, hub map). Hub map should be real geo data, not a drawn graphic. No icon set is used — the logo mark is a plain filled square, and no other icons appear. Keep it that way rather than introducing an icon library.

## Files

```
design/
  BulkieShare Sitemap.dc.html    route inventory — start here
  BulkieShare Site.dc.html       public site
  BulkieShare App.dc.html        member app + hub agent tool (17 screens)
  BulkieShare Groups.dc.html     coordinator area (5)
  BulkieShare Supply.dc.html     supplier area (5) + WhatsApp path
  BulkieShare Ops.dc.html        back office (11)
  BulkieShare Variants.dc.html   four visual directions; 1a is the built one
  support.js                     preview runtime — do not port
```
