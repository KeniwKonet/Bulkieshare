import "server-only";

import { and, asc, desc, eq, ne, sql } from "drizzle-orm";

import { getDb } from "../db";
import * as s from "../db/schema";
import { formatSlaRemaining } from "../time";
import { recordPoolEvent } from "./pools";

/**
 * Procurement: turning member demand into goods on a hub bench.
 *
 * This is the company's actual job, and it is a chain where every link has to
 * hold:
 *
 *   funded pool → request for quotes → suppliers quote → ops awards one
 *     → purchase order issued with a deposit → delivery → QC → balance paid
 *
 * The last three links live in `supply.ts`, because they are things a supplier
 * or the intake desk does. Everything before them is here, because it is a
 * buying decision: who we ask, what they said, and which one we accept.
 *
 * Awarding is the moment money is committed, so it is the one operation in
 * this file that moves several records at once and must not half-happen.
 */

export type QuoteRequestState = (typeof s.quoteStateEnum.enumValues)[number];

/** Sequential PO numbers, so a supplier can read one out over the phone. */
export async function nextPoNumber(): Promise<string> {
  const db = await getDb();
  const [row] = await db
    .select({ po: s.purchaseOrders.po })
    .from(s.purchaseOrders)
    .orderBy(desc(s.purchaseOrders.po))
    .limit(1);

  const last = row ? Number.parseInt(row.po.split("-")[1] ?? "8800", 10) : 8800;
  return `PO-${last + 1}`;
}

/* ---------------------------------------------------------------------- */
/* Raising a request                                                       */
/* ---------------------------------------------------------------------- */

export async function createQuoteRequest(input: {
  title: string;
  description?: string;
  poolId?: string | null;
  areaSlug?: string | null;
  hubId?: string | null;
  quantity: number;
  lastPriceKobo?: number | null;
  depositPct: number;
  minHoldDays: number;
  expiresAt: Date;
  actorId?: string;
}): Promise<string> {
  const db = await getDb();

  const [row] = await db
    .insert(s.quoteRequests)
    .values({
      title: input.title,
      description: input.description ?? "",
      poolId: input.poolId ?? null,
      areaSlug: input.areaSlug ?? null,
      hubId: input.hubId ?? null,
      quantity: input.quantity,
      lastPriceKobo: input.lastPriceKobo ?? null,
      depositPct: input.depositPct,
      minHoldDays: input.minHoldDays,
      expiresAt: input.expiresAt,
      state: "open",
    })
    .returning({ id: s.quoteRequests.id });

  await db.insert(s.auditEvents).values({
    actorId: input.actorId,
    actorLabel: "Ops desk",
    action: "rfq.raised",
    subject: input.title,
    detail: { quoteRequestId: row.id, poolId: input.poolId ?? null },
  });

  if (input.poolId) {
    await recordPoolEvent(input.poolId, `Quotes requested: ${input.title}`);
  }

  return row.id;
}

/* ---------------------------------------------------------------------- */
/* Reading                                                                 */
/* ---------------------------------------------------------------------- */

export interface QuoteRequestRow {
  id: string;
  title: string;
  description: string;
  poolId: string | null;
  poolCode: string | null;
  hubId: string | null;
  hubName: string | null;
  quantity: number;
  lastPriceKobo: number | null;
  depositPct: number;
  minHoldDays: number;
  state: QuoteRequestState;
  expiresAt: Date;
  createdAt: Date;
  quoteCount: number;
  bestPriceKobo: number | null;
  expiryLabel: string;
  hasExpired: boolean;
  /** Hours until quoting closes. Negative once it has. */
  expiresInHours: number;
}

type RawRequest = Omit<QuoteRequestRow, "expiryLabel" | "hasExpired" | "expiresInHours">;

function decorate(row: RawRequest, now = new Date()): QuoteRequestRow {
  return {
    ...row,
    expiryLabel: formatSlaRemaining(row.expiresAt, now),
    hasExpired: row.expiresAt.getTime() <= now.getTime(),
    expiresInHours: (row.expiresAt.getTime() - now.getTime()) / 3_600_000,
  };
}

const requestColumns = {
  id: s.quoteRequests.id,
  title: s.quoteRequests.title,
  description: s.quoteRequests.description,
  poolId: s.quoteRequests.poolId,
  poolCode: s.pools.code,
  hubId: s.quoteRequests.hubId,
  hubName: s.hubs.name,
  quantity: s.quoteRequests.quantity,
  lastPriceKobo: s.quoteRequests.lastPriceKobo,
  depositPct: s.quoteRequests.depositPct,
  minHoldDays: s.quoteRequests.minHoldDays,
  state: s.quoteRequests.state,
  expiresAt: s.quoteRequests.expiresAt,
  createdAt: s.quoteRequests.createdAt,
  quoteCount: sql<number>`(
    select count(*)::int from ${s.quotes} q where q.quote_request_id = quote_requests.id
  )`,
  bestPriceKobo: sql<number | null>`(
    select min(q.price_kobo)::int from ${s.quotes} q
    where q.quote_request_id = quote_requests.id
  )`,
} as const;

