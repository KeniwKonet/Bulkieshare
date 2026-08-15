"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";

import { requireMember } from "@/lib/auth/dal";
import {
  cancelReservation,
  CheckoutError,
  confirmPayment,
  getReservation,
  noteThresholdIfCrossed,
  reserveSlots,
  startPayment,
} from "@/lib/domain/checkout";
import { getPool } from "@/lib/domain/pools";
import { paymentsAreMocked } from "@/lib/providers/payments";
import { fail, type FormState } from "./_state";

/**
 * Checkout actions. Each one re-checks the session and re-checks ownership,
 * because a Server Action is reachable by direct POST regardless of which page
 * it was rendered on.
 */

export async function reserve(_state: FormState, formData: FormData): Promise<FormState> {
  const poolId = String(formData.get("poolId") ?? "");
  const slots = Number(formData.get("slots") ?? 1);
  const useCredit = formData.get("useCredit") !== "off";

  const pool = await getPool(poolId);
  if (!pool) return fail("That pool no longer exists.");

  const member = await requireMember(`/pools/${poolId}/reserve`);

  let reference: string;
  try {
    ({ reference } = await reserveSlots({
      poolId,
      memberId: member.id,
      slots,
      useCredit,
    }));
  } catch (err) {
    if (err instanceof CheckoutError) return fail(err.message);
    throw err;
  }

  redirect(`/pay/${reference}`);
}

/**
 * Issues (or re-reads) the transfer instruction for a hold. Called from the
 * payment page on load rather than at reserve time, so a member who never
 * reaches the payment screen does not have a virtual account created for them.
 */
export async function ensurePaymentStarted(reference: string) {
  const member = await requireMember();
  const reservation = await getReservation(reference);
  if (!reservation || reservation.memberId !== member.id) return null;

  try {
    return await startPayment(reference);
  } catch (err) {
    if (err instanceof CheckoutError) return null;
    throw err;
  }
}

/**
 * Development-only shortcut standing in for the Paystack webhook. Refuses to
 * run when a real payment provider is configured, so it cannot settle a real
 * payment that never arrived.
 */
export async function confirmTransferReceived(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!paymentsAreMocked()) {
    return fail("Payments are live; a transfer can only be settled by the bank.");
  }

  const member = await requireMember();
  const reservationReference = String(formData.get("reservation") ?? "");
  const reservation = await getReservation(reservationReference);

  if (!reservation || reservation.memberId !== member.id) {
    return fail("That reservation is not yours.");
  }

  try {
    const payment = await startPayment(reservationReference);
    const { poolId } = await confirmPayment(payment.reference, {
      amountKobo: reservation.amountDueKobo,
    });
    await noteThresholdIfCrossed(poolId);
  } catch (err) {
    if (err instanceof CheckoutError) return fail(err.message);
    throw err;
  }

  redirect("/my-pools?paid=1");
}

export async function releaseHold(_state: FormState, formData: FormData): Promise<FormState> {
  const member = await requireMember();
  const reference = String(formData.get("reservation") ?? "");
  await cancelReservation(reference, member.id);
  refresh();
  redirect("/my-pools");
}
