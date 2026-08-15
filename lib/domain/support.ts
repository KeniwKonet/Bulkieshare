import "server-only";

import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

import { getDb } from "../db";
import * as s from "../db/schema";
import { uploadDisputePhoto, UploadError } from "../providers/storage";
import { addHours, formatSlaRemaining, isBreaching } from "../time";

/**
 * Disputes, refunds and the store-credit ledger — everything that happens
 * after a member has their food and something was wrong with it.
 *
 * The dispute SLA is 48 hours. Ops sorts by how close each one is to breaching.
 */

const DISPUTE_SLA_HOURS = 48;

export type DisputeReason = (typeof s.disputeReasonEnum.enumValues)[number];
export type DisputeState = (typeof s.disputeStateEnum.enumValues)[number];

export const DISPUTE_REASON_LABELS: Record<DisputeReason, string> = {
  quality: "Quality, spoiled or off",
  short_weight: "Short weight",
  wrong_cuts: "Wrong cuts",
  no_handover: "Nobody at the hub",
  other: "Something else",
};

export interface DisputeView {
  id: string;
  reference: string;
  memberId: string;
  memberName: string;
  memberPhone: string;
  commitmentId: string | null;
  poolId: string | null;
  poolCode: string | null;
  hubName: string | null;
  reason: DisputeReason;
  reasonLabel: string;
  detail: string;
  state: DisputeState;
  resolution: string | null;
  resolvedCreditKobo: number | null;
  slaDueAt: Date;
  slaLabel: string;
  breaching: boolean;
  photoCount: number;
  createdAt: Date;
  resolvedAt: Date | null;
}

function disputeSelection() {
  return {
    id: s.disputes.id,
    reference: s.disputes.reference,
    memberId: s.disputes.memberId,
    memberName: s.members.name,
    memberPhone: s.members.phone,
    commitmentId: s.disputes.commitmentId,
    poolId: s.disputes.poolId,
    poolCode: s.pools.code,
    hubName: s.hubs.name,
    reason: s.disputes.reason,
    detail: s.disputes.detail,
    state: s.disputes.state,
    resolution: s.disputes.resolution,
    resolvedCreditKobo: s.disputes.resolvedCreditKobo,
    slaDueAt: s.disputes.slaDueAt,
    createdAt: s.disputes.createdAt,
    resolvedAt: s.disputes.resolvedAt,
    photoCount: sql<number>`(
      select count(*)::int from ${s.disputePhotos} p where p.dispute_id = ${s.disputes.id}
    )`,
  };
}

type DisputeRow = {
  id: string; reference: string; memberId: string; memberName: string; memberPhone: string;
  commitmentId: string | null; poolId: string | null; poolCode: string | null;
  hubName: string | null; reason: DisputeReason; detail: string; state: DisputeState;
  resolution: string | null; resolvedCreditKobo: number | null; slaDueAt: Date;
  createdAt: Date; resolvedAt: Date | null; photoCount: number;
};

function toDisputeView(row: DisputeRow, now: Date): DisputeView {
  return {
    ...row,
    reasonLabel: DISPUTE_REASON_LABELS[row.reason],
    slaLabel: formatSlaRemaining(row.slaDueAt, now),
    breaching: isBreaching(row.slaDueAt, now) && row.state !== "resolved" && row.state !== "rejected",
  };
}

async function queryDisputes(where?: ReturnType<typeof and>): Promise<DisputeView[]> {
  const db = await getDb();
  const now = new Date();
  const q = db
    .select(disputeSelection())
    .from(s.disputes)
    .innerJoin(s.members, eq(s.members.id, s.disputes.memberId))
    .leftJoin(s.pools, eq(s.pools.id, s.disputes.poolId))
    .leftJoin(s.hubs, eq(s.hubs.id, s.pools.hubId));

  const rows = (await (where ? q.where(where) : q).orderBy(asc(s.disputes.slaDueAt))) as DisputeRow[];
  return rows.map((r) => toDisputeView(r, now));
}

export async function listOpenDisputes(): Promise<DisputeView[]> {
  return queryDisputes(and(inArray(s.disputes.state, ["open", "investigating"])));
}

export async function listAllDisputes(): Promise<DisputeView[]> {
  return queryDisputes();
}

export async function listMemberDisputes(memberId: string): Promise<DisputeView[]> {
  return queryDisputes(and(eq(s.disputes.memberId, memberId)));
}

export async function getDispute(id: string): Promise<DisputeView | null> {
  const byId = await queryDisputes(and(eq(s.disputes.id, id)));
  if (byId[0]) return byId[0];
  const byRef = await queryDisputes(and(eq(s.disputes.reference, id.toUpperCase())));
  return byRef[0] ?? null;
}

