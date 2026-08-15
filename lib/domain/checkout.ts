import "server-only";

import { randomBytes, randomInt } from "node:crypto";
import { and, eq, gt, sql } from "drizzle-orm";

import { getDb } from "../db";
import * as s from "../db/schema";
import { addMinutes } from "../time";
import { getPaymentsProvider, PAYMENT_HOLD_MINUTES, type TransferInstruction } from "../providers/payments";
import { recordPoolEvent } from "./pools";

/**
 * Reserve → pay → commit.
 *
 * A reservation is a 20 minute hold on N slots. Paying it turns it into a
 * commitment, which is the member's actual stake in the pool. Store credit is
 * applied at reservation time and only debited when the payment settles, so an
 * abandoned reservation never costs anyone their credit.
 *
 * Availability is checked inside a transaction that locks the pool row, so two
 * members racing for the last slot cannot both win it.
 */

export class CheckoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CheckoutError";
  }
}

export interface ReservationQuote {
  slots: number;
  pricePerSlotKobo: number;
  subtotalKobo: number;
  creditAvailableKobo: number;
  creditAppliedKobo: number;
  amountDueKobo: number;
}

export function quoteReservation(
  slots: number,
  pricePerSlotKobo: number,
  creditAvailableKobo: number,
): ReservationQuote {
  const subtotalKobo = pricePerSlotKobo * slots;
  const creditAppliedKobo = Math.max(0, Math.min(creditAvailableKobo, subtotalKobo));
  return {
    slots,
    pricePerSlotKobo,
    subtotalKobo,
    creditAvailableKobo,
    creditAppliedKobo,
    amountDueKobo: subtotalKobo - creditAppliedKobo,
  };
}

function shortReference(prefix: string): string {
  return `${prefix}-${randomBytes(3).toString("hex")}`;
}

function collectionCode(): string {
  return String(randomInt(1000, 10000));
}

/* ---------------------------------------------------------------------- */
/* Reserving                                                               */
/* ---------------------------------------------------------------------- */

export interface ReserveInput {
  poolId: string;
  memberId: string;
  slots: number;
  useCredit?: boolean;
}

export async function reserveSlots(input: ReserveInput): Promise<{ reference: string }> {
  const { poolId, memberId, slots, useCredit = true } = input;
  if (!Number.isInteger(slots) || slots < 1) throw new CheckoutError("Choose at least one slot.");

  const db = await getDb();
  const now = new Date();

  return db.transaction(async (tx) => {
    // Lock the pool so concurrent reservations serialise on this row.
    const [pool] = await tx
      .select()
      .from(s.pools)
      .where(eq(s.pools.id, poolId))
      .limit(1)
      .for("update");

    if (!pool) throw new CheckoutError("That pool no longer exists.");
    if (pool.state !== "open") throw new CheckoutError("This pool is closed.");
    if (pool.closesAt <= now) throw new CheckoutError("This pool has closed.");

    const [{ paid, holding }] = await tx
      .select({
        paid: sql<number>`(
          select coalesce(sum(c.slots), 0)::int from ${s.commitments} c
          where c.pool_id = ${poolId} and c.state <> 'cancelled'
        )`,
        holding: sql<number>`(
          select coalesce(sum(r.slots), 0)::int from ${s.reservations} r
          where r.pool_id = ${poolId} and r.state = 'holding' and r.expires_at > ${now}
        )`,
      })
      .from(s.pools)
      .where(eq(s.pools.id, poolId));

    const available = pool.totalSlots - paid - holding;
    if (available <= 0) throw new CheckoutError("This pool is full.");
    if (slots > available) {
      throw new CheckoutError(
        `Only ${available} slot${available === 1 ? "" : "s"} left. Reduce how many you want.`,
      );
    }

    const [member] = await tx
      .select({ creditKobo: s.members.creditKobo })
      .from(s.members)
      .where(eq(s.members.id, memberId))
      .limit(1);
    if (!member) throw new CheckoutError("Sign in again to reserve a slot.");

    const quote = quoteReservation(
      slots,
      pool.pricePerSlotKobo,
      useCredit ? member.creditKobo : 0,
    );

    const reference = shortReference(pool.id);
    await tx.insert(s.reservations).values({
      reference,
      poolId,
      memberId,
      slots,
      subtotalKobo: quote.subtotalKobo,
      creditAppliedKobo: quote.creditAppliedKobo,
      amountDueKobo: quote.amountDueKobo,
      state: "holding",
      expiresAt: addMinutes(now, PAYMENT_HOLD_MINUTES),
    });

    return { reference };
  });
}

