import "server-only";

import { and, asc, desc, eq, sql } from "drizzle-orm";

import { getDb } from "../db";
import * as s from "../db/schema";

/**
 * The supplier side: quote requests we put out, quotes suppliers send back,
 * purchase orders we issue against a funded pool, and the payouts that settle
 * them. A supplier only ever sees their own rows.
 */

export type PoState = (typeof s.poStateEnum.enumValues)[number];

export const PO_STATE_LABELS: Record<PoState, string> = {
  issued: "issued, deposit pending",
  deposit_paid: "deposit paid",
  delivered: "delivered, due on QC",
  qc_passed: "QC passed, balance due",
  qc_failed: "QC failed, settled short",
  settled: "settled",
  cancelled: "cancelled",
};

/* ---------------------------------------------------------------------- */
/* Quote requests                                                          */
/* ---------------------------------------------------------------------- */

export async function listOpenQuoteRequests() {
  const db = await getDb();
  return db
    .select({
      id: s.quoteRequests.id,
      title: s.quoteRequests.title,
      description: s.quoteRequests.description,
      hubId: s.quoteRequests.hubId,
      hubName: s.hubs.name,
      lastPriceKobo: s.quoteRequests.lastPriceKobo,
      depositPct: s.quoteRequests.depositPct,
      minHoldDays: s.quoteRequests.minHoldDays,
      state: s.quoteRequests.state,
      expiresAt: s.quoteRequests.expiresAt,
      quoteCount: sql<number>`(
        select count(*)::int from ${s.quotes} q where q.quote_request_id = ${s.quoteRequests.id}
      )`,
    })
    .from(s.quoteRequests)
    .leftJoin(s.hubs, eq(s.hubs.id, s.quoteRequests.hubId))
    .where(eq(s.quoteRequests.state, "open"))
    .orderBy(asc(s.quoteRequests.expiresAt));
}

export async function getQuoteRequest(id: string) {
  const rows = await listOpenQuoteRequests();
  return rows.find((r) => r.id === id) ?? null;
}

export async function submitQuote(input: {
  quoteRequestId: string;
  supplierId: string;
  priceKobo: number;
  holdDays: number;
  note?: string;
}): Promise<void> {
  const db = await getDb();
  await db
    .insert(s.quotes)
    .values({
      quoteRequestId: input.quoteRequestId,
      supplierId: input.supplierId,
      priceKobo: input.priceKobo,
      holdDays: input.holdDays,
      note: input.note ?? null,
    })
    .onConflictDoUpdate({
      target: [s.quotes.quoteRequestId, s.quotes.supplierId],
      set: { priceKobo: input.priceKobo, holdDays: input.holdDays, note: input.note ?? null },
    });

  await db
    .update(s.quoteRequests)
    .set({ state: "quoted" })
    .where(
      and(eq(s.quoteRequests.id, input.quoteRequestId), eq(s.quoteRequests.state, "open")),
    );
}

export async function listQuotesFor(quoteRequestId: string) {
  const db = await getDb();
  return db
    .select({
      id: s.quotes.id,
      supplierId: s.quotes.supplierId,
      supplierName: s.suppliers.name,
      priceKobo: s.quotes.priceKobo,
      holdDays: s.quotes.holdDays,
      note: s.quotes.note,
      isAwarded: s.quotes.isAwarded,
      yieldAccuracyPct: s.suppliers.yieldAccuracyPct,
      onTimePct: s.suppliers.onTimePct,
    })
    .from(s.quotes)
    .innerJoin(s.suppliers, eq(s.suppliers.id, s.quotes.supplierId))
    .where(eq(s.quotes.quoteRequestId, quoteRequestId))
    .orderBy(asc(s.quotes.priceKobo));
}

/* ---------------------------------------------------------------------- */
/* Purchase orders                                                         */
/* ---------------------------------------------------------------------- */

export interface PurchaseOrderView {
  id: string;
  po: string;
  supplierId: string;
  supplierName: string;
  poolId: string | null;
  poolCode: string | null;
  item: string;
  valueKobo: number;
  depositKobo: number;
  balanceKobo: number;
  state: PoState;
  stateLabel: string;
  qcNote: string | null;
  deliveredAt: Date | null;
  settledAt: Date | null;
  createdAt: Date;
}

