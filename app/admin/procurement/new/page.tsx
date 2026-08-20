import Link from "next/link";

import { OpsHeader } from "@/components/nav";
import { RaiseRfqForm } from "@/components/ops-forms";
import { requireOps } from "@/lib/auth/dal";
import { listAllPools, listHubs } from "@/lib/domain/pools";
import { listSuppliers } from "@/lib/domain/supply";
import { formatKobo } from "@/lib/money";

export const metadata = { title: "Request quotes" };

export default async function NewQuoteRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ pool?: string }>;
}) {
  await requireOps();
  const { pool } = await searchParams;

  const [pools, hubs, suppliers] = await Promise.all([
    listAllPools(),
    listHubs(),
    listSuppliers(),
  ]);

  // Only pools that could still need buying for.
  const buyable = pools.filter(
    (p) => p.state === "open" || p.state === "funded" || p.state === "allocating",
  );

  const cleared = suppliers.filter((sup) => sup.isApproved);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <OpsHeader active="procurement" />
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-8">
        <div className="font-mono text-[11.5px] text-text-dim mb-1">
          <Link href="/admin/procurement" className="underline">
            BUYING
          </Link>{" "}
          / NEW REQUEST
        </div>
        <h1 className="font-display text-[28px] tracking-tight mb-2">Request quotes</h1>
        <p className="text-[15px] leading-relaxed text-text-dim mb-6 max-w-[62ch]">
          Goes out to every approved supplier at once. They reply with a price and how long it
          holds; you pick one and the purchase order is issued from it.
        </p>

        {cleared.length === 0 ? (
          <div className="border border-rust-dark bg-card p-5 mb-6">
            <div className="font-display text-[20px] tracking-tight mb-1.5">
              No supplier is cleared to receive an order
            </div>
            <p className="text-[14.5px] text-text-dim leading-relaxed mb-3">
              You can still send this out, but nobody can be awarded until at least one supplier is
              approved with bank details on file.
            </p>
            <Link href="/admin/suppliers" className="font-semibold border-b-2 border-ink">
              Go to suppliers
            </Link>
          </div>
        ) : (
          <p className="font-mono text-[11.5px] text-text-dim mb-6">
            {cleared.length} SUPPLIER{cleared.length === 1 ? "" : "S"} CLEARED TO QUOTE ·{" "}
            {cleared.map((c) => c.name).join(", ").toUpperCase()}
          </p>
        )}

        <RaiseRfqForm
          defaultPoolId={pool}
          hubs={hubs.map((h) => ({ id: h.id, name: h.name }))}
          pools={buyable.map((p) => ({
            id: p.id,
            hubId: p.hubId,
            label: `#${p.code} · ${p.title} · ${p.paidSlots}/${p.totalSlots} paid · ${formatKobo(
              p.paidSlots * p.pricePerSlotKobo,
            )} collected`,
          }))}
        />
      </div>
    </div>
  );
}
