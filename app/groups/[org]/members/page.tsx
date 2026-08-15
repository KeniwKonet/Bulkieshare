import { notFound } from "next/navigation";

import { GroupsShell } from "@/components/nav";
import { GroupFeeForm, InviteMemberForm, RemoveMemberButton } from "@/components/staff-forms";
import { GridTable } from "@/components/ui";
import { requireRole } from "@/lib/auth/dal";
import {
  canManageGroup,
  getGroupBySlug,
  listCoordinatorFees,
  listGroupMembers,
} from "@/lib/domain/groups";
import { formatPhone } from "@/lib/phone";

export const metadata = { title: "Members" };

export default async function MembersPage({ params }: { params: Promise<{ org: string }> }) {
  const { org } = await params;
  const member = await requireRole("coordinator");

  const group = await getGroupBySlug(org);
  if (!group) notFound();
  if (!(await canManageGroup(org, member.id, member.role))) notFound();

  const [members, fees] = await Promise.all([
    listGroupMembers(group.id),
    listCoordinatorFees(group.id),
  ]);

  const named = members.filter((m) => m.name).length;

  return (
    <GroupsShell
      org={org}
      orgName={group.name}
      active="members"
      rosterPoolId={fees[0]?.pool.id ?? null}
    >
      <div className="max-w-3xl">
        <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
          <h1 className="font-display text-[26px] tracking-tight">
            Members · {members.length}
          </h1>
        </div>

        <p className="text-[15px] leading-relaxed text-text-dim mb-4">
          Names and numbers only. You cannot see what anyone paid outside your pools, and they can
          leave the group without asking you.
        </p>

        <div className="border border-ink bg-card p-4 mb-5">
          <div className="font-mono text-[11.5px] text-text-dim mb-2">ADD SOMEONE BY PHONE</div>
          <InviteMemberForm org={org} />
        </div>

        {members.length === 0 ? (
          <p className="text-[15px] text-text-dim leading-relaxed">
            Nobody in this group yet. Add the first number above.
          </p>
        ) : (
          <GridTable
            columns="1.4fr 1.1fr .7fr .8fr"
            headers={["NAME", "PHONE", "POOLS", ""]}
            rows={members.map((m) => [
              m.name || <span key="n" className="text-text-dim">not signed in yet</span>,
              formatPhone(m.phone),
              String(m.pools),
              <RemoveMemberButton key="r" org={org} memberId={m.memberId} />,
            ])}
            footer={`${named} of ${members.length} have signed in and named themselves`}
          />
        )}

        <p className="font-mono text-[11px] leading-relaxed text-text-dim mt-3.5">
          Members who have not signed in still get WhatsApp messages and their own collection
          codes. Nobody is forced to install anything.
        </p>

        <div className="border border-ink bg-card p-4 mt-6">
          <div className="font-mono text-[11.5px] text-text-dim mb-1">YOUR COORDINATOR FEE</div>
          <p className="text-[14.5px] text-text-dim leading-relaxed mb-3">
            Charged on what each pool collects, paid when it completes.
          </p>
          <GroupFeeForm org={org} currentPct={group.feePctBasisPoints / 100} />
        </div>
      </div>
    </GroupsShell>
  );
}
