import Link from "next/link";

import { OpsHeader } from "@/components/nav";
import { StatGrid } from "@/components/ui";
import { requireOps } from "@/lib/auth/dal";
import { getOpsCounts, getReconciliationSummary, listUnmatchedTransfers } from "@/lib/domain/ops";
import { listQuoteRequests } from "@/lib/domain/procurement";
import { listAllPools, settleClosedPools, sweepExpiredHolds } from "@/lib/domain/pools";
import { listOpenDisputes, listRefunds } from "@/lib/domain/support";
import { listPurchaseOrders, listSuppliers } from "@/lib/domain/supply";
import { formatKobo } from "@/lib/money";

export const metadata = { title: "Ops" };

interface Job {
  href: string;
  count: number;
  title: string;
  detail: string;
  /** Something a person is waiting on, or money is exposed by. */
  urgent: boolean;
}

export default async function OpsHome() {
  const ops = await requireOps();

  // The desk opens here, so bring lapsed holds and closed pools up to date
  // before counting anything.
  await sweepExpiredHolds();
  await settleClosedPools();

  const [counts, recon, pools, requests, orders, disputes, refunds, transfers, suppliers] =
    await Promise.all([
      getOpsCounts(),
      getReconciliationSummary(),
      listAllPools(),
      listQuoteRequests(),
      listPurchaseOrders(),
      listOpenDisputes(),
      listRefunds(),
      listUnmatchedTransfers(),
      listSuppliers(),
    ]);

  const liveRequests = requests.filter((r) => r.state === "open" || r.state === "quoted");
  const orderedPoolIds = new Set(orders.map((o) => o.poolId).filter(Boolean));
  const requestedPoolIds = new Set(liveRequests.map((r) => r.poolId).filter(Boolean));

  const unbought = pools.filter(
    (p) => p.state === "funded" && !orderedPoolIds.has(p.id) && !requestedPoolIds.has(p.id),
  );
  const quotesToDecide = liveRequests.filter((r) => r.quoteCount > 0);
  const awaitingQc = orders.filter((o) => o.state === "delivered");
  const balancesToRelease = orders.filter((o) => o.state === "qc_passed");
  const breaching = disputes.filter((d) => d.breaching);
  const outstandingRefunds = refunds.filter((r) => r.state !== "paid");
  const unapprovedSuppliers = suppliers.filter((sup) => !sup.isApproved);
  const toAllocate = pools.filter((p) => p.state === "funded" && orderedPoolIds.has(p.id));
  const underfilled = pools.filter((p) => p.state === "underfilled");

  // Ordered by what hurts soonest if ignored: someone waiting, then money at
  // risk, then housekeeping.
  const jobs: Job[] = [
    {
      href: "/admin/disputes",
      count: breaching.length,
      title: "Disputes past their SLA",
      detail: "A member was promised an answer inside 48 hours and has not had one.",
      urgent: true,
    },
    {
      href: "/admin/procurement",
      count: unbought.length,
      title: "Funded pools with nothing on order",
      detail: "Members have paid and nobody has been asked to supply it yet.",
      urgent: true,
    },
    {
      href: "/admin/refunds",
      count: outstandingRefunds.length,
      title: "Refunds owed",
      detail: `${formatKobo(recon.refundState.outstandingKobo)} promised back within 24 hours.`,
      urgent: true,
    },
    {
      href: "/admin/procurement",
      count: quotesToDecide.length,
      title: "Quotes waiting on a decision",
      detail: "Suppliers have replied and are holding a price for you.",
      urgent: false,
    },
    {
      href: "/admin/suppliers",
      count: awaitingQc.length,
      title: "Deliveries to QC",
      detail: "Goods arrived. The supplier's balance is blocked until this is recorded.",
      urgent: false,
    },
    {
      href: "/admin/suppliers",
      count: balancesToRelease.length,
      title: "Balances to release",
      detail: "QC passed. We owe the supplier within 48 hours of that.",
      urgent: false,
    },
    {
      href: "/admin/payments/unmatched",
      count: transfers.length,
      title: "Unmatched transfers",
      detail: `${formatKobo(recon.unmatched.amountKobo)} arrived without a home.`,
      urgent: transfers.some((t) => t.isUrgent),
    },
    {
      href: "/admin/pools",
      count: toAllocate.length,
      title: "Pools ready to allocate",
      detail: "Bought and delivered. Publish the split so members can collect.",
      urgent: false,
    },
    {
      href: "/admin/pools",
      count: underfilled.length,
      title: "Underfilled pools to cancel",
      detail: "Closed below threshold. Every member needs refunding.",
      urgent: true,
    },
    {
      href: "/admin/suppliers",
      count: unapprovedSuppliers.length,
      title: "Suppliers awaiting approval",
      detail: "They cannot receive an order until you clear them.",
      urgent: false,
    },
  ].filter((j) => j.count > 0);

  const escrowKobo = pools
    .filter((p) => p.state === "open" || p.state === "funded")
    .reduce((sum, p) => sum + p.paidSlots * p.pricePerSlotKobo, 0);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <OpsHeader active="home" />

      <StatGrid
        columns={4}
        items={[
          { label: "OPEN POOLS", value: String(counts.openPools), sub: `${counts.fundedPools} funded` },
          { label: "MEMBERS' MONEY HELD", value: formatKobo(escrowKobo) },
          { label: "OWED TO SUPPLIERS", value: formatKobo(recon.owed.supplierOwedKobo) },
          { label: "MEMBER CREDIT OUTSTANDING", value: formatKobo(recon.creditOutstanding.kobo) },
        ]}
      />

      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-8">
        <h1 className="font-display text-[28px] sm:text-[32px] tracking-tight mb-1">
          {jobs.length === 0 ? "Nothing needs you" : "What needs you today"}
        </h1>
        <p className="text-[15px] text-text-dim mb-6">
          {ops.name || "Ops"} ·{" "}
          {jobs.length === 0
            ? "Every queue is clear. Money and members are both where they should be."
            : `${jobs.reduce((n, j) => n + j.count, 0)} things across ${jobs.length} queues.`}
        </p>

        {jobs.length === 0 ? (
          <div className="border border-ink bg-card px-6 py-14 text-center">
            <div className="font-display text-[24px] tracking-tight mb-2">All clear</div>
            <p className="text-[15px] text-text-dim max-w-[52ch] mx-auto">
              No breaching disputes, no unbought pools, no refunds owed and nothing unmatched.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {jobs.map((job) => (
              <Link
                key={job.title}
                href={job.href}
                className={`border bg-card px-4.5 py-4 flex items-center gap-4 ${
                  job.urgent ? "border-rust-dark" : "border-ink"
                }`}
              >
                <span
                  className={`font-display text-[30px] leading-none min-w-[46px] text-center ${
                    job.urgent ? "text-rust-dark" : ""
                  }`}
                >
                  {job.count}
                </span>
                <span className="flex-1">
                  <span className="block text-[16.5px] font-bold leading-snug">{job.title}</span>
                  <span className="block text-[14px] text-text-dim leading-snug mt-0.5">
                    {job.detail}
                  </span>
                </span>
                <span className="font-mono text-[11.5px] text-text-dim">open</span>
              </Link>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
          <div className="border border-ink bg-ink text-paper p-5">
            <div className="font-mono text-[11px] text-dark-dim-2 mb-2">THE ONE RULE</div>
            <p className="text-[14.5px] leading-relaxed text-dark-dim">
              The money held for open pools is not ours. It moves twice only: to a supplier once a
              pool funds and an order is issued, or back to members if it is cancelled.
            </p>
          </div>
          <div className="border border-ink bg-card p-5">
            <div className="font-mono text-[11px] text-text-dim mb-2.5">GO STRAIGHT TO</div>
            <div className="flex flex-col gap-1.5 text-[14.5px]">
              <Link href="/admin/procurement/new" className="font-semibold border-b border-ink w-fit">
                Request quotes for a pool
              </Link>
              <Link href="/admin/pools/new" className="font-semibold border-b border-ink w-fit">
                Open a new pool
              </Link>
              <Link href="/admin/reconciliation" className="font-semibold border-b border-ink w-fit">
                Today&apos;s reconciliation
              </Link>
              <Link href="/admin/audit" className="font-semibold border-b border-ink w-fit">
                Who did what
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
