import { LegalDoc } from "@/components/legal-doc";

export const metadata = { title: "Pool policy" };

export default function PoolPolicyPage() {
  return (
    <LegalDoc
      title="Pool policy"
      updated="12 AUG 2026"
      sections={[
        {
          heading: "Threshold",
          body: [
            "Every pool names the minimum number of members it needs, snapshotted onto the pool when it opens. Below that at closing time, the pool is cancelled and refunded — a later policy change can never alter an in-flight pool.",
          ],
        },
        {
          heading: "Price",
          body: [
            "The price you see is the price you pay for the rest of the pool's life. If our cost to the supplier rises after you have joined, that is our loss to absorb, not yours.",
          ],
        },
        {
          heading: "Pulling out",
          body: [
            "You can withdraw for a full refund until 72 hours before the pool closes. After that point your money is treated as committed to the purchase.",
          ],
        },
        {
          heading: "Where the money sits",
          body: [
            "Members' money is held in a segregated escrow account at a licensed bank, distinct from the operating account the company runs on. It moves twice only: to the supplier once the pool funds, or back to members if the pool is cancelled.",
          ],
        },
        {
          heading: "Tolerance bands and short weight",
          body: [
            "Meat and produce pools publish a tolerance band — typically ±8% — before anyone pays. A portion that comes in under the band is credited automatically at handover, without the member needing to ask.",
          ],
        },
        {
          heading: "Allocation",
          body: [
            "Where a pool's goods do not divide into identical portions, allocation runs on a published algorithm with a seed posted before the draw runs. Any manual override requires a written reason and is published in the pool's public report.",
          ],
        },
      ]}
    />
  );
}
