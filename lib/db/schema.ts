/**
 * BulkieShare database schema.
 *
 * Money is stored as integer kobo throughout (1 naira = 100 kobo). Nothing in
 * the database holds a float amount. `lib/money.ts` owns conversion + display.
 *
 * Timestamps are `timestamptz`. The app reasons in Africa/Lagos for display
 * only; storage is always UTC.
 */

import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* ---------------------------------------------------------------------- */
/* Enums                                                                   */
/* ---------------------------------------------------------------------- */

export const poolStateEnum = pgEnum("pool_state", [
  "draft",
  "open",
  "funded",
  "allocating",
  "distributing",
  "completed",
  "underfilled",
  "refunding",
  "cancelled",
]);

export const poolCategoryEnum = pgEnum("pool_category", [
  "meat",
  "grains",
  "produce",
  "other",
]);

export const memberRoleEnum = pgEnum("member_role", [
  "member",
  "coordinator",
  "hub_agent",
  "supplier",
  "ops",
  "admin",
]);

export const reservationStateEnum = pgEnum("reservation_state", [
  "holding",
  "paid",
  "expired",
  "cancelled",
]);

export const commitmentStateEnum = pgEnum("commitment_state", [
  "funded",
  "allocated",
  "collected",
  "refunded",
  "cancelled",
]);

export const paymentStateEnum = pgEnum("payment_state", [
  "pending",
  "succeeded",
  "failed",
  "abandoned",
  "reversed",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "transfer",
  "card",
  "credit",
  "coordinator",
  "manual",
]);

export const disputeStateEnum = pgEnum("dispute_state", [
  "open",
  "investigating",
  "resolved",
  "rejected",
]);

export const disputeReasonEnum = pgEnum("dispute_reason", [
  "quality",
  "short_weight",
  "wrong_cuts",
  "no_handover",
  "other",
]);

export const refundStateEnum = pgEnum("refund_state", [
  "requested",
  "approved",
  "processing",
  "paid",
  "rejected",
]);

export const refundMethodEnum = pgEnum("refund_method", ["bank", "credit"]);

export const poStateEnum = pgEnum("po_state", [
  "issued",
  "deposit_paid",
  "delivered",
  "qc_passed",
  "qc_failed",
  "settled",
  "cancelled",
]);

export const quoteStateEnum = pgEnum("quote_state", [
  "open",
  "quoted",
  "awarded",
  "lost",
  "expired",
]);

export const payoutStateEnum = pgEnum("payout_state", [
  "scheduled",
  "processing",
  "paid",
  "failed",
]);

export const transferMatchStateEnum = pgEnum("transfer_match_state", [
  "unmatched",
  "matched",
  "credited",
  "returned",
  "escalated",
]);

/* ---------------------------------------------------------------------- */
/* Geography and supply base                                               */
/* ---------------------------------------------------------------------- */

