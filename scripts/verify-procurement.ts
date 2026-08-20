/**
 * End-to-end check of the buying chain.
 *
 *   npm run verify:procurement
 *
 * Walks a request for quotes through to an issued purchase order and asserts
 * the things that would quietly cost real money if they broke: that an award
 * values the order correctly, splits the deposit, cannot happen twice, cannot
 * go to a supplier we have no account for, and leaves the losing quotes marked
 * as lost rather than dangling.
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
  console.log(
    `${ok ? "  ok  " : "  FAIL"} ${label}${ok ? "" : ` — got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`}`,
  );
}

function checkThat(label: string, condition: boolean, detail = "") {
  if (!condition) failures++;
  console.log(`${condition ? "  ok  " : "  FAIL"} ${label}${condition ? "" : ` — ${detail}`}`);
}

async function main() {
  const client = new PGlite();
  await client.waitReady;

  const dir = path.join(process.cwd(), "drizzle");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    const sql = readFileSync(path.join(dir, file), "utf8");
    for (const st of sql.split("--> statement-breakpoint").map((x) => x.trim()).filter(Boolean)) {
      await client.exec(st);
    }
  }

  const db = drizzle(client, { schema });
  const { seed } = await import("../lib/db/seed");
  await seed(db as never);

  (globalThis as Record<string, unknown>).__bulkieshareDb = Promise.resolve({
    db,
    driver: "pglite",
  });

  const {
    awardQuote,
    cancelQuoteRequest,
    createQuoteRequest,
    getQuoteRequestById,
    listQuoteRequests,
    listQuotesBySupplier,
    listQuotesFor,
    nextPoNumber,
  } = await import("../lib/domain/procurement");
  const { submitQuote, getPurchaseOrder, listPurchaseOrders } = await import(
    "../lib/domain/supply"
  );
  const { approveSupplier, updateSupplier } = await import("../lib/domain/supply");
  const { getPool } = await import("../lib/domain/pools");

  const supplierBy = async (name: string) => {
    const [row] = await db
      .select({ id: schema.suppliers.id })
      .from(schema.suppliers)
      .where(eq(schema.suppliers.name, name))
      .limit(1);
    return row.id;
  };

  const gwagwalada = await supplierBy("Gwagwalada Livestock Aggregators");
  const kuje = await supplierBy("Kuje Livestock Aggregators");
  const kogi = await supplierBy("Kogi Palm Millers Cooperative");

  console.log("\n1. The seeded request shows a real decision");
  const seeded = (await listQuoteRequests()).find((r) => r.title.startsWith("Cattle"))!;
  checkThat("a cattle request exists", Boolean(seeded), "none found");
  check("it is for two head", seeded.quantity, 2);

  const seededQuotes = await listQuotesFor(seeded.id);
  check("two suppliers quoted", seededQuotes.length, 2);
  check("cheapest is listed first", seededQuotes[0].priceKobo < seededQuotes[1].priceKobo, true);
  check(
    "the total is priced per unit times quantity",
    seededQuotes[0].totalKobo,
    seededQuotes[0].priceKobo * 2,
  );
  check(
    "the cheaper quote is flagged as too short a hold",
    seededQuotes[0].meetsHoldRequirement,
    false,
  );
  checkThat(
    "the dearer quote is above best by a positive margin",
    seededQuotes[1].aboveBestBasisPoints > 0,
    String(seededQuotes[1].aboveBestBasisPoints),
  );

  console.log("\n2. A request can be raised against a funded pool");
  const pool = (await getPool("a-2240"))!;
  const rfqId = await createQuoteRequest({
    title: "Rams, medium",
    poolId: pool.id,
    areaSlug: pool.areaSlug,
    hubId: pool.hubId,
    quantity: 4,
    depositPct: 25,
    minHoldDays: 7,
    expiresAt: new Date(Date.now() + 3 * 86_400_000),
  });
  const rfq = (await getQuoteRequestById(rfqId))!;
  check("it starts open", rfq.state, "open");
  check("it is linked to the pool", rfq.poolCode, pool.code);
  check("nobody has quoted", rfq.quoteCount, 0);
  check("it appears on the board", (await listQuoteRequests()).some((r) => r.id === rfqId), true);

  console.log("\n3. Quotes come in and are compared");
  await submitQuote({ quoteRequestId: rfqId, supplierId: kuje, priceKobo: 900_000, holdDays: 10 });
  await submitQuote({
    quoteRequestId: rfqId,
    supplierId: gwagwalada,
    priceKobo: 850_000,
    holdDays: 8,
  });
  await submitQuote({ quoteRequestId: rfqId, supplierId: kogi, priceKobo: 800_000, holdDays: 9 });

  const quotes = await listQuotesFor(rfqId);
  check("three quotes", quotes.length, 3);
  check("cheapest first", quotes.map((q) => q.priceKobo), [800_000, 850_000, 900_000]);
  check("the cheapest is the unapproved supplier", quotes[0].supplierId, kogi);
  check("and it is marked as blocked", quotes[0].isBlocked, true);
  check("the approved ones are not blocked", [quotes[1].isBlocked, quotes[2].isBlocked], [false, false]);
  check("re-quoting replaces rather than duplicates", quotes.filter((q) => q.supplierId === kuje).length, 1);

  console.log("\n4. An award cannot go to a supplier we cannot pay");
  const blocked = await awardQuote(quotes[0].id);
  check("refused", blocked.ok, false);
  checkThat(
    "and says why",
    !blocked.ok && blocked.error.includes("not cleared"),
    !blocked.ok ? blocked.error : "",
  );
  check("the request is still open", (await getQuoteRequestById(rfqId))!.state, "quoted");
  check("no order was created", (await listPurchaseOrders(kogi)).length, 0);

  console.log("\n5. Clearing that supplier unblocks them");
  await updateSupplier(kogi, {
    bankAccountNumber: "9988776655",
    bankAccountName: "KOGI PALM MILLERS COOP",
  });
  check("approval now succeeds", (await approveSupplier(kogi, true)).ok, true);
  check("the quote is no longer blocked", (await listQuotesFor(rfqId))[0].isBlocked, false);

  console.log("\n6. Awarding issues the purchase order");
  const expectedPo = await nextPoNumber();
  const winner = (await listQuotesFor(rfqId))[1]; // the 850,000 approved bid
  const result = await awardQuote(winner.id);
  checkThat("award succeeded", result.ok, !result.ok ? result.error : "");
  if (!result.ok) {
    await client.close();
    process.exit(1);
  }

  check("the PO number is the next in sequence", result.po, expectedPo);
  check("value is price times quantity", result.valueKobo, 850_000 * 4);
  check("deposit is the requested percentage", result.depositKobo, Math.round(850_000 * 4 * 0.25));

  const order = (await getPurchaseOrder(result.po))!;
  check("the order exists and is issued", order.state, "issued");
  check("balance is value less deposit", order.balanceKobo, order.valueKobo - order.depositKobo);
  check("deposit plus balance is the whole value", order.depositKobo + order.balanceKobo, order.valueKobo);
  check("it is attached to the pool", order.poolCode, pool.code);
  check("the item records the quantity", order.item, "4 × Rams, medium");

  console.log("\n7. Awarding settles every other quote and the request");
  const after = await listQuotesFor(rfqId);
  check("exactly one quote is awarded", after.filter((q) => q.isAwarded).length, 1);
  check("the winner is the one we picked", after.find((q) => q.isAwarded)!.supplierId, winner.supplierId);
  check("the request is closed as awarded", (await getQuoteRequestById(rfqId))!.state, "awarded");
  check("the pool now names its supplier", (await getPool(pool.id))!.supplierName, winner.supplierName);

  console.log("\n8. An award cannot happen twice");
  const second = await awardQuote(after.find((q) => !q.isAwarded)!.id);
  check("refused", second.ok, false);
  checkThat(
    "and says the request is already awarded",
    !second.ok && second.error.includes("already been awarded"),
    !second.ok ? second.error : "",
  );
  check("still exactly one order for this pool", (await listPurchaseOrders()).filter((o) => o.poolId === pool.id).length, 1);

  console.log("\n9. The supplier sees the outcome of their own quotes");
  const theirs = await listQuotesBySupplier(winner.supplierId);
  checkThat("their winning quote is marked won", theirs.some((q) => q.isAwarded), "none awarded");
  const losers = await listQuotesBySupplier(kuje);
  checkThat(
    "a losing supplier sees the request closed, not their quote won",
    losers.some((q) => !q.isAwarded && q.requestState === "awarded"),
    JSON.stringify(losers.map((q) => [q.isAwarded, q.requestState])),
  );

  console.log("\n10. A request can be closed without awarding");
  const idleId = await createQuoteRequest({
    title: "Yam, tubers",
    quantity: 50,
    depositPct: 30,
    minHoldDays: 7,
    expiresAt: new Date(Date.now() + 86_400_000),
  });
  await cancelQuoteRequest(idleId);
  check("it is marked expired", (await getQuoteRequestById(idleId))!.state, "expired");
  check("and issued no order", (await listPurchaseOrders()).some((o) => o.item.includes("Yam")), false);

  await client.close();
  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