export interface ReservationView {
  id: string;
  reference: string;
  poolId: string;
  poolCode: string;
  poolTitle: string;
  hubName: string;
  shareDate: Date;
  memberId: string;
  memberName: string;
  memberPhone: string;
  slots: number;
  subtotalKobo: number;
  creditAppliedKobo: number;
  amountDueKobo: number;
  state: (typeof s.reservationStateEnum.enumValues)[number];
  expiresAt: Date;
  createdAt: Date;
}

export async function getReservation(reference: string): Promise<ReservationView | null> {
  const db = await getDb();
  const [row] = await db
    .select({
      id: s.reservations.id,
      reference: s.reservations.reference,
      poolId: s.reservations.poolId,
      poolCode: s.pools.code,
      poolTitle: s.pools.title,
      hubName: s.hubs.name,
      shareDate: s.pools.shareDate,
      memberId: s.reservations.memberId,
      memberName: s.members.name,
      memberPhone: s.members.phone,
      slots: s.reservations.slots,
      subtotalKobo: s.reservations.subtotalKobo,
      creditAppliedKobo: s.reservations.creditAppliedKobo,
      amountDueKobo: s.reservations.amountDueKobo,
      state: s.reservations.state,
      expiresAt: s.reservations.expiresAt,
      createdAt: s.reservations.createdAt,
    })
    .from(s.reservations)
    .innerJoin(s.pools, eq(s.pools.id, s.reservations.poolId))
    .innerJoin(s.hubs, eq(s.hubs.id, s.pools.hubId))
    .innerJoin(s.members, eq(s.members.id, s.reservations.memberId))
    .where(eq(s.reservations.reference, reference))
    .limit(1);

  return row ?? null;
}

export async function cancelReservation(reference: string, memberId: string): Promise<void> {
  const db = await getDb();
  await db
    .update(s.reservations)
    .set({ state: "cancelled" })
    .where(
      and(
        eq(s.reservations.reference, reference),
        eq(s.reservations.memberId, memberId),
        eq(s.reservations.state, "holding"),
      ),
    );
}

/* ---------------------------------------------------------------------- */
/* Paying                                                                  */
/* ---------------------------------------------------------------------- */

export interface PaymentView {
  reference: string;
  amountKobo: number;
  state: (typeof s.paymentStateEnum.enumValues)[number];
  instruction: TransferInstruction | null;
}

/**
 * Idempotent: calling this twice for a reservation returns the same payment and
 * the same account number rather than issuing a second charge.
 */
