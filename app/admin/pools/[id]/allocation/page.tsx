import Link from "next/link";
import { notFound } from "next/navigation";

import { OpsHeader } from "@/components/nav";
import { PublishAllocationButton } from "@/components/staff-forms";
import { GridTable } from "@/components/ui";
import { requireOps } from "@/lib/auth/dal";
import { computeAllocation } from "@/lib/domain/allocation";
import { getPool } from "@/lib/domain/pools";
import { formatKg } from "@/lib/money";
import { formatShortDate } from "@/lib/time";

export const metadata = { title: "Allocation" };

export default async function AllocationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireOps();

  const pool = await getPool(id);
  if (!pool) notFound();

  const allocation = await computeAllocation(id);

  if (!allocation) {
    return (
      <div className="min-h-screen bg-paper text-ink">
        <OpsHeader active="pools" />
        <div className="max-w-3xl mx-auto px-5 sm:px-8 py-8">
          <h1 className="font-display text-[28px] tracking-tight mb-2.5">
            Nothing to allocate in #{pool.code}
          </h1>
          <p className="text-[15px] leading-relaxed text-text-dim mb-4">
            No funded commitments in this pool, so there is nothing to split.
          </p>
          <Link href="/admin/pools" className="font-semibold border-b-2 border-ink">
            ← Pool board
          </Link>
        </div>
      </div>
    );
  }

  const published = Boolean(pool.seedPublishedAt);
  const rows = allocation.rows;

  return (
    <div className="min-h-screen bg-paper text-ink">
      <OpsHeader active="pools" />
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-8">
        <div className="font-mono text-[11.5px] text-text-dim mb-1.5">
          ALLOCATION · #{pool.code} ·{" "}
          {published
            ? `SEED PUBLISHED ${formatShortDate(pool.seedPublishedAt!).toUpperCase()}`
            : "SEED NOT YET PUBLISHED"}
        </div>

        <h1 className="font-display text-[28px] tracking-tight mb-2.5">
          Split {formatKg(allocation.usableWeightGrams)} between {rows.length} slots
        </h1>

        <p className="text-[15px] leading-relaxed text-text-dim mb-5">
          The draw is a deterministic function of the seed, which goes out before allocation runs,
          so nobody can claim we tuned it after seeing who was in the pool. Members who drew below
          the mean in an earlier pool are prioritised for prime cuts.
        </p>

        <div className="border border-ink bg-card mb-4">
          <div className="px-4 py-2.5 bg-ink text-dark-dim-2 font-mono text-[11.5px] flex justify-between gap-3 flex-wrap">
            <span>FAIRNESS CHECK</span>
            <span>SEED {allocation.seed}</span>
          </div>
          <div className="flex justify-between text-[14px] px-4 py-2.5 border-b border-rule-card">
            <span>Prime share, target 40%</span>
            <span className="font-mono">
              {allocation.primeMeanPct}% mean, spread {allocation.primeSpreadPct}%
            </span>
          </div>
          <div className="flex justify-between text-[14px] px-4 py-2.5 border-b border-rule-card">
            <span>Widest deviation from mean</span>
            <span className="font-mono">{allocation.widestDeviationPct}%</span>
          </div>
          <div className="flex justify-between text-[14px] px-4 py-2.5 border-b border-rule-card">
            <span>Nominal owed in total</span>
            <span className="font-mono">{formatKg(allocation.nominalWeightGrams)}</span>
          </div>
          <div className="flex justify-between text-[14px] px-4 py-2.5">
            <span>Slots below nominal weight</span>
            <span
              className={`font-mono ${allocation.belowNominal > 0 ? "text-rust-dark" : "text-green"}`}
            >
              {allocation.belowNominal} of {rows.length}
            </span>
          </div>
        </div>

        <GridTable
          columns=".5fr 1.3fr .9fr .8fr 1.2fr"
          headers={["#", "MEMBER", "WEIGHT", "PRIME", "PRIORITY"]}
          fontSize={13}
          rows={rows.slice(0, 40).map((r) => [
            <span key="n" className="font-mono text-text-dim">
              {String(r.slotIndex).padStart(2, "0")}
            </span>,
            r.memberName,
            <span key="w" className="font-mono">
              {formatKg(r.weightGrams)}
            </span>,
            <span key="p" className="font-mono">
              {r.primePct}%
            </span>,
            <span key="pr" className={r.prioritised ? "text-green" : "text-text-dim"}>
              {r.prioritised ? "prioritised" : "normal"}
            </span>,
          ])}
          footer={
            rows.length > 40
              ? `${rows.length - 40} more rows · ${formatKg(allocation.usableWeightGrams)} allocated in full`
              : `${formatKg(allocation.usableWeightGrams)} allocated in full`
          }
        />

        {rows.some((r) => r.prioritised) && (
          <p className="font-mono text-[11.5px] leading-relaxed text-text-dim mt-3">
            {rows.filter((r) => r.prioritised).length} slot(s) prioritised. Example:{" "}
            {rows.find((r) => r.prioritised)!.memberName} —{" "}
            {rows.find((r) => r.prioritised)!.reason}.
          </p>
        )}

        <div className="flex flex-wrap gap-2.5 mt-5 items-center">
          {published ? (
            <span className="font-mono text-[12px] bg-lime px-2.5 py-2 border border-ink">
              PUBLISHED TO {rows.length} SLOTS
            </span>
          ) : (
            <PublishAllocationButton poolId={pool.id} slots={rows.length} />
          )}
          <Link href="/admin/pools" className="font-semibold text-[14.5px] border-b-2 border-ink">
            Back to pool board
          </Link>
        </div>

        <p className="font-mono text-[11px] leading-relaxed text-text-dim mt-2.5">
          Publishing records who did it and when, and the seed appears in the public pool report so
          anyone can re-run this table themselves.
        </p>
      </div>
    </div>
  );
}
