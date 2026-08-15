import Link from "next/link";

import { OpsHeader } from "@/components/nav";
import { PayRefundButton } from "@/components/staff-forms";
import { GridTable, StatGrid } from "@/components/ui";
import { requireOps } from "@/lib/auth/dal";
import { listRefunds } from "@/lib/domain/support";
import { formatKobo } from "@/lib/money";
import { formatSlaRemaining, formatShortDate } from "@/lib/time";

export const metadata = { title: "Refund queue" };

export default async function RefundQueuePage() {
  await requireOps();

  const refunds = await listRefunds();
  const outstanding = refunds.filter((r) => r.state !== "paid");
  const paid = refunds.filter((r) => r.state === "paid");

  const outstandingKobo = outstanding.reduce((sum, r) => sum + r.amountKobo, 0);
  const paidKobo = paid.reduce((sum, r) => sum + r.amountKobo, 0);

  const oldest = outstanding
    .map((r) => r.dueAt)
    .filter((d): d is Date => d !== null)
    .sort((a, b) => a.getTime() - b.getTime())[0];

  return (
    <div className="min-h-screen bg-paper text-ink">
      <OpsHeader active="refunds" />
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-8">
        <div className="bg-rust-dark text-white px-5 sm:px-8 py-3 flex flex-wrap justify-between gap-2 font-mono text-[12px] -mx-5 sm:-mx-8 mb-6">
          <span>REFUND QUEUE · SLA 24H FROM POOL CANCELLATION</span>
          <span>{oldest ? `OLDEST DUE: ${formatSlaRemaining(oldest).toUpperCase()}` : "NOTHING DUE"}</span>
        </div>

        <h1 className="font-display text-[26px] tracking-tight mb-1.5">
          {outstanding.length} refund{outstanding.length === 1 ? "" : "s"} outstanding
        </h1>
        <p className="text-[15px] leading-relaxed text-text-dim mb-5">
          A refund is raised automatically when a pool closes under its threshold. The shortfall
          policy is snapshotted when the pool opens, so it cannot be argued about afterwards.
        </p>

        <StatGrid
          columns={4}
          items={[
            {
              label: "TO REFUND",
              value: formatKobo(outstandingKobo),
              valueClassName: outstandingKobo > 0 ? "text-rust-dark" : undefined,
            },
            { label: "ALREADY PAID", value: formatKobo(paidKobo) },
            { label: "OUTSTANDING", value: String(outstanding.length) },
            { label: "PAID", value: String(paid.length) },
          ]}
        />

        <div className="font-mono text-[11.5px] text-text-dim mb-2.5 mt-6">
          DESTINATION CHECK, BEFORE YOU PAY
        </div>

        {refunds.length === 0 ? (
          <div className="border border-ink bg-card px-5 py-10 text-center">
            <div className="font-display text-[22px] tracking-tight mb-1.5">Nothing to refund</div>
            <p className="text-[14.5px] text-text-dim">No pool has closed under threshold.</p>
          </div>
        ) : (
          <GridTable
            columns="1fr 1.3fr .9fr .9fr .9fr 1fr"
            headers={["REF", "PAYER", "AMOUNT", "POOL", "METHOD", ""]}
            fontSize={13}
            rows={refunds.map((r) => [
              <Link key="r" href={`/refunds/${r.id}`} className="underline font-mono">
                {r.reference}
              </Link>,
              r.memberName || "unnamed",
              formatKobo(r.amountKobo),
              r.poolCode ? `#${r.poolCode}` : "—",
              r.method,
              r.state === "paid" ? (
                <span key="s" className="text-green font-mono text-[12px]">
                  paid {r.paidAt ? formatShortDate(r.paidAt) : ""}
                </span>
              ) : (
                <PayRefundButton key="s" refundId={r.id} />
              ),
            ])}
          />
        )}

        <p className="text-[14.5px] leading-relaxed text-text-dim mt-4">
          A member can convert a bank refund to store credit themselves, which lands instantly. Any
          refund still showing here is one they chose to take back to their account.
        </p>

        {outstanding.some((r) => r.method === "bank" && !r.bankAccountNumber) && (
          <p className="font-mono text-[11.5px] text-rust-dark mt-3">
            {outstanding.filter((r) => r.method === "bank" && !r.bankAccountNumber).length} payer(s)
            have no account on file. Call them before attempting a transfer.
          </p>
        )}
      </div>
    </div>
  );
}