export async function startPayment(reservationReference: string): Promise<PaymentView> {
  const db = await getDb();
  const reservation = await getReservation(reservationReference);
  if (!reservation) throw new CheckoutError("That reservation no longer exists.");

  if (reservation.state === "expired" || reservation.expiresAt <= new Date()) {
    throw new CheckoutError("This hold has expired. Reserve the slot again.");
  }

  const [existing] = await db
    .select()
    .from(s.payments)
    .where(
      and(eq(s.payments.reservationId, reservation.id), eq(s.payments.state, "pending")),
    )
    .limit(1);

  if (existing) {
    return {
      reference: existing.reference,
      amountKobo: existing.amountKobo,
      state: existing.state,
      instruction: existing.virtualAccountNumber
        ? {
            accountNumber: existing.virtualAccountNumber,
            bankName: existing.virtualAccountBank ?? "Bank",
            accountName: "BulkieShare / Pool escrow",
            expiresAt: reservation.expiresAt,
            providerReference: existing.providerReference ?? existing.reference,
          }
        : null,
    };
  }

  const provider = getPaymentsProvider();
  const reference = shortReference("pay");

  // A reservation fully covered by store credit needs no bank transfer at all.
  if (reservation.amountDueKobo === 0) {
    await db.insert(s.payments).values({
      reference,
      reservationId: reservation.id,
      memberId: reservation.memberId,
      amountKobo: 0,
      method: "credit",
      state: "pending",
      provider: "credit",
    });
    await confirmPayment(reference, { amountKobo: 0 });
    return { reference, amountKobo: 0, state: "succeeded", instruction: null };
  }

  const charge = await provider.createTransferCharge({
    reference,
    amountKobo: reservation.amountDueKobo,
    email: `${reservation.memberPhone.replace("+", "")}@members.bulkieshare.ng`,
    phone: reservation.memberPhone,
  });

  if (!charge.ok) throw new CheckoutError(charge.error);

  await db.insert(s.payments).values({
    reference,
    reservationId: reservation.id,
    memberId: reservation.memberId,
    amountKobo: reservation.amountDueKobo,
    method: "transfer",
    state: "pending",
    provider: provider.name,
    providerReference: charge.instruction.providerReference,
    virtualAccountNumber: charge.instruction.accountNumber,
    virtualAccountBank: charge.instruction.bankName,
  });

  return {
    reference,
    amountKobo: reservation.amountDueKobo,
    state: "pending",
    instruction: charge.instruction,
  };
}

/**
 * Settles a payment and creates the commitment. Safe to call more than once —
 * a payment already marked succeeded returns its existing commitment, which
 * matters because Paystack retries webhooks.
 */
export async function confirmPayment(
  paymentReference: string,
  opts: { amountKobo?: number; rawPayload?: unknown } = {},
): Promise<{ commitmentId: string; poolId: string }> {
  const db = await getDb();

  return db.transaction(async (tx) => {
    const [payment] = await tx
      .select()
      .from(s.payments)
      .where(eq(s.payments.reference, paymentReference))
      .limit(1)
      .for("update");

    if (!payment) throw new CheckoutError("Unknown payment reference.");

    if (payment.state === "succeeded") {
      const [existing] = await tx
        .select({ id: s.commitments.id, poolId: s.commitments.poolId })
        .from(s.commitments)
        .where(eq(s.commitments.reservationId, payment.reservationId!))
        .limit(1);
      if (existing) return { commitmentId: existing.id, poolId: existing.poolId };
    }

    const [reservation] = await tx
      .select()
      .from(s.reservations)
      .where(eq(s.reservations.id, payment.reservationId!))
      .limit(1)
      .for("update");

    if (!reservation) throw new CheckoutError("That reservation no longer exists.");

    const [member] = await tx
      .select({ id: s.members.id, name: s.members.name, phone: s.members.phone, creditKobo: s.members.creditKobo })
      .from(s.members)
      .where(eq(s.members.id, reservation.memberId))
      .limit(1);

    const settledAt = new Date();

    await tx
      .update(s.payments)
      .set({
        state: "succeeded",
        settledAt,
        amountKobo: opts.amountKobo ?? payment.amountKobo,
        rawPayload: (opts.rawPayload as Record<string, unknown>) ?? null,
      })
      .where(eq(s.payments.id, payment.id));

    await tx
      .update(s.reservations)
      .set({ state: "paid" })
      .where(eq(s.reservations.id, reservation.id));

    // Debit credit only now, so an abandoned hold never spends it.
    if (reservation.creditAppliedKobo > 0) {
      const applied = Math.min(reservation.creditAppliedKobo, member.creditKobo);
      if (applied > 0) {
        await tx
          .update(s.members)
          .set({ creditKobo: member.creditKobo - applied })
          .where(eq(s.members.id, member.id));
        await tx.insert(s.creditMovements).values({
          memberId: member.id,
          label: `Spent on ${reservation.poolId.toUpperCase()}`,
          detail: `${reservation.slots} slot${reservation.slots === 1 ? "" : "s"}`,
          amountKobo: -applied,
          poolId: reservation.poolId,
        });
      }
    }

    const [commitment] = await tx
      .insert(s.commitments)
      .values({
        poolId: reservation.poolId,
        memberId: reservation.memberId,
        reservationId: reservation.id,
        slots: reservation.slots,
        paidKobo: reservation.subtotalKobo,
        state: "funded",
        collectionCode: collectionCode(),
      })
      .returning({ id: s.commitments.id });

    // Slot one belongs to the payer; the rest wait to be named.
    await tx.insert(s.beneficiaries).values(
      Array.from({ length: reservation.slots }, (_, i) => ({
        commitmentId: commitment.id,
        slotIndex: i + 1,
        name: i === 0 ? member.name : "",
        phone: i === 0 ? member.phone : null,
        code: collectionCode(),
        isPayer: i === 0,
      })),
    );

    return { commitmentId: commitment.id, poolId: reservation.poolId };
  });
}

