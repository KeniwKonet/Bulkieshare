import { SitePage } from "@/components/nav";
import { Btn, StatGrid } from "@/components/ui";

export const metadata = { title: "Trust and the refund promise" };

const POLICY = [
  {
    k: "THRESHOLD",
    v: "Every pool names the minimum number of members it needs. Below that at closing time, it is cancelled.",
  },
  {
    k: "PRICE",
    v: "The price you see is the price you pay. If the farmer raises his price after you have joined, that is our loss, not yours.",
  },
  {
    k: "PULLING OUT",
    v: "You can withdraw for a full refund until 72 hours before the pool closes. After that your money is committed to the purchase.",
  },
  {
    k: "WHERE IT SITS",
    v: "Members' money is in a separate bank account. It moves twice only: to the supplier when the pool funds, or back to you.",
  },
  {
    k: "SHORT WEIGHT",
    v: "Under the published tolerance band, the difference is credited automatically. You can ask for it as cash instead.",
  },
  {
    k: "NOT AN INVESTMENT",
    v: "You are buying food at a lower price. There is no return, no interest and no scheme. Anyone who tells you otherwise is not us.",
  },
];

export default function TrustPage() {
  return (
    <SitePage>
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-9">
        <div className="flex justify-end mb-2">
          <span className="font-mono text-[12px] text-text-dim">UPDATED 12 AUG 2026</span>
        </div>
        <h1 className="font-display text-[38px] sm:text-[46px] tracking-tight leading-none mb-4">
          Your money, before the food exists
        </h1>
        <p className="text-[16px] leading-relaxed text-text-mid mb-6">
          You are paying for something that has not been bought yet. That is a real risk and it
          deserves a straight answer rather than a badge.
        </p>
        <StatGrid
          columns={2}
          items={[
            { label: "refund promise", value: "24h" },
            { label: "slowest refund in the last 90 days", value: "9h 40m" },
            { label: "pools cancelled, all refunded in full", value: "3" },
            { label: "of pool money ever spent on running the company", value: "₦0" },
          ]}
        />

        <h2 className="font-display text-[24px] tracking-tight mt-10 mb-4">
          The pool policy, in plain words
        </h2>
        <div className="flex flex-col gap-3.5">
          {POLICY.map((p) => (
            <div key={p.k} className="flex gap-3.5 text-[15px] leading-relaxed text-text-mid">
              <span className="font-mono text-[12px] text-text-dim flex-shrink-0 w-[100px] pt-0.5">
                {p.k}
              </span>
              <span>{p.v}</span>
            </div>
          ))}
        </div>
        <Btn href="/pool-policy" className="mt-6">
          Read the full pool policy
        </Btn>
      </div>
    </SitePage>
  );
}
