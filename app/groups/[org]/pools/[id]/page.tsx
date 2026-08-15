import { notFound } from "next/navigation";

import { GroupsShell } from "@/components/nav";
import { GridTable, ProgressBar, Tag } from "@/components/ui";
import { requireRole } from "@/lib/auth/dal";
import { canManageGroup, getGroupBySlug, listCoordinatorFees } from "@/lib/domain/groups";
import { getPool, getPoolRoster } from "@/lib/domain/pools";
import { formatKobo } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { formatTimeOfDay, secondsUntil } from "@/lib/time";

export const metadata = { title: "Live roster" };

export default async function LiveRoster({
  params,
}: {
  params: Promise<{ org: string; id: string }>;
}) {
  const { org, id } = await params;
  const member = await requireRole("coordinator");

  const group = await getGroupBySlug(org);
  if (!group) notFound();
  if (!(await canManageGroup(org, member.id, member.role))) notFound();

  const pool = await getPool(id);
  if (!pool) notFound();

  const [roster, fees] = await Promise.all([
    getPoolRoster(pool.id),
    listCoordinatorFees(group.id),
  ]);

  const holdingSlots = roster.holding.reduce((sum, h) => sum + h.slots, 0);
  const collectedKobo = pool.paidSlots * pool.pricePerSlotKobo;
  const outstandingKobo = holdingSlots * pool.pricePerSlotKobo;
  const shortOfThreshold = Math.max(0, pool.threshold - pool.paidSlots);
  const thisFee = fees.find((f) => f.pool.id === pool.id);

  const rows = [
    ...roster.paid.map((p) => [
      p.name || "not signed in yet",
      String(p.slots),
      <span key="s" className="text-green font-semibold">
        {p.paidByCoordinator ? "paid by you" : "paid"}
      </span>,
      p.code ?? <span key="c" className="text-text-faint">none</span>,
      p.windowAt ? (
        formatTimeOfDay(p.windowAt)
      ) : (
        <span key="w" className="text-rust">
          not booked
        </span>
      ),
    ]),
    ...roster.holding.map((h) => {
      const mins = Math.ceil(secondsUntil(h.expiresAt) / 60);
      return [
        h.name || "not signed in yet",
        String(h.slots),
        <span key="s" className="text-rust font-semibold">
          holding {mins}m
        </span>,
        <span key="c" className="text-text-faint">
          none
        </span>,
        <span key="w" className="text-text-faint">
          none
        </span>,
      ];
    }),
  ];

  return (
    <GroupsShell org={org} orgName={group.name} active="roster" rosterPoolId={pool.id}>
      <div className="flex justify-between items-center mb-5 flex-wrap gap-2 -mt-2">
        <span className="font-mono text-[12.5px]">
          {group.name.toUpperCase()} / {pool.title.toUpperCase()} / #{pool.code}
        </span>
        {pool.isOpen ? (
          <Tag tone={shortOfThreshold > 0 ? "rust" : "lime"}>
            CLOSES {pool.closesAtLabel.toUpperCase()}
            {shortOfThreshold > 0 ? ` · ${shortOfThreshold} SHORT OF THRESHOLD` : " · THRESHOLD MET"}
          </Tag>
        ) : (
          <Tag tone="outline">{pool.state.toUpperCase()}</Tag>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
        <div>
          <div className="flex justify-between items-end mb-3.5 flex-wrap gap-3">
            <div>
              <h2 className="font-display text-[28px] sm:text-[30px] tracking-tight">
                {roster.paid.length} paid, {roster.holding.length} holding
              </h2>
              <p className="text-[15px] text-text-dim mt-1">
                {holdingSlots > 0
                  ? `${holdingSlots} slot${holdingSlots === 1 ? "" : "s"} on hold. When a hold lapses the slot goes back to the group.`
                  : "Nothing is on hold right now."}
              </p>
            </div>
          </div>

          <div className="mb-5">
            <ProgressBar
              paidPct={(pool.paidSlots / pool.totalSlots) * 100}
              reservedPct={(pool.holdingSlots / pool.totalSlots) * 100}
              thresholdPct={(pool.threshold / pool.totalSlots) * 100}
              height={12}
            />
          </div>

          {rows.length === 0 ? (
            <p className="text-[15px] text-text-dim leading-relaxed">
              Nobody has taken a slot yet.
            </p>
          ) : (
            <GridTable
              columns="1.5fr .7fr 1.1fr .8fr .8fr"
              headers={["MEMBER", "SLOTS", "STATUS", "CODE", "WINDOW"]}
              rows={rows}
              footer={`${pool.paidSlots} of ${pool.totalSlots} slots paid`}
            />
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="border border-ink bg-card p-4.5">
            <div className="font-bold text-[16px] mb-2.5">Nudge, in their language</div>
            <div className="bg-paper border border-rule p-3.5 text-[14px] leading-relaxed">
              <div className="font-mono text-[10.5px] text-text-dim mb-1.5">
                {roster.holding[0]
                  ? `TO ${(roster.holding[0].name || formatPhone("")).toUpperCase()}`
                  : "SUGGESTED MESSAGE"}
              </div>
              {roster.holding[0]?.name?.split(" ")[0] ?? "Hello"}, the{" "}
              {pool.title.toLowerCase()} pool closes {pool.closesAtLabel} and we are{" "}
              {shortOfThreshold > 0 ? `${shortOfThreshold} slots short` : "nearly full"}. Your slot
              is {formatKobo(pool.pricePerSlotKobo)}. If we do not reach {pool.threshold}, everyone
              gets their money back and nobody gets any.
            </div>
          </div>

          <div className="border border-ink bg-card p-4.5">
            <div className="font-bold text-[16px] mb-2.5">Money trail for this pool</div>
            <div className="flex justify-between text-[14.5px] py-2 border-b border-rule-card">
              <span className="text-text-dim">Collected from members</span>
              <span className="font-mono">{formatKobo(collectedKobo)}</span>
            </div>
            <div className="flex justify-between text-[14.5px] py-2 border-b border-rule-card">
              <span className="text-text-dim">Still on hold, unpaid</span>
              <span className="font-mono text-rust">{formatKobo(outstandingKobo)}</span>
            </div>
            <div className="flex justify-between text-[14.5px] py-2">
              <span className="text-text-dim">Your fee on completion</span>
              <span className="font-mono">{thisFee ? formatKobo(thisFee.feeKobo) : "—"}</span>
            </div>
            <p className="font-mono text-[11px] leading-relaxed text-text-dim mt-3">
              Every member sees this same table for their own slot, so there is nothing to argue
              about at the hub.
            </p>
          </div>
        </div>
      </div>
    </GroupsShell>
  );
}