/**
 * Called after a commitment lands, outside the transaction, so a threshold
 * crossing is recorded exactly once without holding the pool lock open.
 */
export async function noteThresholdIfCrossed(poolId: string): Promise<void> {
  const db = await getDb();
  const [row] = await db
    .select({
      threshold: s.pools.threshold,
      total: s.pools.totalSlots,
      paid: sql<number>`(
        select coalesce(sum(c.slots), 0)::int from ${s.commitments} c
        where c.pool_id = ${poolId} and c.state <> 'cancelled'
      )`,
    })
    .from(s.pools)
    .where(eq(s.pools.id, poolId))
    .limit(1);

  if (!row) return;

  const [alreadyNoted] = await db
    .select({ id: s.poolEvents.id })
    .from(s.poolEvents)
    .where(and(eq(s.poolEvents.poolId, poolId), eq(s.poolEvents.label, thresholdLabel(row.threshold))))
    .limit(1);

  if (!alreadyNoted && row.paid >= row.threshold) {
    await recordPoolEvent(poolId, thresholdLabel(row.threshold));
  }
  if (row.paid >= row.total) {
    const [locked] = await db
      .select({ id: s.poolEvents.id })
      .from(s.poolEvents)
      .where(and(eq(s.poolEvents.poolId, poolId), eq(s.poolEvents.label, lockedLabel(row.total))))
      .limit(1);
    if (!locked) await recordPoolEvent(poolId, lockedLabel(row.total));
  }
}

const thresholdLabel = (threshold: number) => `Threshold of ${threshold} slots passed`;
const lockedLabel = (total: number) => `${total} of ${total} paid, pool locked`;

/** Live holds belonging to a member, used to resume an interrupted checkout. */
export async function getActiveHolds(memberId: string) {
  const db = await getDb();
  return db
    .select({
      reference: s.reservations.reference,
      poolId: s.reservations.poolId,
      poolTitle: s.pools.title,
      poolCode: s.pools.code,
      slots: s.reservations.slots,
      amountDueKobo: s.reservations.amountDueKobo,
      expiresAt: s.reservations.expiresAt,
    })
    .from(s.reservations)
    .innerJoin(s.pools, eq(s.pools.id, s.reservations.poolId))
    .where(
      and(
        eq(s.reservations.memberId, memberId),
        eq(s.reservations.state, "holding"),
        gt(s.reservations.expiresAt, new Date()),
      ),
    );
}
