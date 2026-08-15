import "server-only";

import { and, asc, desc, eq, sql } from "drizzle-orm";

import { getDb } from "../db";
import * as s from "../db/schema";
import { formatShareDate, formatTimeOfDay } from "../time";

/**
 * A commitment is a member's paid stake in a pool: how many slots, who each
 * slot is for, when they are collecting, and the code the hub agent checks.
 */

export interface CommitmentSummary {
  id: string;
  memberId: string;
  memberName: string;
  memberPhone: string;
  poolId: string;
  poolCode: string;
  poolTitle: string;
  poolState: (typeof s.poolStateEnum.enumValues)[number];
  hubId: string;
  hubName: string;
  shareDate: Date;
  shareDateLabel: string;
  unitDescription: string;
  photoCaption: string;
  slots: number;
  paidKobo: number;
  state: (typeof s.commitmentStateEnum.enumValues)[number];
  paidByCoordinator: boolean;
  collectionCode: string | null;
  windowAt: Date | null;
  windowLabel: string | null;
  namedSlots: number;
  hasOpenDispute: boolean;
  collectedAt: Date | null;
}

function selection(memberScoped: boolean) {
  return {
    id: s.commitments.id,
    poolId: s.commitments.poolId,
    poolCode: s.pools.code,
    poolTitle: s.pools.title,
    poolState: s.pools.state,
    hubId: s.pools.hubId,
    hubName: s.hubs.name,
    shareDate: s.pools.shareDate,
    unitDescription: s.pools.unitDescription,
    photoCaption: s.pools.photoCaption,
    slots: s.commitments.slots,
    paidKobo: s.commitments.paidKobo,
    state: s.commitments.state,
    paidByCoordinator: s.commitments.paidByCoordinator,
    collectionCode: s.commitments.collectionCode,
    windowAt: s.commitments.windowAt,
    memberId: s.commitments.memberId,
    memberName: s.members.name,
    memberPhone: s.members.phone,
    namedSlots: sql<number>`(
      select count(*)::int from ${s.beneficiaries} b
      where b.commitment_id = ${s.commitments.id} and b.name <> ''
    )`,
    openDisputes: sql<number>`(
      select count(*)::int from ${s.disputes} d
      where d.commitment_id = ${s.commitments.id} and d.state in ('open','investigating')
    )`,
    collectedAt: sql<Date | null>`(
      select h.handed_over_at from ${s.handovers} h
      where h.commitment_id = ${s.commitments.id} limit 1
    )`,
    ...(memberScoped ? {} : {}),
  };
}

type Row = {
  id: string;
  poolId: string;
  poolCode: string;
  poolTitle: string;
  poolState: CommitmentSummary["poolState"];
  hubId: string;
  hubName: string;
  shareDate: Date;
  unitDescription: string;
  photoCaption: string;
  slots: number;
  paidKobo: number;
  state: CommitmentSummary["state"];
  paidByCoordinator: boolean;
  collectionCode: string | null;
  windowAt: Date | null;
  memberId: string;
  memberName: string;
  memberPhone: string;
  namedSlots: number;
  openDisputes: number;
  collectedAt: Date | string | null;
};

function toSummary(row: Row): CommitmentSummary {
  return {
    id: row.id,
    memberId: row.memberId,
    memberName: row.memberName,
    memberPhone: row.memberPhone,
    poolId: row.poolId,
    poolCode: row.poolCode,
    poolTitle: row.poolTitle,
    poolState: row.poolState,
    hubId: row.hubId,
    hubName: row.hubName,
    shareDate: row.shareDate,
    shareDateLabel: formatShareDate(row.shareDate),
    unitDescription: row.unitDescription,
    photoCaption: row.photoCaption,
    slots: row.slots,
    paidKobo: row.paidKobo,
    state: row.state,
    paidByCoordinator: row.paidByCoordinator,
    collectionCode: row.collectionCode,
    windowAt: row.windowAt,
    windowLabel: row.windowAt ? formatTimeOfDay(row.windowAt) : null,
    namedSlots: row.namedSlots,
    hasOpenDispute: row.openDisputes > 0,
    collectedAt: row.collectedAt ? new Date(row.collectedAt) : null,
  };
}

