import Link from "next/link";
import { redirect } from "next/navigation";

import { SupplyHeader } from "@/components/nav";
import { requireRole } from "@/lib/auth/dal";
import { getScorecard } from "@/lib/domain/supply";
import { formatKobo } from "@/lib/money";

export const metadata = { title: "Scorecard" };

export default async function ScorecardPage() {
  const member = await requireRole("supplier");
  if (!member.supplierId) redirect("/supply/onboarding");

  const card = await getScorecard(member.supplierId);
  if (!card) redirect("/supply/onboarding");

  const { supplier, totals } = card;

  const metrics = [
    {
      label: "On time delivery",
      value: `${supplier.onTimePct}%`,
      pct: supplier.onTimePct,
      note: `${totals.settled} of ${totals.orders} orders settled without a delay claim`,
    },
    {
      label: "Yield accuracy, promised against actual",
      value: `${supplier.yieldAccuracyPct}%`,
      pct: supplier.yieldAccuracyPct,
      note: "how close your live weight estimates land against QC",
    },
    {
      label: "QC rejection rate",
      value: `${supplier.rejectRatePct}%`,
      pct: supplier.rejectRatePct,
      bad: supplier.rejectRatePct > 5,
      note:
        totals.failed > 0
          ? `${totals.failed} order${totals.failed === 1 ? "" : "s"} failed QC and settled short`
          : "nothing rejected at intake so far",
    },
    {
      label: "Orders delivered to us",
      value: String(supplier.ordersDelivered),
      pct: Math.min(100, supplier.ordersDelivered * 5),
      note: `${formatKobo(totals.valueKobo)} ordered from you in total`,
    },
  ];

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SupplyHeader active="score" />
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-8">
        <h1 className="font-display text-[28px] tracking-tight mb-2">Your scorecard</h1>
        <p className="text-[15px] leading-relaxed text-text-dim mb-6">
          These numbers decide who we call first when a new pool opens. They update after every
          order.
        </p>

        <div className="border border-ink bg-card p-5 mb-5">
          <div className="flex flex-col gap-5">
            {metrics.map((m) => (
              <div key={m.label}>
                <div className="flex justify-between text-[15px] mb-1.5 gap-3">
                  <span className="font-semibold">{m.label}</span>
                  <span className={`font-mono ${m.bad ? "text-rust-dark" : ""}`}>{m.value}</span>
                </div>
                <div className="h-2.5 bg-rule-card relative mb-1.5">
                  <div
                    className={`absolute inset-y-0 left-0 ${m.bad ? "bg-rust-dark" : "bg-ink"}`}
                    style={{ width: `${Math.min(100, m.pct)}%` }}
                  />
                </div>
                <p className="text-[13.5px] text-text-dim">{m.note}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[14.5px] leading-relaxed text-text-dim mb-4">
          {supplier.rejectRatePct > 5
            ? "Two more rejections inside 90 days moves you out of first call for livestock."
            : "Keep the rejection rate under 5% and you stay on first call."}
        </p>

        <Link
          href="/supply/requests"
          className="font-semibold text-[14.5px] border-b-2 border-ink"
        >
          Back to quote requests
        </Link>
      </div>
    </div>
  );
}
