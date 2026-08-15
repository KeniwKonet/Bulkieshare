import { notFound } from "next/navigation";

import { GroupsShell } from "@/components/nav";
import { Btn, GridTable, StatGrid } from "@/components/ui";
import { requireRole } from "@/lib/auth/dal";
import {
  canManageGroup,
  getGroupBySlug,
  listCoordinatorFees,
  totalCoordinatorEarnings,
} from "@/lib/domain/groups";
import { getPoolRoster } from "@/lib/domain/pools";
import { formatKobo } from "@/lib/money";

export const metadata = { title: "Coordinator dashboard" };

const STATE_COLOR: Record<string, string> = {
  open: "text-rust",
  funded: "text-green",
  completed: "text-green",
  underfilled: "text-rust-dark",
  refunding: "text-rust-dark",
  cancelled: "text-rust-dark",
};

export default async function CoordinatorDashboard({
  params,
}: {
  params: Promise<{ org: string }>;
}) {
  const { org } = await params;
  const member = await requireRole("coordinator");

  const group = await getGroupBySlug(org);
  if (!group) notFound();
  if (!(await canManageGroup(org, member.id, member.role))) notFound();

  const [fees, earnings] = await Promise.all([
    listCoordinatorFees(group.id),
    totalCoordinatorEarnings(group.id),
  ]);

  const live = fees.filter((f) => f.pool.isOpen);
  const focus = live.sort((a, b) => a.pool.closesAt.getTime() - b.pool.closesAt.getTime())[0];

  // Who in the focus pool still owes money.
  const roster = focus ? await getPoolRoster(focus.pool.id) : null;
  const outstanding = roster
    ? roster.holding.reduce((sum, h) => sum + h.slots, 0)
    : 0;
  const outstandingKobo = focus ? outstanding * focus.pool.pricePerSlotKobo : 0;
  const shortOfThreshold = focus ? Math.max(0, focus.pool.threshold - focus.pool.paidSlots) : 0;

  return (
    <GroupsShell
      org={org}
      orgName={group.name}
      active="overview"
      rosterPoolId={focus?.pool.id ?? fees[0]?.pool.id ?? null}
      sideExtra={
        <div className="border border-ink bg-ink text-paper p-3.5">
          <div className="font-mono text-[11px] text-dark-dim-2">FEES EARNED TO DATE</div>
          <div className="font-display text-[25px]">{formatKobo(earnings.paidKobo)}</div>
          <div className="font-mono text-[10.5px] text-dark-dim-2 mt-0.5">
            {formatKobo(earnings.pendingKobo)} PENDING
          </div>
        </div>
      }
    >
      <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-[30px] sm:text-[34px] tracking-tight">
            {focus
              ? shortOfThreshold > 0
                ? `${shortOfThreshold} more slot${shortOfThreshold === 1 ? "" : "s"} to hit threshold`
                : `${focus.pool.slotsLeft} slot${focus.pool.slotsLeft === 1 ? "" : "s"} left to fill`
              : "No pool is open right now"}
          </h1>
          <p className="text-[15.5px] text-text-dim mt-1.5">
            {focus
              ? `${focus.pool.title} closes ${focus.pool.closesAtLabel}. Under ${focus.pool.threshold} slots it does not run and everybody is refunded.`
              : "Open a pool and your members will see it when they sign in."}
          </p>
        </div>
        <div className="flex gap-2.5">
          <Btn variant="outline" size="md" href={`/groups/${org}/members`}>
            Members
          </Btn>
          <Btn size="md" href={`/groups/${org}/pools/new`}>
            Open a pool
          </Btn>
        </div>
      </div>

      <StatGrid
        columns={4}
        items={[
          {
            label: "MEMBERS IN YOUR GROUP",
            value: String(group.memberCount),
            sub: "signed up to your pools",
          },
          {
            label: "HELD, NOT YET PAID",
            value: formatKobo(outstandingKobo),
            sub: `${outstanding} slot${outstanding === 1 ? "" : "s"} on hold`,
            valueClassName: outstanding > 0 ? "text-rust" : undefined,
          },
          {
            label: "FEE ON THE OPEN POOL",
            value: focus ? formatKobo(focus.feeKobo) : "—",
            sub: "paid when it completes",
          },
          {
            label: "NEXT SHARE DATE",
            value: focus ? focus.pool.shareDateLabel.split(" ").slice(0, 2).join(" ") : "—",
            sub: focus ? `${focus.pool.hubName}, ${focus.pool.paidSlots} paid` : "nothing scheduled",
          },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-4.5 mt-5">
        <div className="border border-ink bg-card">
          <div className="px-4.5 py-3.5 border-b border-ink flex justify-between items-center">
            <span className="font-bold text-[16px]">Your pools</span>
            <Btn href={`/groups/${org}/pools/new`} variant="outline" size="sm">
              Open a new one
            </Btn>
          </div>

          {fees.length === 0 ? (
            <p className="px-4.5 py-8 text-[15px] text-text-dim leading-relaxed">
              You have not opened a pool yet. The first one takes about two minutes.
            </p>
          ) : (
            <GridTable
              columns="1.5fr .9fr 1fr .9fr"
              headers={["POOL", "PAID", "STATE", "YOUR FEE"]}
              rows={fees.map((f) => [
                <a
                  key="t"
                  href={`/groups/${org}/pools/${f.pool.id}`}
                  className="font-semibold underline"
                >
                  {f.pool.title} · #{f.pool.code}
                </a>,
                `${f.pool.paidSlots}/${f.pool.totalSlots}`,
                <span key="s" className={STATE_COLOR[f.pool.state] ?? ""}>
                  {f.pool.state}
                </span>,
                f.isPaid ? `${formatKobo(f.feeKobo)} paid` : formatKobo(f.feeKobo),
              ])}
            />
          )}
        </div>

        <div className="border border-ink bg-ink text-paper p-5">
          <div className="font-mono text-[11px] text-dark-dim-2 mb-2.5">READ THIS ONCE</div>
          <div className="font-display text-[22px] tracking-tight leading-tight mb-2.5">
            Refunds come back to you, not to your members
          </div>
          <p className="text-[14.5px] leading-relaxed text-dark-dim">
            If you collected the cash and paid in one transfer, a cancelled pool returns the whole
            amount to your account. Redistributing it is your job, and members can see in their own
            app that you were refunded.
          </p>
        </div>
      </div>
    </GroupsShell>
  );
}
