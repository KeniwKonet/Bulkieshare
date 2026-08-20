import "server-only";

import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";

import { getDb } from "../db";
import * as s from "../db/schema";
import { formatAge } from "../time";
import { grantCredit } from "./support";

/**
 * The back office: money that arrived without a home, the audit trail, member
 * lookup, and the reconciliation summary ops works from each morning.
 */

/* ---------------------------------------------------------------------- */
/* Unmatched bank credits                                                  */
/* ---------------------------------------------------------------------- */

export interface UnmatchedTransferView {
  id: string;
  amountKobo: number;
  fromName: string;
  bankRef: string;
  narration: string;
  guess: string;
  state: (typeof s.transferMatchStateEnum.enumValues)[number];
  receivedAt: Date;
  ageLabel: string;
  isUrgent: boolean;
}

export async function listUnmatchedTransfers(): Promise<UnmatchedTransferView[]> {
  const db = await getDb();
  const now = new Date();
  const rows = await db
    .select()
    .from(s.unmatchedTransfers)
    .where(sql`${s.unmatchedTransfers.state} in ('unmatched','escalated')`)
    .orderBy(desc(s.unmatchedTransfers.receivedAt));

  return rows.map((r) => ({
    id: r.id,
    amountKobo: r.amountKobo,
    fromName: r.fromName,
    bankRef: r.bankRef,
    narration: r.narration,
    guess: r.guess,
    state: r.state,
    receivedAt: r.receivedAt,
    ageLabel: formatAge(r.receivedAt, now),
    // Anything sitting more than a day, or already escalated, needs a human now.
    isUrgent:
      r.state === "escalated" || now.getTime() - r.receivedAt.getTime() > 36 * 3_600_000,
  }));
}

export async function resolveTransferAsCredit(
  transferId: string,
  memberId: string,
  actorId?: string,
): Promise<void> {
  const db = await getDb();
  const [transfer] = await db
    .select()
    .from(s.unmatchedTransfers)
    .where(eq(s.unmatchedTransfers.id, transferId))
    .limit(1);
  if (!transfer || transfer.state === "credited") return;

  await grantCredit({
    memberId,
    label: "Unmatched transfer returned as credit",
    detail: `${transfer.bankRef} · ${transfer.fromName}`,
    amountKobo: transfer.amountKobo,
  });

  await db
    .update(s.unmatchedTransfers)
    .set({ state: "credited", resolvedBy: actorId, resolvedAt: new Date() })
    .where(eq(s.unmatchedTransfers.id, transferId));

  await db.insert(s.auditEvents).values({
    actorId,
    actorLabel: "Ops desk",
    action: "transfer.credited",
    subject: transfer.bankRef,
    detail: { amountKobo: transfer.amountKobo, memberId },
  });
}

export async function markTransferReturned(transferId: string, actorId?: string): Promise<void> {
  const db = await getDb();
  await db
    .update(s.unmatchedTransfers)
    .set({ state: "returned", resolvedBy: actorId, resolvedAt: new Date() })
    .where(eq(s.unmatchedTransfers.id, transferId));
}

export async function escalateTransfer(transferId: string, actorId?: string): Promise<void> {
  const db = await getDb();
  await db
    .update(s.unmatchedTransfers)
    .set({ state: "escalated", resolvedBy: actorId })
    .where(eq(s.unmatchedTransfers.id, transferId));
}

/* ---------------------------------------------------------------------- */
/* Members                                                                 */
/* ---------------------------------------------------------------------- */

export async function searchMembers(query?: string) {
  const db = await getDb();
  const like = query ? `%${query}%` : null;

  return db
    .select({
      id: s.members.id,
      name: s.members.name,
      phone: s.members.phone,
      role: s.members.role,
      creditKobo: s.members.creditKobo,
      isBlocked: s.members.isBlocked,
      createdAt: s.members.createdAt,
      // Qualified literally: this query has no join, so an interpolated
      // members.id would render bare and bind to the subquery's own id.
      pools: sql<number>`(
        select count(*)::int from ${s.commitments} c where c.member_id = members.id
      )`,
      openDisputes: sql<number>`(
        select count(*)::int from ${s.disputes} d
        where d.member_id = members.id and d.state in ('open','investigating')
      )`,
    })
    .from(s.members)
    .where(like ? or(ilike(s.members.name, like), ilike(s.members.phone, like)) : undefined)
    .orderBy(desc(s.members.createdAt))
    .limit(100);
}

