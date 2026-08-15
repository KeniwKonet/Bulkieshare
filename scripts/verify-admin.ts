/**
 * End-to-end check of the ops-side supplier and cooperative administration.
 *
 *   npm run verify:admin
 *
 * Builds a fresh in-memory Postgres, seeds it, then exercises the paths that
 * previously had no caller at all: approving a supplier, granting portal
 * access, creating a cooperative and handing one over to a new coordinator.
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
    for (const st of sql.split("--> statement-breakpoint").map((s) => s.trim()).filter(Boolean)) {
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
    approveSupplier,
    createSupplier,
    getSupplier,
    grantSupplierAccess,
    listSupplierUsers,
    updateSupplier,
  } = await import("../lib/domain/supply");
  const {
    createGroup,
    getGroupBySlug,
    listAllGroups,
    setGroupCoordinator,
    suggestGroupSlug,
  } = await import("../lib/domain/groups");

  console.log("\n1. A new supplier starts unapproved and cannot be approved without a bank");
  const supplierId = await createSupplier({ name: "Nasarawa Yam Collective" });
  check("created unapproved", (await getSupplier(supplierId))!.isApproved, false);

  const blocked = await approveSupplier(supplierId, true);
  check("approval refused with no bank details", blocked.ok, false);
  checkThat(
    "the refusal says why",
    !blocked.ok && blocked.error.includes("bank details"),
    !blocked.ok ? blocked.error : "",
  );
  check("still unapproved", (await getSupplier(supplierId))!.isApproved, false);

  console.log("\n2. Adding bank details unblocks approval");
  await updateSupplier(supplierId, {
    bankName: "Zenith",
    bankAccountNumber: "1122334455",
    bankAccountName: "NASARAWA YAM COLLECTIVE",
  });
  check("approval succeeds", (await approveSupplier(supplierId, true)).ok, true);
  check("now approved", (await getSupplier(supplierId))!.isApproved, true);

  console.log("\n3. A partial edit never blanks details captured earlier");
  await updateSupplier(supplierId, { contactName: "Ladi N." });
  const afterPartial = (await getSupplier(supplierId))!;
  check("bank account survived", afterPartial.bankAccountNumber, "1122334455");
  check("contact name applied", afterPartial.contactName, "Ladi N.");

  console.log("\n4. Approval can be withdrawn");
  check("withdrawal succeeds", (await approveSupplier(supplierId, false)).ok, true);
  check("unapproved again", (await getSupplier(supplierId))!.isApproved, false);
  await approveSupplier(supplierId, true);

  console.log("\n5. Portal access is granted to real members only");
  const unknown = await grantSupplierAccess(supplierId, "+2348090909090");
  check("unknown number refused", unknown.ok, false);

  const opsRefused = await grantSupplierAccess(supplierId, "+2348030000001");
  check("ops account refused a supplier role", opsRefused.ok, false);

  const granted = await grantSupplierAccess(supplierId, "+2348051119001");
  check("member granted access", granted.ok, true);

  const [linked] = await db
    .select({ role: schema.members.role, supplierId: schema.members.supplierId })
    .from(schema.members)
    .where(eq(schema.members.phone, "+2348051119001"))
    .limit(1);
  check("role became supplier", linked.role, "supplier");
  check("linked to the right supplier", linked.supplierId, supplierId);
  check("appears in the supplier's users", (await listSupplierUsers(supplierId)).length, 1);

  console.log("\n6. Cooperative slugs never collide");
  check("free slug is taken as-is", await suggestGroupSlug("Wuse Traders"), "wuse-traders");
  const collision = await suggestGroupSlug("Karu Estate Residents");
  checkThat(
    "an existing name gets a distinct slug",
    collision !== "karu-estate" && collision.startsWith("karu-estate"),
    collision,
  );

  console.log("\n7. Creating a cooperative promotes its coordinator");
  const [grace] = await db
    .select({ id: schema.members.id, role: schema.members.role })
    .from(schema.members)
    .where(eq(schema.members.phone, "+2348051119004"))
    .limit(1);
  check("starts as an ordinary member", grace.role, "member");

  const groupId = await createGroup({
    name: "Wuse Traders",
    slug: "wuse-traders",
    areaSlug: "abuja",
    hubId: "wuse",
    coordinatorId: grace.id,
  });

  const [gracePromoted] = await db
    .select({ role: schema.members.role })
    .from(schema.members)
    .where(eq(schema.members.id, grace.id))
    .limit(1);
  check("promoted to coordinator", gracePromoted.role, "coordinator");
  check("appears in the listing", (await listAllGroups()).length, 2);

  console.log("\n8. Handing a cooperative over moves the role with it");
  const before = (await getGroupBySlug("wuse-traders"))!;
  check("runs it before handover", before.coordinatorId, grace.id);

  const sameAgain = await setGroupCoordinator(groupId, "+2348051119004");
  check("handing to the same person is refused", sameAgain.ok, false);

  const handover = await setGroupCoordinator(groupId, "+2348051119005");
  check("handover succeeds", handover.ok, true);

  const after = (await getGroupBySlug("wuse-traders"))!;
  checkThat("a different person now runs it", after.coordinatorId !== grace.id, "unchanged");

  const [incoming] = await db
    .select({ role: schema.members.role })
    .from(schema.members)
    .where(eq(schema.members.phone, "+2348051119005"))
    .limit(1);
  check("incoming coordinator promoted", incoming.role, "coordinator");

  const [outgoing] = await db
    .select({ role: schema.members.role })
    .from(schema.members)
    .where(eq(schema.members.id, grace.id))
    .limit(1);
  check("outgoing coordinator demoted, runs nothing now", outgoing.role, "member");

  console.log("\n9. A coordinator running two cooperatives keeps the role");
  const [aisha] = await db
    .select({ id: schema.members.id })
    .from(schema.members)
    .where(eq(schema.members.phone, "+2348120075510"))
    .limit(1);
  await createGroup({
    name: "Second Group",
    slug: "second-group",
    areaSlug: "abuja",
    coordinatorId: aisha.id,
  });
  await setGroupCoordinator(groupId, "+2348120075510");
  // Now hand only one of Aisha's two groups away.
  await setGroupCoordinator(groupId, "+2348051119005");

  const [stillCoordinator] = await db
    .select({ role: schema.members.role })
    .from(schema.members)
    .where(eq(schema.members.id, aisha.id))
    .limit(1);
  check("keeps the role while another group remains", stillCoordinator.role, "coordinator");

  console.log("\n10. Correlated subqueries count the right rows");
  // Drizzle only qualifies column references when a query has a join. In a
  // join-free query an interpolated `table.column` renders as a bare "column",
  // which then binds to the subquery's own table if it happens to have a column
  // by that name — silently returning zero instead of erroring. These counts
  // all come from join-free queries, so they are the canaries for that.
  const { listHubs } = await import("../lib/domain/pools");
  const { searchMembers, listAreasWithCounts } = await import("../lib/domain/ops");
  const { listSuppliers } = await import("../lib/domain/supply");
  const { listGroupsForCoordinator } = await import("../lib/domain/groups");

  const hubs = await listHubs("abuja");
  check(
    "hubs report the pools that are open at them",
    hubs.filter((h) => h.openPools > 0).map((h) => `${h.id}:${h.openPools}`).sort(),
    ["karu:1", "lugbe:1", "wuse:2"],
  );

  const people = await searchMembers();
  checkThat(
    "members report the pools they joined",
    people.some((m) => m.pools > 0),
    "every member reported zero pools",
  );

  const withOrders = await listSuppliers();
  checkThat(
    "suppliers report their open purchase orders",
    withOrders.some((sup) => sup.openOrders > 0),
    "every supplier reported zero open orders",
  );

  const areasCounted = await listAreasWithCounts();
  check(
    "abuja reports its hubs",
    areasCounted.find((a) => a.slug === "abuja")?.hubs,
    4,
  );

  const aishaGroups = await listGroupsForCoordinator(aisha.id);
  checkThat(
    "a coordinator's groups report their member counts",
    aishaGroups.length > 0 && aishaGroups.some((g) => g.memberCount > 0),
    JSON.stringify(aishaGroups),
  );

  await client.close();
  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
