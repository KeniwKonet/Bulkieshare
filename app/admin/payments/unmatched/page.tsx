import { OpsHeader } from "@/components/nav";
import { Btn } from "@/components/ui";
import { formatNaira, UNMATCHED_TRANSFERS } from "@/lib/mock-data";

export const metadata = { title: "Unmatched transfers" };

export default function UnmatchedPaymentsPage() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <OpsHeader active="payments" />
      <div className="max-w-2xl mx-auto px-5 sm:px-8 py-8">
        <div className="font-display text-[26px] tracking-tight">Unmatched transfers</div>
        <div className="font-mono text-[11px] text-text-dim mt-1 mb-5">6 OPEN · ₦74,300 UNAPPLIED</div>
        <p className="text-[14.5px] leading-relaxed text-text-dim mb-6">
          Money that arrived without a clean reference. It is never sent back automatically,
          because a member who paid and sees nothing will not try again.
        </p>

        <div className="flex flex-col gap-3.5">
          {UNMATCHED_TRANSFERS.map((t) => (
            <div
              key={t.receivedAt + t.amount}
              className={`border bg-card p-4 ${t.urgent ? "border-rust-dark" : "border-ink"}`}
            >
              <div className="flex justify-between items-baseline mb-2">
                <span className="font-display text-[22px]">{formatNaira(t.amount)}</span>
                <span className={`font-mono text-[11px] ${t.urgent ? "text-rust-dark" : "text-text-dim"}`}>
                  {t.receivedAt}
                  {t.age ? ` · ${t.age}` : ""}
                </span>
              </div>
              <div className="font-mono text-[12px] text-text-dim leading-relaxed mb-3">
                FROM: {t.fromName}
                <br />
                {t.bankRef}
                <br />
                NARRATION: {t.narration}
              </div>
              <div className="bg-paper border border-rule p-2.5 text-[13.5px] leading-relaxed mb-3">
                {t.guess}
              </div>
              {t.urgent ? (
                <Btn variant="plain-rust" size="sm" block>
                  Open an investigation
                </Btn>
              ) : (
                <div className="flex gap-1.5">
                  <Btn size="sm" block>
                    Apply
                  </Btn>
                  <Btn variant="outline" size="sm" block>
                    Hold as credit
                  </Btn>
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="font-mono text-[11px] leading-relaxed text-text-dim mt-6 border-t border-rule pt-4">
          Every apply, credit and reversal here writes a ledger entry with your user id. Nothing
          in this queue can be resolved silently.
        </p>
      </div>
    </div>
  );
}