export async function listMemberCommitments(memberId: string): Promise<CommitmentSummary[]> {
  const db = await getDb();
  const rows = (await db
    .select(selection(true))
    .from(s.commitments)
    .innerJoin(s.pools, eq(s.pools.id, s.commitments.poolId))
    .innerJoin(s.hubs, eq(s.hubs.id, s.pools.hubId))
    .innerJoin(s.members, eq(s.members.id, s.commitments.memberId))
    .where(eq(s.commitments.memberId, memberId))
    .orderBy(desc(s.pools.shareDate))) as Row[];

  return rows.map(toSummary);
}

export async function getCommitment(id: string): Promise<CommitmentSummary | null> {
  const db = await getDb();
  const rows = (await db
    .select(selection(false))
    .from(s.commitments)
    .innerJoin(s.pools, eq(s.pools.id, s.commitments.poolId))
    .innerJoin(s.hubs, eq(s.hubs.id, s.pools.hubId))
    .innerJoin(s.members, eq(s.members.id, s.commitments.memberId))
    .where(eq(s.commitments.id, id))
    .limit(1)) as Row[];

  return rows[0] ? toSummary(rows[0]) : null;
}

/** The owner check every commitment page and action needs. */
export async function getOwnedCommitment(
  id: string,
  memberId: string,
): Promise<CommitmentSummary | null> {
  const db = await getDb();
  const [own] = await db
    .select({ id: s.commitments.id })
    .from(s.commitments)
    .where(and(eq(s.commitments.id, id), eq(s.commitments.memberId, memberId)))
    .limit(1);
  return own ? getCommitment(id) : null;
}

/* ---------------------------------------------------------------------- */
/* Beneficiaries — who each slot is for                                    */
/* ---------------------------------------------------------------------- */

export async function listBeneficiaries(commitmentId: string) {
  const db = await getDb();
  return db
    .select()
    .from(s.beneficiaries)
    .where(eq(s.beneficiaries.commitmentId, commitmentId))
    .orderBy(asc(s.beneficiaries.slotIndex));
}

export async function nameBeneficiary(input: {
  commitmentId: string;
  slotIndex: number;
  name: string;
  phone?: string | null;
}): Promise<void> {
  const db = await getDb();
  await db
    .update(s.beneficiaries)
    .set({ name: input.name.trim(), phone: input.phone?.trim() || null })
    .where(
      and(
        eq(s.beneficiaries.commitmentId, input.commitmentId),
        eq(s.beneficiaries.slotIndex, input.slotIndex),
      ),
    );
}

/* ---------------------------------------------------------------------- */
/* Collection windows                                                      */
/* ---------------------------------------------------------------------- */

export interface CollectionWindow {
  at: Date;
  label: string;
  capacity: number;
  booked: number;
  isFull: boolean;
}

const WINDOW_MINUTES = 20;
const DAY_START_HOUR = 9;
const DAY_END_HOUR = 15;

/**
 * Windows are generated from the hub's hourly capacity rather than stored, so
 * changing a hub's throughput immediately changes what members can book.
 */
export async function listCollectionWindows(
  poolId: string,
): Promise<{ windows: CollectionWindow[]; hubName: string; shareDateLabel: string } | null> {
  const db = await getDb();
  const [pool] = await db
    .select({
      shareDate: s.pools.shareDate,
      hubId: s.pools.hubId,
      hubName: s.hubs.name,
      capacityPerHour: s.hubs.capacityPerHour,
    })
    .from(s.pools)
    .innerJoin(s.hubs, eq(s.hubs.id, s.pools.hubId))
    .where(eq(s.pools.id, poolId))
    .limit(1);

  if (!pool) return null;

  const booked = await db
    .select({ windowAt: s.commitments.windowAt, n: sql<number>`count(*)::int` })
    .from(s.commitments)
    .where(and(eq(s.commitments.poolId, poolId), sql`${s.commitments.windowAt} is not null`))
    .groupBy(s.commitments.windowAt);

  const bookedAt = new Map(
    booked.map((b) => [new Date(b.windowAt!).toISOString(), b.n] as const),
  );

  const perWindow = Math.max(1, Math.round((pool.capacityPerHour * WINDOW_MINUTES) / 60));
  const windows: CollectionWindow[] = [];

  const day = new Date(pool.shareDate);
  day.setHours(DAY_START_HOUR, 0, 0, 0);
  const end = new Date(pool.shareDate);
  end.setHours(DAY_END_HOUR, 0, 0, 0);

  for (let t = new Date(day); t < end; t = new Date(t.getTime() + WINDOW_MINUTES * 60_000)) {
    const n = bookedAt.get(t.toISOString()) ?? 0;
    windows.push({
      at: new Date(t),
      label: formatTimeOfDay(t),
      capacity: perWindow,
      booked: n,
      isFull: n >= perWindow,
    });
  }

  return {
    windows,
    hubName: pool.hubName,
    shareDateLabel: formatShareDate(pool.shareDate),
  };
}

