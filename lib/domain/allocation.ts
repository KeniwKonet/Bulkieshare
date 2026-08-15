import "server-only";

import { createHash } from "node:crypto";
import { asc, eq, inArray, sql } from "drizzle-orm";

import { getDb } from "../db";
import * as s from "../db/schema";
import { getPool, recordPoolEvent } from "./pools";

/**
 * Allocation: splitting one animal between forty people fairly, and being able
 * to prove it afterwards.
 *
 * The draw is a deterministic function of the pool's published seed. The seed
 * goes out before allocation runs, so re-running this on the same pool always
 * produces the same table and nobody can claim it was tuned after seeing who
 * was in the pool.
 *
 * Members who drew below the mean in an earlier pool are prioritised here.
 * That carry-over is the only input other than the seed.
 */

/** Deterministic PRNG. Same seed in, same sequence out, on every machine. */
function seededRandom(seed: string): () => number {
  let h = createHash("sha256").update(seed).digest();
  let i = 0;
  return () => {
    if (i >= h.length - 4) {
      h = createHash("sha256").update(h).digest();
      i = 0;
    }
    const value = h.readUInt32BE(i) / 0xffffffff;
    i += 4;
    return value;
  };
}

export interface AllocationRow {
  slotIndex: number;
  memberId: string;
  memberName: string;
  commitmentId: string;
  weightGrams: number;
  primePct: number;
  prioritised: boolean;
  /** Why they were prioritised, for the audit trail. */
  reason: string | null;
}

export interface AllocationResult {
  poolId: string;
  seed: string;
  rows: AllocationRow[];
  usableWeightGrams: number;
  nominalWeightGrams: number;
  primeMeanPct: number;
  primeSpreadPct: number;
  widestDeviationPct: number;
  belowNominal: number;
}

const PRIME_TARGET_PCT = 40;
/** How much the draw is allowed to move a member's prime share either way. */
const PRIME_SWING_PCT = 6;
/** Extra prime share handed to someone who drew short last time. */
const PRIORITY_BONUS_PCT = 3;

/**
 * Members who previously collected less than the nominal weight for their
 * slots. They go to the front of the queue for prime cuts this time.
 */
async function findShortChanged(memberIds: string[]): Promise<Map<string, number>> {
  if (!memberIds.length) return new Map();
  const db = await getDb();

  const rows = await db
    .select({
      memberId: s.commitments.memberId,
      weightGrams: s.handovers.weightGrams,
      slots: s.commitments.slots,
      nominalGrams: sql<number>`(
        select r.nominal_weight_grams / nullif(p.total_slots, 0)
        from ${s.poolReports} r
        inner join ${s.pools} p on p.id = r.pool_id
        where r.pool_id = ${s.commitments.poolId}
      )`,
    })
    .from(s.handovers)
    .innerJoin(s.commitments, eq(s.commitments.id, s.handovers.commitmentId))
    .where(inArray(s.commitments.memberId, memberIds));

  const deficits = new Map<string, number>();
  for (const r of rows) {
    if (!r.weightGrams || !r.nominalGrams) continue;
    const expected = r.nominalGrams * r.slots;
    const deficitPct = ((expected - r.weightGrams) / expected) * 100;
    if (deficitPct > 1) {
      deficits.set(r.memberId, Math.max(deficits.get(r.memberId) ?? 0, deficitPct));
    }
  }
  return deficits;
}

/**
 * Computes the allocation table. Pure with respect to the database: it reads,
 * but writes nothing until `publishAllocation` is called.
 */