export async function listQuoteRequests(): Promise<QuoteRequestRow[]> {
  const db = await getDb();
  const rows = await db
    .select(requestColumns)
    .from(s.quoteRequests)
    .leftJoin(s.hubs, eq(s.hubs.id, s.quoteRequests.hubId))
    .leftJoin(s.pools, eq(s.pools.id, s.quoteRequests.poolId))
    .orderBy(desc(s.quoteRequests.createdAt));
  const now = new Date();
  return rows.map((row) => decorate(row, now));
}

export async function getQuoteRequestById(id: string): Promise<QuoteRequestRow | null> {
  const db = await getDb();
  const [row] = await db
    .select(requestColumns)
    .from(s.quoteRequests)
    .leftJoin(s.hubs, eq(s.hubs.id, s.quoteRequests.hubId))
    .leftJoin(s.pools, eq(s.pools.id, s.quoteRequests.poolId))
    .where(eq(s.quoteRequests.id, id))
    .limit(1);
  return row ? decorate(row) : null;
}

export interface QuoteRow {
  id: string;
  supplierId: string;
  supplierName: string;
  isApproved: boolean;
  priceKobo: number;
  holdDays: number;
  note: string | null;
  isAwarded: boolean;
  createdAt: Date;
  onTimePct: number;
  yieldAccuracyPct: number;
  rejectRatePct: number;
  ordersDelivered: number;
  /** Price for the whole request, not per unit. */
  totalKobo: number;
  /** How far above the cheapest quote this one is, in basis points. */
  aboveBestBasisPoints: number;
  meetsHoldRequirement: boolean;
  /** True when this supplier could not be awarded even if ops wanted to. */
  isBlocked: boolean;
}

/**
 * The quotes on one request, cheapest first, with everything needed to judge
 * them. Price alone is the wrong basis: a supplier who is 2% cheaper and
 * rejects one delivery in ten costs more than the one who is not.
 */
export async function listQuotesFor(quoteRequestId: string): Promise<QuoteRow[]> {
  const db = await getDb();
  const request = await getQuoteRequestById(quoteRequestId);
  if (!request) return [];

  const rows = await db
    .select({
      id: s.quotes.id,
      supplierId: s.quotes.supplierId,
      supplierName: s.suppliers.name,
      isApproved: s.suppliers.isApproved,
      bankAccountNumber: s.suppliers.bankAccountNumber,
      priceKobo: s.quotes.priceKobo,
      holdDays: s.quotes.holdDays,
      note: s.quotes.note,
      isAwarded: s.quotes.isAwarded,
      createdAt: s.quotes.createdAt,
      onTimePct: s.suppliers.onTimePct,
      yieldAccuracyPct: s.suppliers.yieldAccuracyPct,
      rejectRatePct: s.suppliers.rejectRatePct,
      ordersDelivered: s.suppliers.ordersDelivered,
    })
    .from(s.quotes)
    .innerJoin(s.suppliers, eq(s.suppliers.id, s.quotes.supplierId))
    .where(eq(s.quotes.quoteRequestId, quoteRequestId))
    .orderBy(asc(s.quotes.priceKobo));

  const best = rows.length ? Math.min(...rows.map((r) => r.priceKobo)) : 0;

  return rows.map((r) => {
    const { bankAccountNumber, ...rest } = r;
    return {
      ...rest,
      totalKobo: r.priceKobo * request.quantity,
      aboveBestBasisPoints: best ? Math.round(((r.priceKobo - best) / best) * 10_000) : 0,
      meetsHoldRequirement: r.holdDays >= request.minHoldDays,
      isBlocked: !r.isApproved || !bankAccountNumber,
    };
  });
}

/* ---------------------------------------------------------------------- */
/* Awarding                                                                */
/* ---------------------------------------------------------------------- */

export type AwardResult =
  | { ok: true; po: string; valueKobo: number; depositKobo: number }
  | { ok: false; error: string };

/**
 * Accepts one quote and issues the purchase order against it.
 *
 * Several records move together — the winning quote, the losing ones, the
 * request, the pool's supplier, and a brand new purchase order — so it runs
 * inside one transaction. A half-awarded request would leave a supplier
 * believing they hold an order that does not exist.
 */
