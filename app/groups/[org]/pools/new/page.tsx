import { GroupsShell } from "@/components/nav";
import { Btn } from "@/components/ui";
import { Stepper } from "@/components/interactive";

export const metadata = { title: "Open a pool" };

export default async function OpenPoolPage({ params }: { params: Promise<{ org: string }> }) {
  const { org } = await params;
  return (
    <GroupsShell org={org} orgName="Gwarinpa Women's Cooperative" active="new">
      <div className="max-w-xl">
        <div className="flex justify-between items-center mb-5">
          <h1 className="font-display text-[26px] tracking-tight">Open a pool for the group</h1>
          <span className="font-mono text-[11.5px] text-text-dim">STEP 2 OF 3</span>
        </div>

        <h2 className="font-display text-[28px] tracking-tight mb-2">Rice, 50kg long grain</h2>
        <p className="text-[15px] leading-relaxed text-text-dim mb-5">
          You pick from what we already have a quote for. You cannot set the price or invent an
          item, because a coordinator promising a price we have not bought at is how this
          business ends.
        </p>

        <div className="border border-ink bg-card mb-5">
          <div className="flex justify-between px-4 py-3 border-b border-rule-card text-[15px]">
            <span className="text-text-dim">Price per slot, fixed by us</span>
            <span className="font-mono font-semibold">₦62,000</span>
          </div>
          <div className="flex justify-between px-4 py-3 border-b border-rule-card text-[15px]">
            <span className="text-text-dim">Quote from Karu Grains holds until</span>
            <span className="font-mono font-semibold">Fri 22 Aug 09:00</span>
          </div>
          <div className="flex justify-between px-4 py-3 text-[15px]">
            <span className="text-text-dim">So your pool must close by</span>
            <span className="font-mono font-semibold">Thu 21 Aug 18:00</span>
          </div>
        </div>

        <div className="font-mono text-[11.5px] text-text-dim mb-3">YOUR CHOICES</div>
        <div className="flex flex-col gap-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-[15px] font-semibold">How many slots?</span>
              <Stepper min={10} max={31} />
            </div>
            <p className="font-mono text-[11px] text-text-dim">
              10 minimum · your group has 31 members
            </p>
          </div>
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[15px] font-semibold">Minimum to go ahead</span>
              <span className="font-mono text-[15px] font-semibold">12</span>
            </div>
            <p className="text-[13.5px] leading-relaxed text-text-dim">
              Below twelve the haulage does not pay for itself. We set the floor, you can raise
              it.
            </p>
          </div>
          <div className="border border-ink bg-card p-4">
            <div className="text-[15px] font-semibold mb-2">Your fee, ₦300 a slot</div>
            <div className="flex gap-2">
              <span className="flex-1 border-2 border-ink bg-lime px-3 py-2.5 text-center text-[14px] font-bold">
                ₦4,200 to my bank
              </span>
              <span className="flex-1 border border-ink px-3 py-2.5 text-center text-[14px] font-semibold">
                A free slot instead
              </span>
            </div>
            <p className="font-mono text-[11px] leading-relaxed text-text-dim mt-2.5">
              Paid when the pool completes, not when it fills. 7.5% VAT is withheld and remitted.
              Members see this fee on the pool page.
            </p>
          </div>
        </div>

        <div className="flex gap-2.5 mt-7">
          <Btn variant="outline" size="lg">
            Back
          </Btn>
          <Btn href={`/groups/${org}/pools/a-2231`} size="lg" block>
            Review and open to 31 members
          </Btn>
        </div>
      </div>
    </GroupsShell>
  );
}