async function queryPurchaseOrders(where?: ReturnType<typeof and>): Promise<PurchaseOrderView[]> {
  const db = await getDb();
  const q = db
    .select({
      id: s.purchaseOrders.id,
      po: s.purchaseOrders.po,
      supplierId: s.purchaseOrders.supplierId,
      supplierName: s.suppliers.name,
      poolId: s.purchaseOrders.poolId,
      poolCode: s.pools.code,
      item: s.purchaseOrders.item,
      valueKobo: s.purchaseOrders.valueKobo,
      depositKobo: s.purchaseOrders.depositKobo,
      balanceKobo: s.purchaseOrders.balanceKobo,
      state: s.purchaseOrders.state,
      qcNote: s.purchaseOrders.qcNote,
      deliveredAt: s.purchaseOrders.deliveredAt,
      settledAt: s.purchaseOrders.settledAt,
      createdAt: s.purchaseOrders.createdAt,
    })
    .from(s.purchaseOrders)
    .innerJoin(s.suppliers, eq(s.suppliers.id, s.purchaseOrders.supplierId))
    .leftJoin(s.pools, eq(s.pools.id, s.purchaseOrders.poolId));

  const rows = await (where ? q.where(where) : q).orderBy(desc(s.purchaseOrders.createdAt));
  return rows.map((r) => ({ ...r, stateLabel: PO_STATE_LABELS[r.state] }));
}

export async function listPurchaseOrders(supplierId?: string): Promise<PurchaseOrderView[]> {
  return queryPurchaseOrders(supplierId ? and(eq(s.purchaseOrders.supplierId, supplierId)) : undefined);
}

export async function getPurchaseOrder(po: string): Promise<PurchaseOrderView | null> {
  const rows = await queryPurchaseOrders(and(eq(s.purchaseOrders.po, po.toUpperCase())));
  return rows[0] ?? null;
}

export async function recordDelivery(po: string, actorId?: string): Promise<void> {
  const db = await getDb();
  await db
    .update(s.purchaseOrders)
    .set({ state: "delivered", deliveredAt: new Date() })
    .where(eq(s.purchaseOrders.po, po.toUpperCase()));
  await db.insert(s.auditEvents).values({
    actorId,
    actorLabel: "Ops desk",
    action: "po.delivered",
    subject: po.toUpperCase(),
  });
}

/**
 * QC at intake. Passing releases the balance for payout; failing settles the
 * order short and records why, which is what feeds the supplier scorecard.
 */
export async function recordQc(input: {
  po: string;
  passed: boolean;
  note?: string;
  settleKobo?: number;
  actorId?: string;
}): Promise<void> {
  const db = await getDb();
  const po = input.po.toUpperCase();

  const [order] = await db
    .select()
    .from(s.purchaseOrders)
    .where(eq(s.purchaseOrders.po, po))
    .limit(1);
  if (!order) return;

  const balance = input.settleKobo ?? order.balanceKobo;

  await db
    .update(s.purchaseOrders)
    .set({
      state: input.passed ? "qc_passed" : "qc_failed",
      qcNote: input.note ?? null,
      balanceKobo: balance,
    })
    .where(eq(s.purchaseOrders.id, order.id));

  await db.insert(s.supplierPayouts).values({
    supplierId: order.supplierId,
    purchaseOrderId: order.id,
    amountKobo: balance,
    state: "scheduled",
  });

  await db.insert(s.auditEvents).values({
    actorId: input.actorId,
    actorLabel: "Ops desk",
    action: input.passed ? "po.qc_passed" : "po.qc_failed",
    subject: po,
    detail: { note: input.note ?? "", balanceKobo: balance },
  });

  if (!input.passed) {
    await db
      .update(s.suppliers)
      .set({ rejectRatePct: sql`least(100, ${s.suppliers.rejectRatePct} + 1)` })
      .where(eq(s.suppliers.id, order.supplierId));
  }
}