export const areas = pgTable("areas", {
  slug: text("slug").primaryKey(),
  label: text("label").notNull(),
  isLive: boolean("is_live").notNull().default(false),
  waitlistCount: integer("waitlist_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const hubs = pgTable(
  "hubs",
  {
    id: text("id").primaryKey(),
    areaSlug: text("area_slug")
      .notNull()
      .references(() => areas.slug),
    name: text("name").notNull(),
    address: text("address").notNull(),
    landmark: text("landmark").notNull().default(""),
    windows: text("windows").notNull().default(""),
    capacityPerHour: integer("capacity_per_hour").notNull().default(20),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("hubs_area_idx").on(t.areaSlug)],
);

export const suppliers = pgTable("suppliers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  contactPhone: text("contact_phone"),
  contactName: text("contact_name"),
  bankName: text("bank_name"),
  bankAccountNumber: text("bank_account_number"),
  bankAccountName: text("bank_account_name"),
  ordersDelivered: integer("orders_delivered").notNull().default(0),
  yieldAccuracyPct: integer("yield_accuracy_pct").notNull().default(0),
  onTimePct: integer("on_time_pct").notNull().default(0),
  rejectRatePct: integer("reject_rate_pct").notNull().default(0),
  isApproved: boolean("is_approved").notNull().default(false),
  whatsappOptIn: boolean("whatsapp_opt_in").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ---------------------------------------------------------------------- */
/* Identity                                                                */
/* ---------------------------------------------------------------------- */

export const members = pgTable(
  "members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /**
     * The matching row in Supabase's `auth.users`. Sign-in is Supabase Auth, but
     * the app keeps its own primary key so every foreign key in this schema
     * stays stable if the auth provider is ever swapped out.
     */
    authUserId: uuid("auth_user_id"),
    phone: text("phone").notNull(), // E.164, e.g. +2348034419022
    name: text("name").notNull().default(""),
    role: memberRoleEnum("role").notNull().default("member"),
    areaSlug: text("area_slug").references(() => areas.slug),
    homeHubId: text("home_hub_id").references(() => hubs.id),
    supplierId: uuid("supplier_id").references(() => suppliers.id),
    creditKobo: integer("credit_kobo").notNull().default(0),
    notifyWhatsapp: boolean("notify_whatsapp").notNull().default(true),
    notifySms: boolean("notify_sms").notNull().default(true),
    notifyPoolOpen: boolean("notify_pool_open").notNull().default(true),
    isBlocked: boolean("is_blocked").notNull().default(false),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("members_phone_key").on(t.phone),
    uniqueIndex("members_auth_user_key").on(t.authUserId),
  ],
);

/**
 * One row per OTP challenge. Codes are stored hashed; `attempts` drives the
 * three-strikes lockout the sign-in screen promises.
 */
export const otpChallenges = pgTable(
  "otp_challenges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phone: text("phone").notNull(),
    codeHash: text("code_hash").notNull(),
    channel: text("channel").notNull().default("whatsapp"),
    attempts: integer("attempts").notNull().default(0),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("otp_phone_idx").on(t.phone, t.createdAt)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    userAgent: text("user_agent"),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_member_idx").on(t.memberId)],
);

/* ---------------------------------------------------------------------- */
/* Coordinator groups                                                      */
/* ---------------------------------------------------------------------- */

export const groups = pgTable(
  "groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    areaSlug: text("area_slug")
      .notNull()
      .references(() => areas.slug),
    hubId: text("hub_id").references(() => hubs.id),
    coordinatorId: uuid("coordinator_id")
      .notNull()
      .references(() => members.id),
    feePctBasisPoints: integer("fee_pct_basis_points").notNull().default(300),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("groups_slug_key").on(t.slug)],
);

export const groupMembers = pgTable(
  "group_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("group_members_key").on(t.groupId, t.memberId)],
);

/* ---------------------------------------------------------------------- */
/* Pools                                                                   */
/* ---------------------------------------------------------------------- */

export const pools = pgTable(
  "pools",
  {
    id: text("id").primaryKey(), // "a-2214"
    code: text("code").notNull(), // "A-2214"
    areaSlug: text("area_slug")
      .notNull()
      .references(() => areas.slug),
    hubId: text("hub_id")
      .notNull()
      .references(() => hubs.id),
    supplierId: uuid("supplier_id").references(() => suppliers.id),
    groupId: uuid("group_id").references(() => groups.id),
    title: text("title").notNull(),
    category: poolCategoryEnum("category").notNull().default("other"),
    photoCaption: text("photo_caption").notNull().default(""),
    description: text("description").notNull().default(""),
    unitDescription: text("unit_description").notNull().default(""),
    toleranceBand: text("tolerance_band"),
    cutsBreakdown: text("cuts_breakdown"),
    totalSlots: integer("total_slots").notNull(),
    threshold: integer("threshold").notNull(),
    pricePerSlotKobo: integer("price_per_slot_kobo").notNull(),
    marketPricePerSlotKobo: integer("market_price_per_slot_kobo"),
    state: poolStateEnum("state").notNull().default("draft"),
    closesAt: timestamp("closes_at", { withTimezone: true }).notNull(),
    shareDate: timestamp("share_date", { withTimezone: true }).notNull(),
    allocationSeed: text("allocation_seed"),
    seedPublishedAt: timestamp("seed_published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("pools_area_state_idx").on(t.areaSlug, t.state),
    index("pools_hub_idx").on(t.hubId),
  ],
);

/** Append-only pool timeline, rendered on the public pool report. */
export const poolEvents = pgTable(
  "pool_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    poolId: text("pool_id")
      .notNull()
      .references(() => pools.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("pool_events_pool_idx").on(t.poolId, t.at)],
);

/** Settlement figures, written when a pool completes. */
export const poolReports = pgTable("pool_reports", {
  poolId: text("pool_id")
    .primaryKey()
    .references(() => pools.id, { onDelete: "cascade" }),
  completedAt: timestamp("completed_at", { withTimezone: true }).notNull(),
  collectedKobo: integer("collected_kobo").notNull().default(0),
  liveWeightGrams: integer("live_weight_grams"),
  usableWeightGrams: integer("usable_weight_grams"),
  nominalWeightGrams: integer("nominal_weight_grams"),
  yieldVarianceBasisPoints: integer("yield_variance_basis_points").notNull().default(0),
  handovers: integer("handovers").notNull().default(0),
  disputes: integer("disputes").notNull().default(0),
  costBreakdown: jsonb("cost_breakdown")
    .$type<{ label: string; amountKobo: number }[]>()
    .notNull()
    .default([]),
  marginKobo: integer("margin_kobo").notNull().default(0),
});

/* ---------------------------------------------------------------------- */
/* Reservations, commitments, payments                                     */
/* ---------------------------------------------------------------------- */

/**
 * A hold on N slots. Expires after `expiresAt` unless a payment succeeds,
 * at which point a commitment is created and the reservation goes to "paid".
 */
export const reservations = pgTable(
  "reservations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reference: text("reference").notNull(), // short human ref, e.g. "a-2214-r7f3"
    poolId: text("pool_id")
      .notNull()
      .references(() => pools.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    slots: integer("slots").notNull(),
    subtotalKobo: integer("subtotal_kobo").notNull(),
    creditAppliedKobo: integer("credit_applied_kobo").notNull().default(0),
    amountDueKobo: integer("amount_due_kobo").notNull(),
    state: reservationStateEnum("state").notNull().default("holding"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("reservations_reference_key").on(t.reference),
    index("reservations_pool_state_idx").on(t.poolId, t.state),
    index("reservations_member_idx").on(t.memberId),
  ],
);

export const commitments = pgTable(
  "commitments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    poolId: text("pool_id")
      .notNull()
      .references(() => pools.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    reservationId: uuid("reservation_id").references(() => reservations.id),
    slots: integer("slots").notNull(),
    paidKobo: integer("paid_kobo").notNull(),
    state: commitmentStateEnum("state").notNull().default("funded"),
    paidByCoordinator: boolean("paid_by_coordinator").notNull().default(false),
    collectionCode: text("collection_code"), // 4-digit handover code
    windowAt: timestamp("window_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("commitments_pool_idx").on(t.poolId),
    index("commitments_member_idx").on(t.memberId),
  ],
);

/** One row per slot in a commitment; lets a payer name who each slot is for. */
export const beneficiaries = pgTable(
  "beneficiaries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    commitmentId: uuid("commitment_id")
      .notNull()
      .references(() => commitments.id, { onDelete: "cascade" }),
    slotIndex: integer("slot_index").notNull(),
    name: text("name").notNull().default(""),
    phone: text("phone"),
    code: text("code"),
    isPayer: boolean("is_payer").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("beneficiaries_slot_key").on(t.commitmentId, t.slotIndex)],
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reference: text("reference").notNull(),
    reservationId: uuid("reservation_id").references(() => reservations.id),
    memberId: uuid("member_id").references(() => members.id),
    amountKobo: integer("amount_kobo").notNull(),
    method: paymentMethodEnum("method").notNull().default("transfer"),
    state: paymentStateEnum("state").notNull().default("pending"),
    provider: text("provider").notNull().default("mock"),
    providerReference: text("provider_reference"),
    virtualAccountNumber: text("virtual_account_number"),
    virtualAccountBank: text("virtual_account_bank"),
    rawPayload: jsonb("raw_payload"),
    settledAt: timestamp("settled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("payments_reference_key").on(t.reference),
    index("payments_reservation_idx").on(t.reservationId),
  ],
);

/** Store-credit ledger. Balance on `members.credit_kobo` is the running sum. */
export const creditMovements = pgTable(
  "credit_movements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    detail: text("detail").notNull().default(""),
    amountKobo: integer("amount_kobo").notNull(), // positive credit, negative spend
    poolId: text("pool_id").references(() => pools.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("credit_movements_member_idx").on(t.memberId, t.createdAt)],
);

/* ---------------------------------------------------------------------- */
/* Collection and after-care                                               */
/* ---------------------------------------------------------------------- */

export const handovers = pgTable(
  "handovers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    commitmentId: uuid("commitment_id")
      .notNull()
      .references(() => commitments.id, { onDelete: "cascade" }),
    hubId: text("hub_id")
      .notNull()
      .references(() => hubs.id),
    agentId: uuid("agent_id").references(() => members.id),
    weightGrams: integer("weight_grams"),
    notes: text("notes"),
    handedOverAt: timestamp("handed_over_at", { withTimezone: true }).notNull().defaultNow(),
    /** Set when the record was captured offline and synced later. */
    syncedAt: timestamp("synced_at", { withTimezone: true }),
  },
  (t) => [index("handovers_hub_idx").on(t.hubId, t.handedOverAt)],
);

export const disputes = pgTable(
  "disputes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reference: text("reference").notNull(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id),
    commitmentId: uuid("commitment_id").references(() => commitments.id),
    poolId: text("pool_id").references(() => pools.id),
    reason: disputeReasonEnum("reason").notNull(),
    detail: text("detail").notNull().default(""),
    state: disputeStateEnum("state").notNull().default("open"),
    resolution: text("resolution"),
    resolvedCreditKobo: integer("resolved_credit_kobo"),
    slaDueAt: timestamp("sla_due_at", { withTimezone: true }).notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("disputes_reference_key").on(t.reference),
    index("disputes_state_idx").on(t.state, t.slaDueAt),
  ],
);

export const disputePhotos = pgTable("dispute_photos", {
  id: uuid("id").primaryKey().defaultRandom(),
  disputeId: uuid("dispute_id")
    .notNull()
    .references(() => disputes.id, { onDelete: "cascade" }),
  storageKey: text("storage_key").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const refunds = pgTable(
  "refunds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reference: text("reference").notNull(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id),
    commitmentId: uuid("commitment_id").references(() => commitments.id),
    poolId: text("pool_id").references(() => pools.id),
    amountKobo: integer("amount_kobo").notNull(),
    method: refundMethodEnum("method").notNull().default("bank"),
    state: refundStateEnum("state").notNull().default("requested"),
    reason: text("reason").notNull().default(""),
    bankName: text("bank_name"),
    bankAccountNumber: text("bank_account_number"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("refunds_reference_key").on(t.reference),
    index("refunds_member_idx").on(t.memberId),
  ],
);

/* ---------------------------------------------------------------------- */
/* Supply side                                                             */
/* ---------------------------------------------------------------------- */

export const quoteRequests = pgTable("quote_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  areaSlug: text("area_slug").references(() => areas.slug),
  hubId: text("hub_id").references(() => hubs.id),
  lastPriceKobo: integer("last_price_kobo"),
  depositPct: integer("deposit_pct").notNull().default(40),
  minHoldDays: integer("min_hold_days").notNull().default(7),
  state: quoteStateEnum("state").notNull().default("open"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const quotes = pgTable(
  "quotes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quoteRequestId: uuid("quote_request_id")
      .notNull()
      .references(() => quoteRequests.id, { onDelete: "cascade" }),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "cascade" }),
    priceKobo: integer("price_kobo").notNull(),
    holdDays: integer("hold_days").notNull().default(7),
    note: text("note"),
    isAwarded: boolean("is_awarded").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("quotes_request_supplier_key").on(t.quoteRequestId, t.supplierId)],
);

export const purchaseOrders = pgTable(
  "purchase_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    po: text("po").notNull(), // "PO-8859"
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id),
    poolId: text("pool_id").references(() => pools.id),
    item: text("item").notNull(),
    valueKobo: integer("value_kobo").notNull(),
    depositKobo: integer("deposit_kobo").notNull().default(0),
    balanceKobo: integer("balance_kobo").notNull().default(0),
    state: poStateEnum("state").notNull().default("issued"),
    qcNote: text("qc_note"),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    settledAt: timestamp("settled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("purchase_orders_po_key").on(t.po),
    index("purchase_orders_supplier_idx").on(t.supplierId),
  ],
);

export const supplierPayouts = pgTable("supplier_payouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  supplierId: uuid("supplier_id")
    .notNull()
    .references(() => suppliers.id, { onDelete: "cascade" }),
  purchaseOrderId: uuid("purchase_order_id").references(() => purchaseOrders.id),
  amountKobo: integer("amount_kobo").notNull(),
  state: payoutStateEnum("state").notNull().default("scheduled"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ---------------------------------------------------------------------- */
/* Ops                                                                     */
/* ---------------------------------------------------------------------- */

/** Bank credits that arrived without a matching reservation reference. */
export const unmatchedTransfers = pgTable("unmatched_transfers", {
  id: uuid("id").primaryKey().defaultRandom(),
  amountKobo: integer("amount_kobo").notNull(),
  fromName: text("from_name").notNull().default(""),
  bankRef: text("bank_ref").notNull().default(""),
  narration: text("narration").notNull().default(""),
  guess: text("guess").notNull().default(""),
  state: transferMatchStateEnum("state").notNull().default("unmatched"),
  matchedReservationId: uuid("matched_reservation_id").references(() => reservations.id),
  resolvedBy: uuid("resolved_by").references(() => members.id),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id").references(() => members.id),
    actorLabel: text("actor_label").notNull().default("system"),
    action: text("action").notNull(),
    subject: text("subject").notNull().default(""),
    detail: jsonb("detail").$type<Record<string, unknown>>(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_events_at_idx").on(t.at)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    channel: text("channel").notNull().default("whatsapp"),
    template: text("template").notNull(),
    body: text("body").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notifications_member_idx").on(t.memberId, t.createdAt)],
);

/** Area waitlist signups from non-live areas. */
export const waitlist = pgTable(
  "waitlist",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phone: text("phone").notNull(),
    areaSlug: text("area_slug").notNull(),
    neighbourhood: text("neighbourhood").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("waitlist_phone_area_key").on(t.phone, t.areaSlug)],
);