export async function getMemberDetail(id: string) {
  const db = await getDb();
  const [member] = await db.select().from(s.members).where(eq(s.members.id, id)).limit(1);
  if (!member) return null;

  const commitments = await db
    .select({
      id: s.commitments.id,
      poolCode: s.pools.code,
      poolTitle: s.pools.title,
      slots: s.commitments.slots,
      paidKobo: s.commitments.paidKobo,
      state: s.commitments.state,
      createdAt: s.commitments.createdAt,
    })
    .from(s.commitments)
    .innerJoin(s.pools, eq(s.pools.id, s.commitments.poolId))
    .where(eq(s.commitments.memberId, id))
    .orderBy(desc(s.commitments.createdAt));

  const credit = await db
    .select()
    .from(s.creditMovements)
    .where(eq(s.creditMovements.memberId, id))
    .orderBy(desc(s.creditMovements.createdAt));

  return { member, commitments, credit };
}

export async function setMemberBlocked(id: string, blocked: boolean, actorId?: string) {
  const db = await getDb();
  await db.update(s.members).set({ isBlocked: blocked }).where(eq(s.members.id, id));
  await db.insert(s.auditEvents).values({
    actorId,
    actorLabel: "Ops desk",
    action: blocked ? "member.blocked" : "member.unblocked",
    subject: id,
  });
}

export async function setMemberRole(
  id: string,
  role: (typeof s.memberRoleEnum.enumValues)[number],
  actorId?: string,
) {
  const db = await getDb();
  await db.update(s.members).set({ role }).where(eq(s.members.id, id));
  await db.insert(s.auditEvents).values({
    actorId,
    actorLabel: "Ops desk",
    action: "member.role_changed",
    subject: id,
    detail: { role },
  });
}

/* ---------------------------------------------------------------------- */
/* Audit                                                                   */
/* ---------------------------------------------------------------------- */

export async function listAuditEvents(limit = 200) {
  const db = await getDb();
  return db
    .select({
      id: s.auditEvents.id,
      actorLabel: s.auditEvents.actorLabel,
      action: s.auditEvents.action,
      subject: s.auditEvents.subject,
      detail: s.auditEvents.detail,
      at: s.auditEvents.at,
      actorName: s.members.name,
    })
    .from(s.auditEvents)
    .leftJoin(s.members, eq(s.members.id, s.auditEvents.actorId))
    .orderBy(desc(s.auditEvents.at))
    .limit(limit);
}

export async function recordAudit(input: {
  actorId?: string;
  actorLabel?: string;
  action: string;
  subject?: string;
  detail?: Record<string, unknown>;
}): Promise<void> {
  const db = await getDb();
  await db.insert(s.auditEvents).values({
    actorId: input.actorId,
    actorLabel: input.actorLabel ?? "system",
    action: input.action,
    subject: input.subject ?? "",
    detail: input.detail,
  });
}

/* ---------------------------------------------------------------------- */
/* Reconciliation                                                          */
/* ---------------------------------------------------------------------- */

