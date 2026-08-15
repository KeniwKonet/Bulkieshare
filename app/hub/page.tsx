import Link from "next/link";

import { PhoneShell } from "@/components/nav";
import { Btn, ProgressBar } from "@/components/ui";
import { requireRole } from "@/lib/auth/dal";
import { listHandoverQueue } from "@/lib/domain/commitments";
import { getHub } from "@/lib/domain/pools";

export const metadata = { title: "Hub agent" };

export default async function HubQueuePage() {
  const agent = await requireRole("hub_agent");
  const hubId = agent.homeHubId;

  if (!hubId) {
    return (
      <div className="bg-[#8E8C86] min-h-screen py-6">
        <PhoneShell dark title="Hub agent">
          <div className="px-4.5 py-8">
            <div className="font-display text-[24px] tracking-tight mb-2">
              No hub assigned to you
            </div>
            <p className="text-[15px] leading-relaxed text-dark-dim">
              Ask the ops desk to set your hub on your account, then this becomes your handover
              list for the day.
            </p>
          </div>
        </PhoneShell>
      </div>
    );
  }

  const [hub, queue] = await Promise.all([getHub(hubId), listHandoverQueue(hubId)]);

  const done = queue.filter((q) => q.handedOverAt).length;
  const pct = queue.length ? (done / queue.length) * 100 : 0;

  return (
    <div className="bg-[#8E8C86] min-h-screen py-6">
      <PhoneShell dark>
        <div className="px-4.5 py-3.5 bg-ink border-b border-dark-rule-2 flex justify-between items-center font-mono text-[12px] font-semibold">
          <span>{hub?.name.toUpperCase() ?? "HUB"}</span>
          <span className="text-dark-dim-2">{agent.name.toUpperCase()}</span>
        </div>

        <div className="px-4.5 py-4.5 border-b border-dark-rule-2">
          <div className="font-mono text-[11.5px] text-dark-dim-2">
            {hub?.windows ?? "collection windows"}
          </div>
          <div className="font-display text-[28px] tracking-tight mt-1">
            {done} of {queue.length} done
          </div>
          <div className="mt-2.5">
            <ProgressBar paidPct={pct} height={12} onDark />
          </div>
        </div>

        <div className="px-4.5 py-4.5">
          <div className="font-mono text-[11.5px] text-dark-dim-2 mb-3">TODAY&apos;S HANDOVERS</div>

          {queue.length === 0 ? (
            <p className="text-[15px] leading-relaxed text-dark-dim">
              Nothing to hand over at this hub yet. Pools appear here once they are funded.
            </p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {queue.map((q) => {
                const isDone = Boolean(q.handedOverAt);
                return (
                  <Link
                    key={q.commitmentId}
                    href={isDone ? "/hub" : `/hub/handover?commitment=${q.commitmentId}`}
                    className={`border px-3.5 py-3.5 flex justify-between items-center gap-3 ${
                      isDone ? "border-dark-rule-2 opacity-50" : "border-dark-rule-2"
                    }`}
                  >
                    <div>
                      <div className="text-[17px] font-semibold">{q.memberName || "Unnamed"}</div>
                      <div className="font-mono text-[12px] text-dark-dim-2">
                        {q.slots} slot{q.slots === 1 ? "" : "s"} · code {q.collectionCode ?? "—"} ·
                        #{q.poolCode}
                      </div>
                    </div>
                    <span
                      className={`font-mono text-[11.5px] whitespace-nowrap ${
                        isDone ? "text-dark-dim-2" : "bg-lime text-ink px-2 py-1"
                      }`}
                    >
                      {isDone ? "DONE" : (q.windowLabel ?? "ANY TIME")}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-auto px-4.5 py-4.5 border-t border-dark-rule-2">
          <Btn href="/hub/handover" size="xl" block>
            Enter a code
          </Btn>
        </div>
      </PhoneShell>
    </div>
  );
}