export async function openDispute(input: {
  memberId: string;
  commitmentId?: string | null;
  poolId?: string | null;
  reason: DisputeReason;
  detail: string;
  photoKeys?: string[];
}): Promise<{ id: string; reference: string }> {
  const db = await getDb();
  const reference = `D-${Math.floor(Math.random() * 9000) + 1000}`;

  const [dispute] = await db
    .insert(s.disputes)
    .values({
      reference,
      memberId: input.memberId,
      commitmentId: input.commitmentId ?? null,
      poolId: input.poolId ?? null,
      reason: input.reason,
      detail: input.detail,
      state: "open",
      slaDueAt: addHours(new Date(), DISPUTE_SLA_HOURS),
    })
    .returning({ id: s.disputes.id });

  if (input.photoKeys?.length) {
    await db.insert(s.disputePhotos).values(
      input.photoKeys.map((storageKey) => ({ disputeId: dispute.id, storageKey })),
    );
  }

  return { id: dispute.id, reference };
}

/**
 * Attaches photos to a dispute that already exists, so the files land under a
 * prefix named after its reference. Upload failures are collected rather than
 * thrown: a member who could not attach a picture has still raised a valid
 * complaint, and losing it because their photo was 9MB would be the worse bug.
 */
export async function attachDisputePhotos(
  disputeId: string,
  disputeReference: string,
  files: File[],
): Promise<{ attached: number; problems: string[] }> {
  const usable = files.filter((f) => f && f.size > 0);
  if (!usable.length) return { attached: 0, problems: [] };

  const db = await getDb();
  const keys: string[] = [];
  const problems: string[] = [];

  for (const file of usable.slice(0, MAX_DISPUTE_PHOTOS)) {
    try {
      const stored = await uploadDisputePhoto(file, disputeReference);
      keys.push(stored.key);
    } catch (err) {
      problems.push(err instanceof UploadError ? err.message : "One photo could not be saved.");
    }
  }

  if (keys.length) {
    await db
      .insert(s.disputePhotos)
      .values(keys.map((storageKey) => ({ disputeId, storageKey })));
  }

  if (usable.length > MAX_DISPUTE_PHOTOS) {
    problems.push(`Only the first ${MAX_DISPUTE_PHOTOS} photos were attached.`);
  }

  return { attached: keys.length, problems };
}

export const MAX_DISPUTE_PHOTOS = 4;

/** Storage keys for a dispute, for ops to turn into signed URLs. */
export async function listDisputePhotoKeys(disputeId: string): Promise<string[]> {
  const db = await getDb();
  const rows = await db
    .select({ storageKey: s.disputePhotos.storageKey })
    .from(s.disputePhotos)
    .where(eq(s.disputePhotos.disputeId, disputeId))
    .orderBy(asc(s.disputePhotos.createdAt));
  return rows.map((r) => r.storageKey);
}

export async function resolveDispute(input: {
  disputeId: string;
  outcome: "resolved" | "rejected";
  resolution: string;
  creditKobo?: number;
  actorId?: string;
}): Promise<void> {
  const db = await getDb();

  const [dispute] = await db
    .select()
    .from(s.disputes)
    .where(eq(s.disputes.id, input.disputeId))
    .limit(1);
  if (!dispute) return;

  await db
    .update(s.disputes)
    .set({
      state: input.outcome,
      resolution: input.resolution,
      resolvedCreditKobo: input.creditKobo ?? null,
      resolvedAt: new Date(),
    })
    .where(eq(s.disputes.id, input.disputeId));

  if (input.outcome === "resolved" && input.creditKobo && input.creditKobo > 0) {
    await grantCredit({
      memberId: dispute.memberId,
      label: `Dispute ${dispute.reference} resolved`,
      detail: input.resolution,
      amountKobo: input.creditKobo,
      poolId: dispute.poolId ?? undefined,
    });
  }

  await db.insert(s.auditEvents).values({
    actorId: input.actorId,
    actorLabel: "Ops desk",
    action: `dispute.${input.outcome}`,
    subject: dispute.reference,
    detail: { creditKobo: input.creditKobo ?? 0 },
  });
}

/* ---------------------------------------------------------------------- */
/* Store credit                                                            */
/* ---------------------------------------------------------------------- */

export async function listCreditMovements(memberId: string) {
  const db = await getDb();
  return db
    .select()
    .from(s.creditMovements)
    .where(eq(s.creditMovements.memberId, memberId))
    .orderBy(desc(s.creditMovements.createdAt));
}

/**
 * Writes a ledger row and moves the running balance in one transaction, so the
 * two can never disagree.
 */
export async function grantCredit(input: {
  memberId: string;
  label: string;
  detail?: string;
  amountKobo: number;
  poolId?: string;
}): Promise<void> {
  const db = await getDb();
  await db.transaction(async (tx) => {
    await tx.insert(s.creditMovements).values({
      memberId: input.memberId,
      label: input.label,
      detail: input.detail ?? "",
      amountKobo: input.amountKobo,
      poolId: input.poolId,
    });
    await tx
      .update(s.members)
      .set({ creditKobo: sql`${s.members.creditKobo} + ${input.amountKobo}` })
      .where(eq(s.members.id, input.memberId));
  });
}

/* ---------------------------------------------------------------------- */
/* Refunds                                                                 */
/* ---------------------------------------------------------------------- */

export type RefundState = (typeof s.refundStateEnum.enumValues)[number];