export async function getReconciliationSummary() {
  const db = await getDb();

  const [money] = await db
    .select({
      collectedKobo: sql<number>`coalesce(sum(${s.payments.amountKobo}) filter (where ${s.payments.state} = 'succeeded'), 0)::int`,
      pendingKobo: sql<number>`coalesce(sum(${s.payments.amountKobo}) filter (where ${s.payments.state} = 'pending'), 0)::int`,
      succeeded: sql<number>`count(*) filter (where ${s.payments.state} = 'succeeded')::int`,
      pending: sql<number>`count(*) filter (where ${s.payments.state} = 'pending')::int`,
    })
    .from(s.payments);

  const [owed] = await db
    .select({
      supplierOwedKobo: sql<number>`coalesce(sum(${s.supplierPayouts.amountKobo}) filter (where ${s.supplierPayouts.state} <> 'paid'), 0)::int`,
      supplierPaidKobo: sql<number>`coalesce(sum(${s.supplierPayouts.amountKobo}) filter (where ${s.supplierPayouts.state} = 'paid'), 0)::int`,
    })
    .from(s.supplierPayouts);

  const [refundState] = await db
    .select({
      outstandingKobo: sql<number>`coalesce(sum(${s.refunds.amountKobo}) filter (where ${s.refunds.state} <> 'paid'), 0)::int`,
      paidKobo: sql<number>`coalesce(sum(${s.refunds.amountKobo}) filter (where ${s.refunds.state} = 'paid'), 0)::int`,
      outstanding: sql<number>`count(*) filter (where ${s.refunds.state} <> 'paid')::int`,
    })
    .from(s.refunds);

  const [unmatched] = await db
    .select({
      n: sql<number>`count(*)::int`,
      amountKobo: sql<number>`coalesce(sum(${s.unmatchedTransfers.amountKobo}), 0)::int`,
    })
    .from(s.unmatchedTransfers)
    .where(sql`${s.unmatchedTransfers.state} in ('unmatched','escalated')`);

  const [creditOutstanding] = await db
    .select({ kobo: sql<number>`coalesce(sum(${s.members.creditKobo}), 0)::int` })
    .from(s.members);

  return { money, owed, refundState, unmatched, creditOutstanding };
}

/** Top-level counters for the ops landing pages. */
export async function getOpsCounts() {
  const db = await getDb();
  const [row] = await db
    .select({
      openPools: sql<number>`(select count(*)::int from ${s.pools} where state = 'open')`,
      fundedPools: sql<number>`(select count(*)::int from ${s.pools} where state = 'funded')`,
      openDisputes: sql<number>`(select count(*)::int from ${s.disputes} where state in ('open','investigating'))`,
      breachingDisputes: sql<number>`(select count(*)::int from ${s.disputes} where state in ('open','investigating') and sla_due_at < now())`,
      outstandingRefunds: sql<number>`(select count(*)::int from ${s.refunds} where state <> 'paid')`,
      unmatched: sql<number>`(select count(*)::int from ${s.unmatchedTransfers} where state in ('unmatched','escalated'))`,
      members: sql<number>`(select count(*)::int from ${s.members})`,
      suppliers: sql<number>`(select count(*)::int from ${s.suppliers})`,
    })
    .from(s.areas)
    .limit(1);
  return row;
}

/* ---------------------------------------------------------------------- */
/* Areas                                                                   */
/* ---------------------------------------------------------------------- */

export async function listAreasWithCounts() {
  const db = await getDb();
  return db
    .select({
      slug: s.areas.slug,
      label: s.areas.label,
      isLive: s.areas.isLive,
      waitlistCount: s.areas.waitlistCount,
      // Qualified literally, for the same reason as searchMembers above.
      hubs: sql<number>`(select count(*)::int from ${s.hubs} h where h.area_slug = areas.slug)`,
      pools: sql<number>`(select count(*)::int from ${s.pools} p where p.area_slug = areas.slug)`,
      waitlist: sql<number>`(select count(*)::int from ${s.waitlist} w where w.area_slug = areas.slug)`,
    })
    .from(s.areas)
    .orderBy(desc(s.areas.isLive));
}

export async function joinWaitlist(phone: string, areaSlug: string, neighbourhood: string) {
  const db = await getDb();
  await db
    .insert(s.waitlist)
    .values({ phone, areaSlug, neighbourhood })
    .onConflictDoNothing({ target: [s.waitlist.phone, s.waitlist.areaSlug] });
  await db
    .update(s.areas)
    .set({ waitlistCount: sql`${s.areas.waitlistCount} + 1` })
    .where(and(eq(s.areas.slug, areaSlug), eq(s.areas.isLive, false)));
}

