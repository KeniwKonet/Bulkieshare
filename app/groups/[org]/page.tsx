import { GroupsShell } from "@/components/nav";
import { Btn, GridTable, StatGrid } from "@/components/ui";
import { COORDINATOR_POOLS } from "@/lib/mock-data";

export const metadata = { title: "Coordinator dashboard" };

const STATE_COLOR: Record<string, string> = {
  filling: "text-rust",
  completed: "text-green",
  cancelled: "text-rust-dark",
};

export default async function CoordinatorDashboard({
  params,
}: {
  params: Promise<{ org: string }>;
}) {
  const { org } = await params;
  const orgName = "Gwarinpa Women's Cooperative";

  return (
    <GroupsShell
      org={org}
      orgName={orgName}
      active="overview"
      sideExtra={
        <div className="mt-auto border border-ink bg-ink text-paper p-3.5">
          <div className="font-mono text-[11px] text-dark-dim-2">FEES EARNED, YTD</div>
          <div className="font-display text-[25px]">₦31,600</div>
          <div className="font-mono text-[10.5px] text-dark-dim-2 mt-0.5">₦2,370 VAT WITHHELD</div>
        </div>
      }
    >
      <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-[30px] sm:text-[34px] tracking-tight">
            Two members left to pay
          </h1>
          <p className="text-[15.5px] text-text-dim mt-1.5">
            The rice pool closes Thursday at 18:00. Under twelve members it does not run and
            everybody is refunded.
          </p>
        </div>
        <div className="flex gap-2.5">
          <Btn variant="outline" size="md">
            Add a member
          </Btn>
          <Btn size="md" href={`/groups/${org}/pools/a-2231`}>
            Nudge the two
          </Btn>
        </div>
      </div>

      <StatGrid
        columns={4}
        items={[
          { label: "CASH YOU ARE HOLDING", value: "₦0", sub: "all transferred" },
          { label: "OUTSTANDING FROM MEMBERS", value: "₦12,400", sub: "2 members", valueClassName: "text-rust" },
          { label: "FEE ON THIS POOL", value: "₦4,200", sub: "paid when it completes" },
          { label: "NEXT COLLECTION", value: "Sat 23", sub: "Karu hub, 9 of 14 booked" },
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
          <GridTable
            columns="1.5fr .9fr 1fr .9fr"
            headers={["POOL", "PAID", "STATE", "YOUR FEE"]}
            rows={COORDINATOR_POOLS.map((p) => [
              <span key="t" className="font-semibold">
                {p.title} · {p.code}
              </span>,
              p.paid,
              <span key="s" className={STATE_COLOR[p.state] ?? ""}>
                {p.state}
              </span>,
              p.fee,
            ])}
          />
        </div>
        <div className="border border-ink bg-ink text-paper p-5">
          <div className="font-mono text-[11px] text-dark-dim-2 mb-2.5">READ THIS ONCE</div>
          <div className="font-display text-[22px] tracking-tight leading-tight mb-2.5">
            Refunds come back to you, not to your members
          </div>
          <p className="text-[14.5px] leading-relaxed text-dark-dim mb-3.5">
            You collected the cash and you paid in one transfer, so if a pool is cancelled the
            whole amount returns to your account. Redistributing it is your job, and members can
            see in their own app that you were refunded.
          </p>
          <span className="font-mono text-[12px] text-lime border-b border-lime">
            HOW A CANCELLED POOL WORKS
          </span>
        </div>
      </div>
    </GroupsShell>
  );
}