export async function settlePurchaseOrder(po: string, actorId?: string): Promise<void> {
  const db = await getDb();
  const upper = po.toUpperCase();

  const [order] = await db
    .select()
    .from(s.purchaseOrders)
    .where(eq(s.purchaseOrders.po, upper))
    .limit(1);
  if (!order) return;

  await db
    .update(s.purchaseOrders)
    .set({ state: "settled", settledAt: new Date() })
    .where(eq(s.purchaseOrders.id, order.id));

  await db
    .update(s.supplierPayouts)
    .set({ state: "paid", paidAt: new Date() })
    .where(eq(s.supplierPayouts.purchaseOrderId, order.id));

  await db
    .update(s.suppliers)
    .set({ ordersDelivered: sql`${s.suppliers.ordersDelivered} + 1` })
    .where(eq(s.suppliers.id, order.supplierId));

  await db.insert(s.auditEvents).values({
    actorId,
    actorLabel: "Ops desk",
    action: "po.settled",
    subject: upper,
  });
}

/* ---------------------------------------------------------------------- */
/* Payouts and scorecard                                                   */
/* ---------------------------------------------------------------------- */

export async function listPayouts(supplierId: string) {
  const db = await getDb();
  return db
    .select({
      id: s.supplierPayouts.id,
      amountKobo: s.supplierPayouts.amountKobo,
      state: s.supplierPayouts.state,
      paidAt: s.supplierPayouts.paidAt,
      createdAt: s.supplierPayouts.createdAt,
      po: s.purchaseOrders.po,
      item: s.purchaseOrders.item,
    })
    .from(s.supplierPayouts)
    .leftJoin(s.purchaseOrders, eq(s.purchaseOrders.id, s.supplierPayouts.purchaseOrderId))
    .where(eq(s.supplierPayouts.supplierId, supplierId))
    .orderBy(desc(s.supplierPayouts.createdAt));
}

export async function getSupplier(id: string) {
  const db = await getDb();
  const [row] = await db.select().from(s.suppliers).where(eq(s.suppliers.id, id)).limit(1);
  return row ?? null;
}

export async function listSuppliers() {
  const db = await getDb();
  return db
    .select({
      id: s.suppliers.id,
      name: s.suppliers.name,
      contactName: s.suppliers.contactName,
      contactPhone: s.suppliers.contactPhone,
      ordersDelivered: s.suppliers.ordersDelivered,
      yieldAccuracyPct: s.suppliers.yieldAccuracyPct,
      onTimePct: s.suppliers.onTimePct,
      rejectRatePct: s.suppliers.rejectRatePct,
      isApproved: s.suppliers.isApproved,
      openOrders: sql<number>`(
        select count(*)::int from ${s.purchaseOrders} p
        where p.supplier_id = ${s.suppliers.id} and p.state not in ('settled','cancelled')
      )`,
    })
    .from(s.suppliers)
    .orderBy(asc(s.suppliers.name));
}

export async function getScorecard(supplierId: string) {
  const db = await getDb();
  const supplier = await getSupplier(supplierId);
  if (!supplier) return null;

  const [totals] = await db
    .select({
      orders: sql<number>`count(*)::int`,
      settled: sql<number>`count(*) filter (where ${s.purchaseOrders.state} = 'settled')::int`,
      failed: sql<number>`count(*) filter (where ${s.purchaseOrders.state} = 'qc_failed')::int`,
      valueKobo: sql<number>`coalesce(sum(${s.purchaseOrders.valueKobo}), 0)::int`,
    })
    .from(s.purchaseOrders)
    .where(eq(s.purchaseOrders.supplierId, supplierId));

  return { supplier, totals };
}

/** Links a member account to a supplier record during onboarding. */
export async function onboardSupplier(input: {
  memberId: string;
  name: string;
  contactName: string;
  contactPhone: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
}): Promise<string> {
  const db = await getDb();
  const [supplier] = await db
    .insert(s.suppliers)
    .values({
      name: input.name,
      contactName: input.contactName,
      contactPhone: input.contactPhone,
      bankName: input.bankName,
      bankAccountNumber: input.bankAccountNumber,
      bankAccountName: input.bankAccountName,
      isApproved: false,
    })
    .returning({ id: s.suppliers.id });

  await db
    .update(s.members)
    .set({ supplierId: supplier.id, role: "supplier" })
    .where(eq(s.members.id, input.memberId));

  return supplier.id;
}

/* ---------------------------------------------------------------------- */
/* Ops-side supplier administration                                        */
/* ---------------------------------------------------------------------- */

/**
 * Approving a supplier is what lets them receive a purchase order, so it is
 * gated on having somewhere to pay them. An unapproved supplier can quote, but
 * nothing can be awarded to them.
 */
