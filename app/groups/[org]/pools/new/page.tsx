import { notFound } from "next/navigation";

import { GroupsShell } from "@/components/nav";
import { CreatePoolForm } from "@/components/staff-forms";
import { requireRole } from "@/lib/auth/dal";
import { canManageGroup, getGroupBySlug, listCoordinatorFees } from "@/lib/domain/groups";
import { listHubs } from "@/lib/domain/pools";

export const metadata = { title: "Open a pool" };

export default async function OpenPoolPage({ params }: { params: Promise<{ org: string }> }) {
  const { org } = await params;
  const member = await requireRole("coordinator");

  const group = await getGroupBySlug(org);
  if (!group) notFound();
  if (!(await canManageGroup(org, member.id, member.role))) notFound();

  const [hubs, fees] = await Promise.all([
    listHubs(group.areaSlug),
    listCoordinatorFees(group.id),
  ]);

  return (
    <GroupsShell
      org={org}
      orgName={group.name}
      active="new"
      rosterPoolId={fees[0]?.pool.id ?? null}
    >
      <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
        <h1 className="font-display text-[26px] tracking-tight">Open a pool for the group</h1>
        <span className="font-mono text-[11.5px] text-text-dim">
          {group.memberCount} MEMBER{group.memberCount === 1 ? "" : "S"}
        </span>
      </div>

      <p className="text-[15px] leading-relaxed text-text-dim mb-6 max-w-xl">
        Set the price you have been quoted, not one you hope for. A coordinator promising a price
        we have not bought at is how this business ends. Your fee is{" "}
        {(group.feePctBasisPoints / 100).toFixed(1)}% of what the pool collects, paid on
        completion.
      </p>

      <CreatePoolForm
        areaSlug={group.areaSlug}
        hubs={hubs.map((h) => ({ id: h.id, name: h.name }))}
        org={org}
      />
    </GroupsShell>
  );
}
