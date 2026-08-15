import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { CheckoutError, confirmPayment, noteThresholdIfCrossed } from "@/lib/domain/checkout";
import { recordAudit } from "@/lib/domain/ops";
import { verifyWebhookSignature } from "@/lib/providers/payments";

/**
 * Paystack webhook.
 *
 * Every request is verified against the HMAC signature before anything is read
 * from the body. A payment whose reference we do not recognise is not dropped —
 * it becomes an unmatched transfer for ops to resolve, which is exactly the
 * queue the reconciliation screen works through.
 *
 * Paystack retries on non-2xx, and `confirmPayment` is idempotent, so a repeat
 * delivery settles nothing twice.
 */

interface PaystackEvent {
  event: string;
  data?: {
    reference?: string;
    amount?: number;
    status?: string;
    customer?: { phone?: string; email?: string };
    authorization?: { sender_bank?: string; sender_name?: string };
    narration?: string;
  };
}

export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  if (!verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  let event: PaystackEvent;
  try {
    event = JSON.parse(raw) as PaystackEvent;
  } catch {
    return NextResponse.json({ error: "bad payload" }, { status: 400 });
  }

  if (event.event !== "charge.success") {
    // Acknowledge everything else so Paystack stops retrying it.
    return NextResponse.json({ ok: true, ignored: event.event });
  }

  const reference = event.data?.reference;
  const amountKobo = event.data?.amount ?? 0;

  if (!reference) {
    return NextResponse.json({ error: "missing reference" }, { status: 400 });
  }

  const db = await getDb();
  const [payment] = await db
    .select({ id: s.payments.id })
    .from(s.payments)
    .where(eq(s.payments.reference, reference))
    .limit(1);

  if (!payment) {
    await db.insert(s.unmatchedTransfers).values({
      amountKobo,
      fromName: event.data?.authorization?.sender_name ?? event.data?.customer?.email ?? "",
      bankRef: `${event.data?.authorization?.sender_bank ?? "bank"} · ${reference}`,
      narration: event.data?.narration ?? "",
      guess: "Paystack charge with a reference this app did not issue.",
      state: "unmatched",
      receivedAt: new Date(),
    });
    await recordAudit({
      action: "payment.unmatched",
      subject: reference,
      detail: { amountKobo },
    });
    return NextResponse.json({ ok: true, unmatched: true });
  }

  try {
    const { poolId } = await confirmPayment(reference, { amountKobo, rawPayload: event });
    await noteThresholdIfCrossed(poolId);
  } catch (err) {
    if (err instanceof CheckoutError) {
      await recordAudit({
        action: "payment.failed_to_settle",
        subject: reference,
        detail: { reason: err.message },
      });
      // A 200 stops the retry loop for something retrying cannot fix.
      return NextResponse.json({ ok: false, error: err.message });
    }
    throw err;
  }

  return NextResponse.json({ ok: true });
}
