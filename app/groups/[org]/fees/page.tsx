import { notFound } from "next/navigation";

import { GroupsShell } from "@/components/nav";
import { GridTable, StatGrid } from "@/components/ui";
import { requireRole } from "@/lib/auth/dal";
import {
  canManageGroup,
  getGroupBySlug,
  listCoordinatorFees,
  totalCoordinatorEarnings,
} from "@/lib/domain/groups";
import { formatKobo } from "@/lib/money";

export const metadata = { title: "My fees" };

export default async function FeesPage({ params }: { params: Promise<{ org: string }> }) {
  const { org } = await params;
  const member = await requireRole("coordinator");

  const group = await getGroupBySlug(org);
  if (!group) notFound();
  if (!(await canManageGroup(org, member.id, member.role))) notFound();

  const [fees, earnings] = await Promise.all([
    listCoordinatorFees(group.id),
    totalCoordinatorEarnings(group.id),
  ]);

  const feePct = (group.feePctBasisPoints / 100).toFixed(1);

  return (
    <GroupsShell
      org={org}
      orgName={group.name}
      active="fees"
      rosterPoolId={fees[0]?.pool.id ?? null}
    >
      <div className="max-w-2xl">
        <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
          <h1 className="font-display text-[26px] tracking-tight">My fees</h1>
          <span className="font-mono text-[11.5px] text-text-dim">{feePct}% OF EACH POOL</span>
        </div>

        <StatGrid
          columns={3}
          items={[
            { label: "PAID TO YOU", value: formatKobo(earnings.paidKobo) },
            { label: "DUE ON COMPLETION", value: formatKobo(earnings.pendingKobo) },
            { label: "POOLS RUN", value: String(fees.length) },
          ]}
        />

        <div className="mt-6">
          {fees.length === 0 ? (
            <p className="text-[15px] text-text-dim leading-relaxed">
              Nothing yet. Your fee is calculated on what a pool collects, and is paid once it
              completes.
            </p>
          ) : (
            <GridTable
              columns="1.4fr .8fr .9fr .9fr"
              headers={["POOL", "SLOTS", "COLLECTED", "YOUR FEE"]}
              rows={fees.map((f) => [
                `${f.pool.title} · #${f.pool.code}`,
                `${f.pool.paidSlots}/${f.pool.totalSlots}`,
                formatKobo(f.collectedKobo),
                f.isPaid ? (
                  <span key="p" className="text-green">
                    {formatKobo(f.feeKobo)} paid
                  </span>
                ) : f.pool.state === "underfilled" ||
                  f.pool.state === "cancelled" ||
                  f.pool.state === "refunding" ? (
                  <span key="p" className="text-text-dim">
                    nothing, cancelled
                  </span>
                ) : (
                  <span key="p" className="text-rust">
                    {formatKobo(f.feeKobo)} on completion
                  </span>
                ),
              ])}
            />
          )}
        </div>

        <p className="text-[14.5px] leading-relaxed text-text-dim mt-4">
          A cancelled pool earns nothing. That is deliberate: the fee exists to reward a pool that
          fills and gets collected, not one that was opened.
        </p>
      </div>
    </GroupsShell>
  );
}