export async function computeAllocation(
  poolId: string,
  usableWeightGrams?: number,
): Promise<AllocationResult | null> {
  const pool = await getPool(poolId);
  if (!pool) return null;

  const db = await getDb();

  const commitments = await db
    .select({
      id: s.commitments.id,
      memberId: s.commitments.memberId,
      memberName: s.members.name,
      slots: s.commitments.slots,
    })
    .from(s.commitments)
    .innerJoin(s.members, eq(s.members.id, s.commitments.memberId))
    .where(eq(s.commitments.poolId, poolId))
    .orderBy(asc(s.commitments.createdAt));

  if (!commitments.length) return null;

  const seed = pool.allocationSeed ?? `${pool.id}-unpublished`;
  const random = seededRandom(seed);

  // Nominal weight per slot comes from the report if one exists, otherwise
  // from the unit description, otherwise a flat share of what came in.
  const report = await db
    .select({
      usable: s.poolReports.usableWeightGrams,
      nominal: s.poolReports.nominalWeightGrams,
    })
    .from(s.poolReports)
    .where(eq(s.poolReports.poolId, poolId))
    .limit(1);

  const totalSlots = commitments.reduce((sum, c) => sum + c.slots, 0);
  const nominalPerSlot =
    report[0]?.nominal && pool.totalSlots
      ? report[0].nominal / pool.totalSlots
      : parseNominalGrams(pool.unitDescription) ?? 2500;

  const usable =
    usableWeightGrams ?? report[0]?.usable ?? Math.round(nominalPerSlot * totalSlots * 1.02);

  const deficits = await findShortChanged(commitments.map((c) => c.memberId));

  // One row per slot, so a member with three slots draws three times.
  const draws: AllocationRow[] = [];
  let slotIndex = 0;

  for (const c of commitments) {
    for (let i = 0; i < c.slots; i++) {
      slotIndex += 1;
      const prioritised = deficits.has(c.memberId);
      const swing = (random() * 2 - 1) * PRIME_SWING_PCT;
      const primePct =
        PRIME_TARGET_PCT + swing + (prioritised ? PRIORITY_BONUS_PCT : 0);

      draws.push({
        slotIndex,
        memberId: c.memberId,
        memberName: c.memberName || "unnamed",
        commitmentId: c.id,
        // Weight is assigned proportionally below; this is a placeholder.
        weightGrams: 0,
        primePct: Math.round(primePct * 10) / 10,
        prioritised,
        reason: prioritised
          ? `drew ${deficits.get(c.memberId)!.toFixed(1)}% under nominal in an earlier pool`
          : null,
      });
    }
  }

  // Share the usable weight out with a small deterministic jitter, then settle
  // the rounding difference one gram at a time across the rows.
  //
  // The remainder must never be dumped on a single row: doing that would hand
  // whoever drew last every gram of accumulated drift, which is exactly the
  // unfairness this whole mechanism exists to prevent.
  const base = Math.floor(usable / draws.length);
  for (const row of draws) {
    row.weightGrams = base + Math.round((random() * 2 - 1) * base * 0.04);
  }

  let drift = usable - draws.reduce((sum, r) => sum + r.weightGrams, 0);
  // Give the surplus to the lightest slots first, take a shortfall from the
  // heaviest, so every correction narrows the spread rather than widening it.
  const step = drift > 0 ? 1 : -1;
  const order = [...draws].sort((a, b) =>
    drift > 0 ? a.weightGrams - b.weightGrams : b.weightGrams - a.weightGrams,
  );
  for (let i = 0; drift !== 0; i = (i + 1) % order.length) {
    order[i].weightGrams += step;
    drift -= step;
  }

  const primes = draws.map((d) => d.primePct);
  const primeMeanPct = primes.reduce((a, b) => a + b, 0) / primes.length;
  const primeSpreadPct = Math.max(...primes) - Math.min(...primes);
  const widestDeviationPct = Math.max(...primes.map((p) => Math.abs(p - primeMeanPct)));
  const belowNominal = draws.filter((d) => d.weightGrams < nominalPerSlot).length;

  return {
    poolId,
    seed,
    rows: draws,
    usableWeightGrams: usable,
    nominalWeightGrams: Math.round(nominalPerSlot * totalSlots),
    primeMeanPct: Math.round(primeMeanPct * 10) / 10,
    primeSpreadPct: Math.round(primeSpreadPct * 10) / 10,
    widestDeviationPct: Math.round(widestDeviationPct * 10) / 10,
    belowNominal,
  };
}

/** "≈2.5kg mixed cuts per slot" → 2500 */
function parseNominalGrams(unitDescription: string): number | null {
  const match = unitDescription.match(/([\d.]+)\s*kg/i);
  return match ? Math.round(Number(match[1]) * 1000) : null;
}

/**
 * Publishes the seed and moves the pool to distributing. Publishing the seed is
 * what makes the draw auditable, so it is recorded as its own timeline event.
 */
export async function publishAllocation(poolId: string, actorId?: string): Promise<void> {
  const db = await getDb();
  const pool = await getPool(poolId);
  if (!pool) return;

  const seed =
    pool.allocationSeed ??
    `${poolId.replace("-", "")}-${createHash("sha256").update(`${poolId}${Date.now()}`).digest("hex").slice(0, 6)}`;

  await db
    .update(s.pools)
    .set({
      allocationSeed: seed,
      seedPublishedAt: pool.seedPublishedAt ?? new Date(),
      state: "distributing",
    })
    .where(eq(s.pools.id, poolId));

  await recordPoolEvent(poolId, `Allocation published, seed ${seed}`);

  await db.insert(s.auditEvents).values({
    actorId,
    actorLabel: "Ops desk",
    action: "allocation.published",
    subject: poolId,
    detail: { seed },
  });
}