export async function approveSupplier(
  supplierId: string,
  approved: boolean,
  actorId?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = await getDb();
  const supplier = await getSupplier(supplierId);
  if (!supplier) return { ok: false, error: "That supplier no longer exists." };

  if (approved && !(supplier.bankAccountNumber && supplier.bankAccountName)) {
    return {
      ok: false,
      error: "Add bank details before approving — an approved supplier can be issued a PO.",
    };
  }

  await db
    .update(s.suppliers)
    .set({ isApproved: approved })
    .where(eq(s.suppliers.id, supplierId));

  await db.insert(s.auditEvents).values({
    actorId,
    actorLabel: "Ops desk",
    action: approved ? "supplier.approved" : "supplier.unapproved",
    subject: supplier.name,
    detail: { supplierId },
  });

  return { ok: true };
}

export async function updateSupplier(
  supplierId: string,
  patch: {
    name?: string;
    contactName?: string;
    contactPhone?: string;
    bankName?: string;
    bankAccountNumber?: string;
    bankAccountName?: string;
  },
  actorId?: string,
): Promise<void> {
  const db = await getDb();

  // Only overwrite what was actually supplied, so a partial edit cannot blank
  // out bank details that were captured on a field visit.
  const set = Object.fromEntries(
    Object.entries(patch).filter(([, v]) => v !== undefined && v !== ""),
  );
  if (Object.keys(set).length === 0) return;

  await db.update(s.suppliers).set(set).where(eq(s.suppliers.id, supplierId));

  await db.insert(s.auditEvents).values({
    actorId,
    actorLabel: "Ops desk",
    action: "supplier.updated",
    subject: supplierId,
    detail: { fields: Object.keys(set) },
  });
}

/** Registers a supplier the ops desk met directly, without a self-signup. */
export async function createSupplier(input: {
  name: string;
  contactName?: string;
  contactPhone?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  actorId?: string;
}): Promise<string> {
  const db = await getDb();
  const [supplier] = await db
    .insert(s.suppliers)
    .values({
      name: input.name,
      contactName: input.contactName,
      contactPhone: input.contactPhone,
      bankName: input.bankName,
      bankAccountNumber: input.bankAccountNumber,
      bankAccountName: input.bankAccountName,
      isApproved: false,
    })
    .returning({ id: s.suppliers.id });

  await db.insert(s.auditEvents).values({
    actorId: input.actorId,
    actorLabel: "Ops desk",
    action: "supplier.created",
    subject: input.name,
    detail: { supplierId: supplier.id },
  });

  return supplier.id;
}

/** Member accounts linked to a supplier, so ops knows who can sign in as them. */
export async function listSupplierUsers(supplierId: string) {
  const db = await getDb();
  return db
    .select({
      id: s.members.id,
      name: s.members.name,
      phone: s.members.phone,
      lastSeenAt: s.members.lastSeenAt,
    })
    .from(s.members)
    .where(eq(s.members.supplierId, supplierId))
    .orderBy(asc(s.members.name));
}

/** Links an existing member account to a supplier so they can use the portal. */
export async function grantSupplierAccess(
  supplierId: string,
  phone: string,
  actorId?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = await getDb();

  const [member] = await db
    .select({ id: s.members.id, role: s.members.role })
    .from(s.members)
    .where(eq(s.members.phone, phone))
    .limit(1);

  if (!member) {
    return { ok: false, error: "No member with that number. They need to sign in once first." };
  }
  if (member.role === "ops" || member.role === "admin") {
    return { ok: false, error: "That account is ops staff; do not give it a supplier role." };
  }

  await db
    .update(s.members)
    .set({ supplierId, role: "supplier" })
    .where(eq(s.members.id, member.id));

  await db.insert(s.auditEvents).values({
    actorId,
    actorLabel: "Ops desk",
    action: "supplier.access_granted",
    subject: supplierId,
    detail: { memberId: member.id },
  });

  return { ok: true };
}

export async function setWhatsappOptIn(supplierId: string, optIn: boolean): Promise<void> {
  const db = await getDb();
  await db
    .update(s.suppliers)
    .set({ whatsappOptIn: optIn })
    .where(eq(s.suppliers.id, supplierId));
}