export async function bookCollectionWindow(
  commitmentId: string,
  at: Date | null,
): Promise<void> {
  const db = await getDb();
  await db.update(s.commitments).set({ windowAt: at }).where(eq(s.commitments.id, commitmentId));
}

/* ---------------------------------------------------------------------- */
/* Handovers — the hub agent side                                          */
/* ---------------------------------------------------------------------- */

export interface HandoverRow {
  commitmentId: string;
  memberName: string;
  memberPhone: string;
  slots: number;
  collectionCode: string | null;
  windowAt: Date | null;
  windowLabel: string | null;
  poolCode: string;
  poolTitle: string;
  handedOverAt: Date | null;
}

/** Everyone due to collect at a hub, for the agent's handover list. */
export async function listHandoverQueue(hubId: string): Promise<HandoverRow[]> {
  const db = await getDb();
  const rows = await db
    .select({
      commitmentId: s.commitments.id,
      memberName: s.members.name,
      memberPhone: s.members.phone,
      slots: s.commitments.slots,
      collectionCode: s.commitments.collectionCode,
      windowAt: s.commitments.windowAt,
      poolCode: s.pools.code,
      poolTitle: s.pools.title,
      handedOverAt: sql<Date | null>`(
        select h.handed_over_at from ${s.handovers} h
        where h.commitment_id = ${s.commitments.id} limit 1
      )`,
    })
    .from(s.commitments)
    .innerJoin(s.pools, eq(s.pools.id, s.commitments.poolId))
    .innerJoin(s.members, eq(s.members.id, s.commitments.memberId))
    .where(
      and(
        eq(s.pools.hubId, hubId),
        sql`${s.pools.state} in ('funded','allocating','distributing','completed')`,
      ),
    )
    .orderBy(asc(s.commitments.windowAt), asc(s.members.name));

  return rows.map((r) => ({
    ...r,
    handedOverAt: r.handedOverAt ? new Date(r.handedOverAt) : null,
    windowLabel: r.windowAt ? formatTimeOfDay(r.windowAt) : null,
  }));
}

export async function recordHandover(input: {
  commitmentId: string;
  hubId: string;
  agentId?: string;
  weightGrams?: number | null;
  notes?: string | null;
  handedOverAt?: Date;
  capturedOffline?: boolean;
}): Promise<void> {
  const db = await getDb();

  const [existing] = await db
    .select({ id: s.handovers.id })
    .from(s.handovers)
    .where(eq(s.handovers.commitmentId, input.commitmentId))
    .limit(1);
  if (existing) return;

  await db.insert(s.handovers).values({
    commitmentId: input.commitmentId,
    hubId: input.hubId,
    agentId: input.agentId,
    weightGrams: input.weightGrams ?? null,
    notes: input.notes ?? null,
    handedOverAt: input.handedOverAt ?? new Date(),
    syncedAt: input.capturedOffline ? new Date() : null,
  });

  await db
    .update(s.commitments)
    .set({ state: "collected" })
    .where(eq(s.commitments.id, input.commitmentId));
}

/** Verifies a 4-digit collection code at the hub counter. */
export async function findByCollectionCode(hubId: string, code: string) {
  const db = await getDb();
  const [row] = await db
    .select({
      commitmentId: s.commitments.id,
      memberName: s.members.name,
      slots: s.commitments.slots,
      poolCode: s.pools.code,
      poolTitle: s.pools.title,
      alreadyCollected: sql<number>`(
        select count(*)::int from ${s.handovers} h where h.commitment_id = ${s.commitments.id}
      )`,
    })
    .from(s.commitments)
    .innerJoin(s.pools, eq(s.pools.id, s.commitments.poolId))
    .innerJoin(s.members, eq(s.members.id, s.commitments.memberId))
    .where(and(eq(s.pools.hubId, hubId), eq(s.commitments.collectionCode, code)))
    .limit(1);

  return row ?? null;
}
