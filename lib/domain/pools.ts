import "server-only";

import { and, asc, desc, eq, gt, inArray, lt, sql } from "drizzle-orm";

import { getDb } from "../db";
import * as s from "../db/schema";
import { formatClosesAt, formatShareDate } from "../time";

/**
 * Pools and the slot arithmetic every screen depends on.
 *
 * Two numbers matter and are easy to get wrong:
 *   paidSlots     — slots backed by a funded commitment
 *   holdingSlots  — slots under an unexpired reservation, not yet paid
 *
 * Availability is `totalSlots - paidSlots - holdingSlots`. Expired holds are
 * excluded by comparing `expires_at` at query time, so a slot frees itself the
 * moment the hold lapses even if the sweep has not run yet.
 */

export type PoolState = (typeof s.poolStateEnum.enumValues)[number];

export interface PoolView {
  id: string;
  code: string;
  areaSlug: string;
  hubId: string;
  hubName: string;
  title: string;
  category: (typeof s.poolCategoryEnum.enumValues)[number];
  photoCaption: string;
  description: string;
  unitDescription: string;
  toleranceBand: string | null;
  cutsBreakdown: string | null;
  totalSlots: number;
  threshold: number;
  pricePerSlotKobo: number;
  marketPricePerSlotKobo: number | null;
  state: PoolState;
  closesAt: Date;
  shareDate: Date;
  supplierName: string | null;
  groupId: string | null;
  allocationSeed: string | null;
  seedPublishedAt: Date | null;

  /** Derived */
  paidSlots: number;
  holdingSlots: number;
  slotsLeft: number;
  thresholdPassed: boolean;
  isOpen: boolean;
  closesAtLabel: string;
  shareDateLabel: string;
  /** Days until closing, floored. Negative once it has closed. */
  closesInDays: number;
}

/** Shared SELECT so every pool read produces the same shape. */
function poolSelection(now: Date) {
  return {
    id: s.pools.id,
    code: s.pools.code,
    areaSlug: s.pools.areaSlug,
    hubId: s.pools.hubId,
    hubName: s.hubs.name,
    title: s.pools.title,
    category: s.pools.category,
    photoCaption: s.pools.photoCaption,
    description: s.pools.description,
    unitDescription: s.pools.unitDescription,
    toleranceBand: s.pools.toleranceBand,
    cutsBreakdown: s.pools.cutsBreakdown,
    totalSlots: s.pools.totalSlots,
    threshold: s.pools.threshold,
    pricePerSlotKobo: s.pools.pricePerSlotKobo,
    marketPricePerSlotKobo: s.pools.marketPricePerSlotKobo,
    state: s.pools.state,
    closesAt: s.pools.closesAt,
    shareDate: s.pools.shareDate,
    supplierName: s.suppliers.name,
    groupId: s.pools.groupId,
    allocationSeed: s.pools.allocationSeed,
    seedPublishedAt: s.pools.seedPublishedAt,
    paidSlots: sql<number>`(
      select coalesce(sum(c.slots), 0)::int from ${s.commitments} c
      where c.pool_id = ${s.pools.id} and c.state <> 'cancelled'
    )`,
    holdingSlots: sql<number>`(
      select coalesce(sum(r.slots), 0)::int from ${s.reservations} r
      where r.pool_id = ${s.pools.id} and r.state = 'holding' and r.expires_at > ${now}
    )`,
  };
}

type PoolRow = Awaited<ReturnType<typeof rawPools>>[number];

async function rawPools(now: Date, where?: ReturnType<typeof and>) {
  const db = await getDb();
  const q = db
    .select(poolSelection(now))
    .from(s.pools)
    .innerJoin(s.hubs, eq(s.hubs.id, s.pools.hubId))
    .leftJoin(s.suppliers, eq(s.suppliers.id, s.pools.supplierId));
  return where ? q.where(where) : q;
}