export async function awardQuote(quoteId: string, actorId?: string): Promise<AwardResult> {
  const db = await getDb();

  const [quote] = await db
    .select({
      id: s.quotes.id,
      quoteRequestId: s.quotes.quoteRequestId,
      supplierId: s.quotes.supplierId,
      priceKobo: s.quotes.priceKobo,
      supplierName: s.suppliers.name,
      isApproved: s.suppliers.isApproved,
      bankAccountNumber: s.suppliers.bankAccountNumber,
    })
    .from(s.quotes)
    .innerJoin(s.suppliers, eq(s.suppliers.id, s.quotes.supplierId))
    .where(eq(s.quotes.id, quoteId))
    .limit(1);

  if (!quote) return { ok: false, error: "That quote no longer exists." };

  const request = await getQuoteRequestById(quote.quoteRequestId);
  if (!request) return { ok: false, error: "That request no longer exists." };
  if (request.state === "awarded") {
    return { ok: false, error: "This request has already been awarded." };
  }

  // The same gate as supplier approval, restated where it bites: an award
  // creates a payment obligation, and we do not create one we have no account
  // to settle.
  if (!quote.isApproved || !quote.bankAccountNumber) {
    return {
      ok: false,
      error: `${quote.supplierName} is not cleared for purchase orders. Approve them and add bank details first.`,
    };
  }

  const valueKobo = quote.priceKobo * request.quantity;
  const depositKobo = Math.round((valueKobo * request.depositPct) / 100);
  const balanceKobo = valueKobo - depositKobo;
  const po = await nextPoNumber();

  await db.transaction(async (tx) => {
    await tx.update(s.quotes).set({ isAwarded: true }).where(eq(s.quotes.id, quoteId));

    await tx
      .update(s.quotes)
      .set({ isAwarded: false })
      .where(and(eq(s.quotes.quoteRequestId, quote.quoteRequestId), ne(s.quotes.id, quoteId)));

    await tx
      .update(s.quoteRequests)
      .set({ state: "awarded" })
      .where(eq(s.quoteRequests.id, quote.quoteRequestId));

    await tx.insert(s.purchaseOrders).values({
      po,
      supplierId: quote.supplierId,
      poolId: request.poolId,
      item: `${request.quantity} × ${request.title}`,
      valueKobo,
      depositKobo,
      balanceKobo,
      state: "issued",
    });

    // The pool now knows who supplies it, which is what the public pool page
    // and the eventual report both read.
    if (request.poolId) {
      await tx
        .update(s.pools)
        .set({ supplierId: quote.supplierId })
        .where(eq(s.pools.id, request.poolId));
    }
  });

  await db.insert(s.auditEvents).values({
    actorId,
    actorLabel: "Ops desk",
    action: "rfq.awarded",
    subject: po,
    detail: {
      quoteRequestId: quote.quoteRequestId,
      supplierId: quote.supplierId,
      valueKobo,
      depositKobo,
    },
  });

  if (request.poolId) {
    await recordPoolEvent(request.poolId, `${po} issued to ${quote.supplierName}`);
  }

  return { ok: true, po, valueKobo, depositKobo };
}

export async function cancelQuoteRequest(id: string, actorId?: string): Promise<void> {
  const db = await getDb();
  await db.update(s.quoteRequests).set({ state: "expired" }).where(eq(s.quoteRequests.id, id));
  await db.insert(s.auditEvents).values({
    actorId,
    actorLabel: "Ops desk",
    action: "rfq.cancelled",
    subject: id,
  });
}

/* ---------------------------------------------------------------------- */
/* Supplier-facing                                                         */
/* ---------------------------------------------------------------------- */

/** What this supplier quoted, and whether they won it. */
export async function listQuotesBySupplier(supplierId: string) {
  const db = await getDb();
  return db
    .select({
      id: s.quotes.id,
      priceKobo: s.quotes.priceKobo,
      holdDays: s.quotes.holdDays,
      isAwarded: s.quotes.isAwarded,
      createdAt: s.quotes.createdAt,
      requestId: s.quoteRequests.id,
      title: s.quoteRequests.title,
      quantity: s.quoteRequests.quantity,
      requestState: s.quoteRequests.state,
      expiresAt: s.quoteRequests.expiresAt,
    })
    .from(s.quotes)
    .innerJoin(s.quoteRequests, eq(s.quoteRequests.id, s.quotes.quoteRequestId))
    .where(eq(s.quotes.supplierId, supplierId))
    .orderBy(desc(s.quotes.createdAt));
}