export interface RefundView {
  id: string;
  reference: string;
  memberId: string;
  memberName: string;
  poolId: string | null;
  poolCode: string | null;
  poolTitle: string | null;
  amountKobo: number;
  method: (typeof s.refundMethodEnum.enumValues)[number];
  state: RefundState;
  reason: string;
  bankName: string | null;
  bankAccountNumber: string | null;
  dueAt: Date | null;
  paidAt: Date | null;
  createdAt: Date;
}

async function queryRefunds(where?: ReturnType<typeof and>): Promise<RefundView[]> {
  const db = await getDb();
  const q = db
    .select({
      id: s.refunds.id,
      reference: s.refunds.reference,
      memberId: s.refunds.memberId,
      memberName: s.members.name,
      poolId: s.refunds.poolId,
      poolCode: s.pools.code,
      poolTitle: s.pools.title,
      amountKobo: s.refunds.amountKobo,
      method: s.refunds.method,
      state: s.refunds.state,
      reason: s.refunds.reason,
      bankName: s.refunds.bankName,
      bankAccountNumber: s.refunds.bankAccountNumber,
      dueAt: s.refunds.dueAt,
      paidAt: s.refunds.paidAt,
      createdAt: s.refunds.createdAt,
    })
    .from(s.refunds)
    .innerJoin(s.members, eq(s.members.id, s.refunds.memberId))
    .leftJoin(s.pools, eq(s.pools.id, s.refunds.poolId));

  return (where ? q.where(where) : q).orderBy(desc(s.refunds.createdAt));
}

export async function listRefunds(): Promise<RefundView[]> {
  return queryRefunds();
}

export async function listMemberRefunds(memberId: string): Promise<RefundView[]> {
  return queryRefunds(and(eq(s.refunds.memberId, memberId)));
}

export async function getRefund(idOrReference: string): Promise<RefundView | null> {
  const byId = await queryRefunds(and(eq(s.refunds.id, idOrReference)));
  if (byId[0]) return byId[0];
  const byRef = await queryRefunds(and(eq(s.refunds.reference, idOrReference.toUpperCase())));
  return byRef[0] ?? null;
}

/**
 * Cancels an underfilled pool and raises a refund for every funded commitment.
 * Idempotent — a commitment that already has a refund is skipped.
 */
export async function refundUnderfilledPool(poolId: string, reason: string): Promise<number> {
  const db = await getDb();

  const commitments = await db
    .select({ id: s.commitments.id, memberId: s.commitments.memberId, paidKobo: s.commitments.paidKobo })
    .from(s.commitments)
    .where(and(eq(s.commitments.poolId, poolId), eq(s.commitments.state, "funded")));

  const existing = await db
    .select({ commitmentId: s.refunds.commitmentId })
    .from(s.refunds)
    .where(eq(s.refunds.poolId, poolId));
  const alreadyRefunded = new Set(existing.map((r) => r.commitmentId));

  const pending = commitments.filter((c) => !alreadyRefunded.has(c.id));
  if (!pending.length) return 0;

  await db.insert(s.refunds).values(
    pending.map((c, i) => ({
      reference: `R-${Math.floor(Math.random() * 9000) + 1000 + i}`,
      memberId: c.memberId,
      commitmentId: c.id,
      poolId,
      amountKobo: c.paidKobo,
      method: "bank" as const,
      state: "approved" as const,
      reason,
      dueAt: addHours(new Date(), 72),
    })),
  );

  await db
    .update(s.commitments)
    .set({ state: "refunded" })
    .where(
      and(
        eq(s.commitments.poolId, poolId),
        inArray(
          s.commitments.id,
          pending.map((c) => c.id),
        ),
      ),
    );

  await db.update(s.pools).set({ state: "refunding" }).where(eq(s.pools.id, poolId));

  return pending.length;
}

export async function markRefundPaid(refundId: string, actorId?: string): Promise<void> {
  const db = await getDb();
  const [refund] = await db.select().from(s.refunds).where(eq(s.refunds.id, refundId)).limit(1);
  if (!refund || refund.state === "paid") return;

  await db
    .update(s.refunds)
    .set({ state: "paid", paidAt: new Date() })
    .where(eq(s.refunds.id, refundId));

  await db.insert(s.auditEvents).values({
    actorId,
    actorLabel: "Ops desk",
    action: "refund.paid",
    subject: refund.reference,
    detail: { amountKobo: refund.amountKobo },
  });
}

/** Converts a bank refund into store credit at the member's request. */
export async function takeRefundAsCredit(refundId: string, memberId: string): Promise<void> {
  const db = await getDb();
  const [refund] = await db
    .select()
    .from(s.refunds)
    .where(and(eq(s.refunds.id, refundId), eq(s.refunds.memberId, memberId)))
    .limit(1);

  if (!refund || refund.state === "paid") return;

  await db
    .update(s.refunds)
    .set({ method: "credit", state: "paid", paidAt: new Date() })
    .where(eq(s.refunds.id, refundId));

  await grantCredit({
    memberId,
    label: `Refund ${refund.reference} taken as credit`,
    detail: refund.reason,
    amountKobo: refund.amountKobo,
    poolId: refund.poolId ?? undefined,
  });
}