function toView(row: PoolRow, now: Date): PoolView {
  const slotsLeft = Math.max(0, row.totalSlots - row.paidSlots - row.holdingSlots);
  return {
    ...row,
    slotsLeft,
    thresholdPassed: row.paidSlots + row.holdingSlots >= row.threshold,
    isOpen: row.state === "open" && row.closesAt > now && slotsLeft > 0,
    closesAtLabel: formatClosesAt(row.closesAt, now),
    shareDateLabel: formatShareDate(row.shareDate),
    closesInDays: Math.floor((row.closesAt.getTime() - now.getTime()) / 86_400_000),
  };
}

export async function getPool(id: string): Promise<PoolView | null> {
  const now = new Date();
  const rows = await rawPools(now, and(eq(s.pools.id, id.toLowerCase())));
  return rows[0] ? toView(rows[0], now) : null;
}

export async function getPoolByCode(code: string): Promise<PoolView | null> {
  return getPool(code.replace(/^#/, "").toLowerCase());
}

export async function listPoolsByArea(
  areaSlug: string,
  opts: { states?: PoolState[]; hubId?: string } = {},
): Promise<PoolView[]> {
  const now = new Date();
  const clauses = [eq(s.pools.areaSlug, areaSlug)];
  if (opts.states?.length) clauses.push(inArray(s.pools.state, opts.states));
  if (opts.hubId) clauses.push(eq(s.pools.hubId, opts.hubId));

  const rows = await rawPools(now, and(...clauses));
  return rows
    .map((r) => toView(r, now))
    .sort((a, b) => {
      // Open pools first, then by how soon they close.
      if (a.isOpen !== b.isOpen) return a.isOpen ? -1 : 1;
      return a.closesAt.getTime() - b.closesAt.getTime();
    });
}

export async function listOpenPools(areaSlug: string): Promise<PoolView[]> {
  const pools = await listPoolsByArea(areaSlug, { states: ["open"] });
  return pools.filter((p) => p.isOpen);
}

export async function listAllPools(): Promise<PoolView[]> {
  const now = new Date();
  const rows = await rawPools(now);
  return rows.map((r) => toView(r, now)).sort((a, b) => b.closesAt.getTime() - a.closesAt.getTime());
}

export async function listPoolsForGroup(groupId: string): Promise<PoolView[]> {
  const now = new Date();
  const rows = await rawPools(now, and(eq(s.pools.groupId, groupId)));
  return rows.map((r) => toView(r, now));
}

/* ---------------------------------------------------------------------- */
/* Areas and hubs                                                          */
/* ---------------------------------------------------------------------- */

export async function listAreas() {
  const db = await getDb();
  return db.select().from(s.areas).orderBy(desc(s.areas.isLive), asc(s.areas.label));
}

export async function getArea(slug: string) {
  const db = await getDb();
  const [row] = await db.select().from(s.areas).where(eq(s.areas.slug, slug)).limit(1);
  return row ?? null;
}

export async function listHubs(areaSlug?: string) {
  const db = await getDb();
  const now = new Date();
  const rows = await db
    .select({
      id: s.hubs.id,
      areaSlug: s.hubs.areaSlug,
      name: s.hubs.name,
      address: s.hubs.address,
      landmark: s.hubs.landmark,
      windows: s.hubs.windows,
      capacityPerHour: s.hubs.capacityPerHour,
      notes: s.hubs.notes,
      openPools: sql<number>`(
        select count(*)::int from ${s.pools} p
        where p.hub_id = ${s.hubs.id} and p.state = 'open' and p.closes_at > ${now}
      )`,
    })
    .from(s.hubs)
    .where(areaSlug ? eq(s.hubs.areaSlug, areaSlug) : undefined)
    .orderBy(asc(s.hubs.name));
  return rows;
}

export async function getHub(id: string) {
  const [hub] = await listHubs().then((rows) => rows.filter((h) => h.id === id));
  return hub ?? null;
}

/* ---------------------------------------------------------------------- */
/* Timeline and settlement report                                          */
/* ---------------------------------------------------------------------- */

export async function getPoolTimeline(poolId: string) {
  const db = await getDb();
  return db
    .select()
    .from(s.poolEvents)
    .where(eq(s.poolEvents.poolId, poolId))
    .orderBy(asc(s.poolEvents.at));
}

export async function getPoolReport(poolId: string) {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(s.poolReports)
    .where(eq(s.poolReports.poolId, poolId))
    .limit(1);
  return row ?? null;
}

export async function recordPoolEvent(poolId: string, label: string): Promise<void> {
  const db = await getDb();
  await db.insert(s.poolEvents).values({ poolId, label });
}

/* ---------------------------------------------------------------------- */
/* Lifecycle                                                               */
/* ---------------------------------------------------------------------- */

/**
 * Releases holds whose 20 minutes ran out. Availability queries already ignore
 * expired holds, so this is bookkeeping rather than correctness — it keeps the
 * ops views honest and stops the table growing a tail of stale "holding" rows.
 */
export async function sweepExpiredHolds(): Promise<number> {
  const db = await getDb();
  const expired = await db
    .update(s.reservations)
    .set({ state: "expired" })
    .where(and(eq(s.reservations.state, "holding"), lt(s.reservations.expiresAt, new Date())))
    .returning({ id: s.reservations.id });
  return expired.length;
}

/**
 * Moves pools past their closing time into the right terminal state: funded if
 * the threshold was met, underfilled if it was not. Called opportunistically
 * from ops screens and from the pool listing.
 */
export async function settleClosedPools(): Promise<{ funded: string[]; underfilled: string[] }> {
  const now = new Date();
  const db = await getDb();
  const due = await rawPools(now, and(eq(s.pools.state, "open"), lt(s.pools.closesAt, now)));

  const funded: string[] = [];
  const underfilled: string[] = [];

  for (const row of due) {
    const passed = row.paidSlots >= row.threshold;
    await db
      .update(s.pools)
      .set({ state: passed ? "funded" : "underfilled" })
      .where(eq(s.pools.id, row.id));
    await recordPoolEvent(
      row.id,
      passed
        ? `Closed with ${row.paidSlots} of ${row.totalSlots} paid, threshold met`
        : `Closed under threshold at ${row.paidSlots} of ${row.threshold}, refunding`,
    );
    (passed ? funded : underfilled).push(row.id);
  }

  return { funded, underfilled };
}

export async function setPoolState(poolId: string, state: PoolState, note?: string): Promise<void> {
  const db = await getDb();
  await db.update(s.pools).set({ state }).where(eq(s.pools.id, poolId));
  await recordPoolEvent(poolId, note ?? `State set to ${state}`);
}

/** Next free pool code in an area, e.g. "A-2245". */
export async function nextPoolCode(areaSlug: string): Promise<{ id: string; code: string }> {
  const db = await getDb();
  const prefix = areaSlug.charAt(0).toUpperCase();
  const [row] = await db
    .select({ code: s.pools.code })
    .from(s.pools)
    .where(eq(s.pools.areaSlug, areaSlug))
    .orderBy(desc(s.pools.code))
    .limit(1);

  const lastNumber = row ? Number.parseInt(row.code.split("-")[1] ?? "2200", 10) : 2200;
  const next = lastNumber + 1;
  return { id: `${prefix.toLowerCase()}-${next}`, code: `${prefix}-${next}` };
}

/** Roster of everyone holding or paid in a pool — the coordinator's people view. */
export async function getPoolRoster(poolId: string) {
  const db = await getDb();
  const now = new Date();

  const paid = await db
    .select({
      name: s.members.name,
      memberId: s.members.id,
      slots: s.commitments.slots,
      code: s.commitments.collectionCode,
      windowAt: s.commitments.windowAt,
      paidByCoordinator: s.commitments.paidByCoordinator,
      state: s.commitments.state,
    })
    .from(s.commitments)
    .innerJoin(s.members, eq(s.members.id, s.commitments.memberId))
    .where(eq(s.commitments.poolId, poolId))
    .orderBy(asc(s.members.name));

  const holding = await db
    .select({
      name: s.members.name,
      memberId: s.members.id,
      slots: s.reservations.slots,
      expiresAt: s.reservations.expiresAt,
    })
    .from(s.reservations)
    .innerJoin(s.members, eq(s.members.id, s.reservations.memberId))
    .where(
      and(
        eq(s.reservations.poolId, poolId),
        eq(s.reservations.state, "holding"),
        gt(s.reservations.expiresAt, now),
      ),
    )
    .orderBy(asc(s.members.name));

  return { paid, holding };
}
