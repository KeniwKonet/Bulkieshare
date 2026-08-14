import { GroupsShell } from "@/components/nav";
import { Btn, GridTable, ProgressBar, Tag } from "@/components/ui";
import { ROSTER } from "@/lib/mock-data";

export const metadata = { title: "Live roster" };

const STATUS_STYLE: Record<string, string> = {
  paid: "text-green font-semibold",
  paid_by_coordinator: "text-green font-semibold",
  holding: "text-rust font-semibold",
  not_started: "text-text-dim",
};

const STATUS_LABEL: Record<string, string> = {
  paid: "paid",
  paid_by_coordinator: "paid by you",
  holding: "holding",
  not_started: "not started",
};

export default async function LiveRoster({
  params,
}: {
  params: Promise<{ org: string; id: string }>;
}) {
  const { org, id } = await params;
  const paid = ROSTER.filter((r) => r.status === "paid" || r.status === "paid_by_coordinator").length;
  const total = 14;
  const paidSlots = ROSTER.filter((r) => r.status !== "holding" && r.status !== "not_started").reduce(
    (s, r) => s + r.slots,
    0,
  );

  return (
    <GroupsShell org={org} orgName="Gwarinpa Women's Cooperative" active="roster">
      <div className="flex justify-between items-center mb-5 flex-wrap gap-2 -mt-2">
        <span className="font-mono text-[12.5px]">
          GWARINPA WOMEN&apos;S COOPERATIVE / RICE 50KG / #{id.toUpperCase()}
        </span>
        <Tag tone="rust">CLOSES THU 18:00 · 2 SHORT OF THRESHOLD</Tag>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
        <div>
          <div className="flex justify-between items-end mb-3.5 flex-wrap gap-3">
            <div>
              <h2 className="font-display text-[28px] sm:text-[30px] tracking-tight">
                {paid} paid, 1 holding, 1 not started
              </h2>
              <p className="text-[15px] text-text-dim mt-1">
                Blessing&apos;s hold expires in eight minutes and her slot goes back to the group.
              </p>
            </div>
            <Btn variant="outline" size="sm">
              Pay for someone
            </Btn>
          </div>
          <div className="mb-5">
            <ProgressBar paidPct={(paidSlots / total) * 100} reservedPct={(1 / total) * 100} height={12} />
          </div>
          <GridTable
            columns="1.5fr .7fr 1.1fr .8fr .8fr"
            headers={["MEMBER", "SLOTS", "STATUS", "CODE", "WINDOW"]}
            rows={ROSTER.map((r) => [
              r.name,
              String(r.slots),
              <span key="s" className={STATUS_STYLE[r.status]}>
                {STATUS_LABEL[r.status]}
                {r.status === "holding" && r.holdExpiresIn ? ` ${r.holdExpiresIn}` : ""}
              </span>,
              r.code ?? <span className="text-text-faint">none</span>,
              r.window ? (
                r.windowBooked ? (
                  r.window
                ) : (
                  <span className="text-rust">not booked</span>
                )
              ) : (
                <span className="text-text-faint">none</span>
              ),
            ])}
            footer="7 more rows · 14 slots total"
          />
        </div>

        <div className="flex flex-col gap-4">
          <div className="border border-ink bg-card p-4.5">
            <div className="font-bold text-[16px] mb-2.5">Nudge, in their language</div>
            <div className="bg-paper border border-rule p-3.5 text-[14px] leading-relaxed mb-3">
              <div className="font-mono text-[10.5px] text-text-dim mb-1.5">TO FATIMA SANI</div>
              Fatima, the rice pool closes Thursday 18:00 and we are two people short. Your slot
              is ₦6,200 for a full 50kg bag. If we do not reach twelve, everyone gets their money
              back and nobody gets rice.
            </div>
            <div className="flex gap-2">
              <Btn size="sm" block>
                Send on WhatsApp
              </Btn>
              <Btn variant="outline" size="sm" block>
                Edit first
              </Btn>
            </div>
          </div>
          <div className="border border-ink bg-card p-4.5">
            <div className="font-bold text-[16px] mb-2.5">Money trail for this pool</div>
            <div className="flex justify-between text-[14.5px] py-2 border-b border-rule-card">
              <span className="text-text-dim">Collected in cash from members</span>
              <span className="font-mono">₦74,400</span>
            </div>
            <div className="flex justify-between text-[14.5px] py-2 border-b border-rule-card">
              <span className="text-text-dim">You transferred to the pool</span>
              <span className="font-mono">₦74,400</span>
            </div>
            <div className="flex justify-between text-[14.5px] py-2 border-b border-rule-card">
              <span className="text-text-dim">Members who paid us directly</span>
              <span className="font-mono">₦12,400</span>
            </div>
            <div className="flex justify-between text-[14.5px] py-2">
              <span className="text-text-dim">Still outstanding</span>
              <span className="font-mono text-rust">₦12,400</span>
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
