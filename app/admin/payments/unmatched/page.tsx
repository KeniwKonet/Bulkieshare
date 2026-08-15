import { OpsHeader } from "@/components/nav";
import { UnmatchedTransferActions } from "@/components/staff-forms";
import { requireOps } from "@/lib/auth/dal";
import { listUnmatchedTransfers, searchMembers } from "@/lib/domain/ops";
import { formatKobo } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { formatEventStamp } from "@/lib/time";

export const metadata = { title: "Unmatched transfers" };

export default async function UnmatchedPaymentsPage() {
  await requireOps();

  const [transfers, members] = await Promise.all([listUnmatchedTransfers(), searchMembers()]);

  const totalKobo = transfers.reduce((sum, t) => sum + t.amountKobo, 0);
  const memberOptions = members.map((m) => ({
    id: m.id,
    label: `${m.name || "unnamed"} · ${formatPhone(m.phone)}`,
  }));

  return (
    <div className="min-h-screen bg-paper text-ink">
      <OpsHeader active="payments" />
      <div className="max-w-2xl mx-auto px-5 sm:px-8 py-8">
        <div className="font-display text-[26px] tracking-tight">Unmatched transfers</div>
        <div className="font-mono text-[11px] text-text-dim mt-1 mb-5">
          {transfers.length} OPEN · {formatKobo(totalKobo)} UNAPPLIED
        </div>
        <p className="text-[14.5px] leading-relaxed text-text-dim mb-6">
          Money that arrived without a clean reference. It is never sent back automatically,
          because a member who paid and sees nothing will not try again.
        </p>

        {transfers.length === 0 ? (
          <div className="border border-ink bg-card px-5 py-10 text-center">
            <div className="font-display text-[22px] tracking-tight mb-1.5">
              Nothing unmatched
            </div>
            <p className="text-[14.5px] text-text-dim">
              Every payment that has landed has found its reservation.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {transfers.map((t) => (
              <div
                key={t.id}
                className={`border bg-card p-4 ${t.isUrgent ? "border-rust-dark" : "border-ink"}`}
              >
                <div className="flex justify-between items-baseline mb-2 gap-3 flex-wrap">
                  <span className="font-display text-[22px]">{formatKobo(t.amountKobo)}</span>
                  <span
                    className={`font-mono text-[11px] ${t.isUrgent ? "text-rust-dark" : "text-text-dim"}`}
                  >
                    {formatEventStamp(t.receivedAt)} · {t.ageLabel.toUpperCase()}
                    {t.state === "escalated" ? " · ESCALATED" : ""}
                  </span>
                </div>

                <div className="font-mono text-[12px] text-text-dim leading-relaxed mb-3">
                  FROM: {t.fromName || "unknown"}
                  <br />
                  {t.bankRef}
                  <br />
                  NARRATION: {t.narration || "none"}
                </div>

                {t.guess && (
                  <div className="bg-paper border border-rule p-2.5 text-[13.5px] leading-relaxed mb-3">
                    {t.guess}
                  </div>
                )}

                <UnmatchedTransferActions transferId={t.id} members={memberOptions} />
              </div>
            ))}
          </div>
        )}

        <p className="font-mono text-[11px] leading-relaxed text-text-dim mt-6 border-t border-rule pt-4">
          Every apply, credit and reversal here writes an audit entry with your user id. Nothing in
          this queue can be resolved silently.
        </p>
      </div>
    </div>
  );
}
