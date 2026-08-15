/**
 * End-to-end check of the money path against a throwaway database.
 *
 *   npm run verify:flow
 *
 * Builds a fresh in-memory Postgres, seeds it, then walks a member through
 * reserve → pay → commit → name a slot → book a window → collect, asserting the
 * slot counts, credit ledger and pool state after every step. Nothing is
 * mocked below the domain layer; these are the same functions the pages call.
 */

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";

import * as schema from "../lib/db/schema";

let failures = 0;

function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? "  ok  " : "  FAIL"} ${label}${ok ? "" : ` — got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`}`);
}

function checkThat(label: string, condition: boolean, detail = "") {
  if (!condition) failures++;
  console.log(`${condition ? "  ok  " : "  FAIL"} ${label}${condition ? "" : ` — ${detail}`}`);
}

async function main() {
  // Point the db module at an in-memory instance before anything imports it.
  const client = new PGlite();
  await client.waitReady;

  // Every migration in filename order, so this exercises the current schema.
  const dir = path.join(process.cwd(), "drizzle");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    const sql = readFileSync(path.join(dir, file), "utf8");
    for (const st of sql.split("--> statement-breakpoint").map((s) => s.trim()).filter(Boolean)) {
      await client.exec(st);
    }
  }

  const db = drizzle(client, { schema });
  const { seed } = await import("../lib/db/seed");
  await seed(db as never);

  // Hand this instance to the app's db module so the domain layer uses it.
  (globalThis as Record<string, unknown>).__bulkieshareDb = Promise.resolve({
    db,
    driver: "pglite",
  });

  const { getPool } = await import("../lib/domain/pools");
  const {
    confirmPayment,
    getReservation,
    noteThresholdIfCrossed,
    reserveSlots,
    startPayment,
    CheckoutError,
  } = await import("../lib/domain/checkout");
  const {
    bookCollectionWindow,
    getCommitment,
    listBeneficiaries,
    listCollectionWindows,
    nameBeneficiary,
    recordHandover,
  } = await import("../lib/domain/commitments");
  const { grantCredit, listCreditMovements, refundUnderfilledPool } = await import(
    "../lib/domain/support"
  );

  const [buyer] = await db
    .select()
    .from(schema.members)
    .where(eq(schema.members.phone, "+2348051119006"))
    .limit(1);

  console.log("\n1. Reserving into a pool with room");
  const before = (await getPool("a-2240"))!;
  console.log(`   a-2240 starts at ${before.paidSlots} paid, ${before.slotsLeft} left`);

  const { reference } = await reserveSlots({
    poolId: "a-2240",
    memberId: buyer.id,
    slots: 3,
    useCredit: false,
  });
  const held = (await getPool("a-2240"))!;
  check("holding a reservation lowers slotsLeft", held.slotsLeft, before.slotsLeft - 3);
  check("holding does not raise paidSlots", held.paidSlots, before.paidSlots);
  check("holdingSlots reflects the hold", held.holdingSlots, before.holdingSlots + 3);

  console.log("\n2. Availability is enforced");
  let rejected = "";
  try {
    await reserveSlots({ poolId: "a-2240", memberId: buyer.id, slots: 9_999 });
  } catch (err) {
    rejected = err instanceof CheckoutError ? "CheckoutError" : "other";
  }
  check("over-reserving is refused", rejected, "CheckoutError");

  console.log("\n3. Paying settles the hold into a commitment");
  const payment = await startPayment(reference);
  checkThat("a transfer instruction was issued", Boolean(payment.instruction), "no instruction");
  const again = await startPayment(reference);
  check("starting payment twice is idempotent", again.reference, payment.reference);

  const { commitmentId, poolId } = await confirmPayment(payment.reference);
  await noteThresholdIfCrossed(poolId);

  const paid = (await getPool("a-2240"))!;
  check("paidSlots rose by the reservation", paid.paidSlots, before.paidSlots + 3);
  check("the hold is no longer counted", paid.holdingSlots, before.holdingSlots);
  check("slotsLeft is unchanged from the held state", paid.slotsLeft, before.slotsLeft - 3);

  const settledAgain = await confirmPayment(payment.reference);
  check("re-delivering the webhook creates no second commitment", settledAgain.commitmentId, commitmentId);
  const afterReplay = (await getPool("a-2240"))!;
  check("a replayed webhook does not double-count slots", afterReplay.paidSlots, paid.paidSlots);

  console.log("\n4. Store credit is debited only on settlement");
  const creditMember = (
    await db.select().from(schema.members).where(eq(schema.members.phone, "+2348034419022")).limit(1)
  )[0];
  const startingCredit = creditMember.creditKobo;

  const { reference: credited } = await reserveSlots({
    poolId: "a-2244",
    memberId: creditMember.id,
    slots: 1,
    useCredit: true,
  });
  const stillHolding = (
    await db.select().from(schema.members).where(eq(schema.members.id, creditMember.id)).limit(1)
  )[0];
  check("credit is untouched while only held", stillHolding.creditKobo, startingCredit);

  const creditPayment = await startPayment(credited);
  await confirmPayment(creditPayment.reference);
  const afterSpend = (
    await db.select().from(schema.members).where(eq(schema.members.id, creditMember.id)).limit(1)
  )[0];
  const reservationRow = (await getReservation(credited))!;
  check(
    "credit fell by exactly what was applied",
    afterSpend.creditKobo,
    startingCredit - reservationRow.creditAppliedKobo,
  );

  const ledger = await listCreditMovements(creditMember.id);
  const ledgerTotal = ledger.reduce((sum, m) => sum + m.amountKobo, 0);
  check("the ledger still sums to the balance", ledgerTotal, afterSpend.creditKobo);

  console.log("\n5. Naming slots and booking a window");
  const beneficiaries = await listBeneficiaries(commitmentId);
  check("one beneficiary row per slot", beneficiaries.length, 3);
  check("slot one defaults to the payer", beneficiaries[0].isPayer, true);

  await nameBeneficiary({
    commitmentId,
    slotIndex: 2,
    name: "Adaeze Umeh",
    phone: "+2348051119099",
  });
  const named = await listBeneficiaries(commitmentId);
  check("naming a slot sticks", named[1].name, "Adaeze Umeh");

  const windows = await listCollectionWindows("a-2240");
  checkThat("collection windows are generated", (windows?.windows.length ?? 0) > 0, "none");
  const slot = windows!.windows.find((w) => !w.isFull)!;
  await bookCollectionWindow(commitmentId, slot.at);
  const booked = await getCommitment(commitmentId);
  check("the window is recorded", booked?.windowLabel, slot.label);

  console.log("\n6. Handover at the hub");
  await recordHandover({ commitmentId, hubId: "wuse", weightGrams: 6000 });
  const collected = await getCommitment(commitmentId);
  check("commitment moves to collected", collected?.state, "collected");

  await recordHandover({ commitmentId, hubId: "wuse", weightGrams: 6000 });
  const handoverCount = await db
    .select()
    .from(schema.handovers)
    .where(eq(schema.handovers.commitmentId, commitmentId));
  check("a second handover is refused", handoverCount.length, 1);

  console.log("\n7. Cancelling a pool refunds every funded commitment");
  // a-2226 arrives from the seed already refunded, so it proves the no-op path.
  check(
    "an already-refunded pool raises nothing new",
    await refundUnderfilledPool("a-2226", "Did not reach threshold."),
    0,
  );

  const fundedBefore = (await getPool("a-2244"))!.paidSlots;
  const raised = await refundUnderfilledPool("a-2244", "Did not reach threshold.");
  checkThat("refunds were raised for every funded commitment", raised > 0, `raised ${raised}`);

  const refundRows = await db
    .select()
    .from(schema.refunds)
    .where(eq(schema.refunds.poolId, "a-2244"));
  check("one refund row per commitment", refundRows.length, raised);
  check(
    "refunds total what members paid",
    refundRows.reduce((sum, r) => sum + r.amountKobo, 0),
    (await getPool("a-2244"))!.pricePerSlotKobo * fundedBefore,
  );
  check("the pool moves to refunding", (await getPool("a-2244"))!.state, "refunding");
  check(
    "refunding twice raises nothing new",
    await refundUnderfilledPool("a-2244", "Did not reach threshold."),
    0,
  );

  console.log("\n8. Credit grants keep the ledger and balance in step");
  await grantCredit({
    memberId: buyer.id,
    label: "Goodwill",
    amountKobo: 50_000,
  });
  const buyerAfter = (
    await db.select().from(schema.members).where(eq(schema.members.id, buyer.id)).limit(1)
  )[0];
  const buyerLedger = await listCreditMovements(buyer.id);
  check(
    "balance equals the ledger sum",
    buyerAfter.creditKobo,
    buyerLedger.reduce((sum, m) => sum + m.amountKobo, 0),
  );

  await client.close();

  console.log(
    `\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
