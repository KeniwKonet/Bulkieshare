import Link from "next/link";
import { SupplyHeader } from "@/components/nav";
import { Btn } from "@/components/ui";

export const metadata = { title: "Scorecard" };

const METRICS = [
  { label: "On time delivery", value: "94%", pct: 94, note: "38 of 40 deliveries on or before the promised date" },
  { label: "Yield accuracy, promised against actual", value: "97%", pct: 97, note: "how close your live weight estimates land against QC" },
  { label: "QC rejection rate", value: "6%", pct: 6, bad: true, note: "one ram rejected on 2 Aug for a visible injury" },
  { label: "Price stability, 90 days", value: "±2.1%", pct: 18, note: "how much your quoted price moves week to week" },
];

export default function ScorecardPage() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <SupplyHeader active="score" />
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-8">
        <h1 className="font-display text-[28px] tracking-tight mb-2">Your scorecard</h1>
        <p className="text-[15px] leading-relaxed text-text-dim mb-6">
          These four numbers decide who we call first when a new pool opens. They update after
          every order.
        </p>
        <div className="border border-ink bg-card p-5 mb-5">
          <div className="flex flex-col gap-5">
            {METRICS.map((m) => (
              <div key={m.label}>
                <div className="flex justify-between text-[15px] mb-1.5">
                  <span className="font-semibold">{m.label}</span>
                  <span className={`font-mono ${m.bad ? "text-rust-dark" : ""}`}>{m.value}</span>
                </div>
                <div className="h-2.5 bg-rule-card relative mb-1.5">
                  <div
                    className={`absolute inset-y-0 left-0 ${m.bad ? "bg-rust-dark" : "bg-ink"}`}
                    style={{ width: `${m.pct}%` }}
                  />
                </div>
                <p className="text-[13.5px] text-text-dim">{m.note}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-[14.5px] leading-relaxed text-text-dim mb-4">
          Two more rejections inside 90 days moves you out of first call for livestock.
        </p>
        <div className="flex gap-3">
          <Btn variant="outline">See the rejection photo</Btn>
          <Link href="/supply/requests" className="font-semibold text-[14.5px] border-b-2 border-ink self-center">
            Back to quote requests
          </Link>
        </div>
      </div>
    </div>
  );
}
