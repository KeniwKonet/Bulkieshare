import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";

import { getDb } from "../db";
import * as s from "../db/schema";
import { listPoolsForGroup, type PoolView } from "./pools";

/**
 * Coordinator groups. A coordinator runs pools for a named set of people —
 * an estate, an office, a church — and earns a fee on each pool that completes.
 *
 * The fee is a percentage of collected value, stored in basis points so it
 * stays an integer.
 */

export interface GroupView {
  id: string;
  slug: string;
  name: string;
  areaSlug: string;
  hubId: string | null;
  hubName: string | null;
  coordinatorId: string;
  coordinatorName: string;
  feePctBasisPoints: number;
  memberCount: number;
}

export async function getGroupBySlug(slug: string): Promise<GroupView | null> {
  const db = await getDb();
  const [row] = await db
    .select({
      id: s.groups.id,
      slug: s.groups.slug,
      name: s.groups.name,
      areaSlug: s.groups.areaSlug,
      hubId: s.groups.hubId,
      hubName: s.hubs.name,
      coordinatorId: s.groups.coordinatorId,
      coordinatorName: s.members.name,
      feePctBasisPoints: s.groups.feePctBasisPoints,
      memberCount: sql<number>`(
        select count(*)::int from ${s.groupMembers} gm where gm.group_id = ${s.groups.id}
      )`,
    })
    .from(s.groups)
    .innerJoin(s.members, eq(s.members.id, s.groups.coordinatorId))
    .leftJoin(s.hubs, eq(s.hubs.id, s.groups.hubId))
    .where(eq(s.groups.slug, slug))
    .limit(1);

  return row ?? null;
}

export async function listGroupsForCoordinator(coordinatorId: string) {
  const db = await getDb();
  return db
    .select({
      id: s.groups.id,
      slug: s.groups.slug,
      name: s.groups.name,
      memberCount: sql<number>`(
        select count(*)::int from ${s.groupMembers} gm where gm.group_id = ${s.groups.id}
      )`,
    })
    .from(s.groups)
    .where(eq(s.groups.coordinatorId, coordinatorId))
    .orderBy(asc(s.groups.name));
}

export async function listGroupMembers(groupId: string) {
  const db = await getDb();
  return db
    .select({
      memberId: s.members.id,
      name: s.members.name,
      phone: s.members.phone,
      joinedAt: s.groupMembers.joinedAt,
      pools: sql<number>`(
        select count(*)::int from ${s.commitments} c
        inner join ${s.pools} p on p.id = c.pool_id
        where c.member_id = ${s.members.id} and p.group_id = ${groupId}
      )`,
    })
    .from(s.groupMembers)
    .innerJoin(s.members, eq(s.members.id, s.groupMembers.memberId))
    .where(eq(s.groupMembers.groupId, groupId))
    .orderBy(asc(s.members.name));
}

export async function addGroupMember(groupId: string, memberId: string): Promise<void> {
  const db = await getDb();
  await db
    .insert(s.groupMembers)
    .values({ groupId, memberId })
    .onConflictDoNothing({ target: [s.groupMembers.groupId, s.groupMembers.memberId] });
}

export async function removeGroupMember(groupId: string, memberId: string): Promise<void> {
  const db = await getDb();
  await db
    .delete(s.groupMembers)
    .where(and(eq(s.groupMembers.groupId, groupId), eq(s.groupMembers.memberId, memberId)));
}

/* ---------------------------------------------------------------------- */
/* Fees                                                                    */
/* ---------------------------------------------------------------------- */

export interface CoordinatorPoolFee {
  pool: PoolView;
  collectedKobo: number;
  feeKobo: number;
  isPayable: boolean;
  isPaid: boolean;
}

/**
 * A coordinator earns their fee only once a pool completes. Pools still filling
 * show the fee they are on track for, which is what the dashboard displays.
 */
export async function listCoordinatorFees(groupId: string): Promise<CoordinatorPoolFee[]> {
  const db = await getDb();
  const group = await db
    .select({ fee: s.groups.feePctBasisPoints })
    .from(s.groups)
    .where(eq(s.groups.id, groupId))
    .limit(1);

  const basisPoints = group[0]?.fee ?? 0;
  const pools = await listPoolsForGroup(groupId);

  return pools.map((pool) => {
    const collectedKobo = pool.paidSlots * pool.pricePerSlotKobo;
    const feeKobo = Math.round((collectedKobo * basisPoints) / 10_000);
    return {
      pool,
      collectedKobo,
      feeKobo,
      isPayable: pool.state === "completed",
      isPaid: pool.state === "completed",
    };
  });
}

export async function totalCoordinatorEarnings(groupId: string): Promise<{ paidKobo: number; pendingKobo: number }> {
  const fees = await listCoordinatorFees(groupId);
  return {
    paidKobo: fees.filter((f) => f.isPaid).reduce((sum, f) => sum + f.feeKobo, 0),
    pendingKobo: fees.filter((f) => !f.isPaid).reduce((sum, f) => sum + f.feeKobo, 0),
  };
}

export async function setGroupFee(groupId: string, basisPoints: number): Promise<void> {
  const db = await getDb();
  await db
    .update(s.groups)
    .set({ feePctBasisPoints: Math.max(0, Math.min(1000, Math.round(basisPoints))) })
    .where(eq(s.groups.id, groupId));
}