export async function setAreaLive(slug: string, isLive: boolean, actorId?: string) {
  const db = await getDb();
  await db.update(s.areas).set({ isLive }).where(eq(s.areas.slug, slug));
  await recordAudit({ actorId, actorLabel: "Ops desk", action: "area.updated", subject: slug, detail: { isLive } });
}

/* ---------------------------------------------------------------------- */
/* Hubs                                                                    */
/* ---------------------------------------------------------------------- */

/**
 * Hub ids are short slugs because they appear in URLs and in the mouths of hub
 * agents ("the Kuje one"). Generated from the name, deduplicated.
 */
export async function suggestHubId(name: string): Promise<string> {
  const base =
    name
      .toLowerCase()
      .replace(/\bhub\b/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 24) || "hub";

  const db = await getDb();
  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const [taken] = await db
      .select({ id: s.hubs.id })
      .from(s.hubs)
      .where(eq(s.hubs.id, candidate))
      .limit(1);
    if (!taken) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function createHub(input: {
  id: string;
  areaSlug: string;
  name: string;
  address: string;
  landmark?: string;
  windows?: string;
  capacityPerHour: number;
  notes?: string;
  actorId?: string;
}): Promise<void> {
  const db = await getDb();
  await db.insert(s.hubs).values({
    id: input.id,
    areaSlug: input.areaSlug,
    name: input.name,
    address: input.address,
    landmark: input.landmark ?? "",
    windows: input.windows ?? "",
    capacityPerHour: input.capacityPerHour,
    notes: input.notes,
  });

  await recordAudit({
    actorId: input.actorId,
    actorLabel: "Ops desk",
    action: "hub.created",
    subject: input.name,
    detail: { hubId: input.id, areaSlug: input.areaSlug },
  });
}

export async function updateHub(
  id: string,
  patch: {
    name?: string;
    address?: string;
    landmark?: string;
    windows?: string;
    capacityPerHour?: number;
    notes?: string;
    isActive?: boolean;
  },
  actorId?: string,
): Promise<void> {
  const db = await getDb();

  // Only overwrite what was supplied, so a partial edit cannot blank a field
  // that somebody captured on a site visit.
  const set = Object.fromEntries(
    Object.entries(patch).filter(([, v]) => v !== undefined && v !== ""),
  );
  if (Object.keys(set).length === 0) return;

  await db.update(s.hubs).set(set).where(eq(s.hubs.id, id));
  await recordAudit({
    actorId,
    actorLabel: "Ops desk",
    action: "hub.updated",
    subject: id,
    detail: { fields: Object.keys(set) },
  });
}

/** Who works this hub, so ops can see whether it is actually staffed. */
export async function listHubAgents(hubId: string) {
  const db = await getDb();
  return db
    .select({
      id: s.members.id,
      name: s.members.name,
      phone: s.members.phone,
      lastSeenAt: s.members.lastSeenAt,
    })
    .from(s.members)
    .where(and(eq(s.members.homeHubId, hubId), eq(s.members.role, "hub_agent")))
    .orderBy(asc(s.members.name));
}

/* ---------------------------------------------------------------------- */
/* Waitlist                                                                */
/* ---------------------------------------------------------------------- */

/**
 * The people asking for an area we do not serve. Grouped by neighbourhood,
 * because "340 people in Enugu" is not actionable but "61 of them in Independence
 * Layout" tells you where to put the first hub.
 */
export async function listWaitlist(areaSlug: string) {
  const db = await getDb();
  return db
    .select({
      phone: s.waitlist.phone,
      neighbourhood: s.waitlist.neighbourhood,
      createdAt: s.waitlist.createdAt,
    })
    .from(s.waitlist)
    .where(eq(s.waitlist.areaSlug, areaSlug))
    .orderBy(desc(s.waitlist.createdAt));
}

export async function waitlistByNeighbourhood(areaSlug: string) {
  const db = await getDb();
  return db
    .select({
      neighbourhood: s.waitlist.neighbourhood,
      people: sql<number>`count(*)::int`,
    })
    .from(s.waitlist)
    .where(eq(s.waitlist.areaSlug, areaSlug))
    .groupBy(s.waitlist.neighbourhood)
    .orderBy(desc(sql`count(*)`));
}