/* ---------------------------------------------------------------------- */
/* Ops-side cooperative administration                                     */
/* ---------------------------------------------------------------------- */

export interface GroupSummary {
  id: string;
  slug: string;
  name: string;
  areaSlug: string;
  hubName: string | null;
  coordinatorId: string;
  coordinatorName: string;
  coordinatorPhone: string;
  feePctBasisPoints: number;
  memberCount: number;
  poolCount: number;
  openPoolCount: number;
  collectedKobo: number;
}

/** Every cooperative with the numbers ops needs to spot a struggling one. */
export async function listAllGroups(): Promise<GroupSummary[]> {
  const db = await getDb();
  return db
    .select({
      id: s.groups.id,
      slug: s.groups.slug,
      name: s.groups.name,
      areaSlug: s.groups.areaSlug,
      hubName: s.hubs.name,
      coordinatorId: s.groups.coordinatorId,
      coordinatorName: s.members.name,
      coordinatorPhone: s.members.phone,
      feePctBasisPoints: s.groups.feePctBasisPoints,
      memberCount: sql<number>`(
        select count(*)::int from ${s.groupMembers} gm where gm.group_id = ${s.groups.id}
      )`,
      poolCount: sql<number>`(
        select count(*)::int from ${s.pools} p where p.group_id = ${s.groups.id}
      )`,
      openPoolCount: sql<number>`(
        select count(*)::int from ${s.pools} p
        where p.group_id = ${s.groups.id} and p.state = 'open'
      )`,
      collectedKobo: sql<number>`(
        select coalesce(sum(c.paid_kobo), 0)::int
        from ${s.commitments} c
        inner join ${s.pools} p on p.id = c.pool_id
        where p.group_id = ${s.groups.id} and c.state <> 'cancelled'
      )`,
    })
    .from(s.groups)
    .innerJoin(s.members, eq(s.members.id, s.groups.coordinatorId))
    .leftJoin(s.hubs, eq(s.hubs.id, s.groups.hubId))
    .orderBy(asc(s.groups.name));
}

/**
 * Hands a cooperative to a different coordinator.
 *
 * The outgoing coordinator keeps their role only if they still run another
 * group — otherwise they drop back to being an ordinary member, because a role
 * that outlives its reason is how stale privilege accumulates.
 */
export async function setGroupCoordinator(
  groupId: string,
  phone: string,
  actorId?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = await getDb();

  const [group] = await db
    .select({ id: s.groups.id, coordinatorId: s.groups.coordinatorId, name: s.groups.name })
    .from(s.groups)
    .where(eq(s.groups.id, groupId))
    .limit(1);
  if (!group) return { ok: false, error: "That cooperative no longer exists." };

  const [incoming] = await db
    .select({ id: s.members.id, role: s.members.role })
    .from(s.members)
    .where(eq(s.members.phone, phone))
    .limit(1);

  if (!incoming) {
    return { ok: false, error: "No member with that number. They need to sign in once first." };
  }
  if (incoming.id === group.coordinatorId) {
    return { ok: false, error: "They already run this cooperative." };
  }

  await db
    .update(s.groups)
    .set({ coordinatorId: incoming.id })
    .where(eq(s.groups.id, groupId));

  if (incoming.role === "member") {
    await db.update(s.members).set({ role: "coordinator" }).where(eq(s.members.id, incoming.id));
  }

  const [stillRunsSomething] = await db
    .select({ id: s.groups.id })
    .from(s.groups)
    .where(eq(s.groups.coordinatorId, group.coordinatorId))
    .limit(1);

  if (!stillRunsSomething) {
    await db
      .update(s.members)
      .set({ role: "member" })
      .where(and(eq(s.members.id, group.coordinatorId), eq(s.members.role, "coordinator")));
  }

  await db.insert(s.auditEvents).values({
    actorId,
    actorLabel: "Ops desk",
    action: "group.coordinator_changed",
    subject: group.name,
    detail: { groupId, from: group.coordinatorId, to: incoming.id },
  });

  return { ok: true };
}

/** Turns a name into a URL slug, and makes sure it is not already taken. */
export async function suggestGroupSlug(name: string): Promise<string> {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "cooperative";

  const db = await getDb();
  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const [taken] = await db
      .select({ id: s.groups.id })
      .from(s.groups)
      .where(eq(s.groups.slug, candidate))
      .limit(1);
    if (!taken) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function createGroup(input: {
  name: string;
  slug: string;
  areaSlug: string;
  hubId?: string;
  coordinatorId: string;
}): Promise<string> {
  const db = await getDb();
  const [group] = await db
    .insert(s.groups)
    .values({
      name: input.name,
      slug: input.slug,
      areaSlug: input.areaSlug,
      hubId: input.hubId,
      coordinatorId: input.coordinatorId,
    })
    .returning({ id: s.groups.id });

  await db
    .update(s.members)
    .set({ role: "coordinator" })
    .where(and(eq(s.members.id, input.coordinatorId), eq(s.members.role, "member")));

  return group.id;
}

/** True when the member runs this group, or is ops/admin. */
export async function canManageGroup(groupSlug: string, memberId: string, role: string) {
  if (role === "ops" || role === "admin") return true;
  const group = await getGroupBySlug(groupSlug);
  return Boolean(group && group.coordinatorId === memberId);
}
