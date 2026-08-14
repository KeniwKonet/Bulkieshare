import { SitePage } from "@/components/nav";
import { Btn, StatGrid } from "@/components/ui";

export const metadata = { title: "For groups and cooperatives" };

export default function GroupsAcquisitionPage() {
  return (
    <SitePage>
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-10">
        <span className="font-mono text-[12.5px] font-semibold bg-ink text-lime px-2.5 py-1.5">
          FOR COORDINATORS
        </span>
        <h1 className="font-display text-[38px] sm:text-[48px] tracking-tight leading-[1.02] mt-4 mb-4">
          Bring twelve people, run one pool, do the maths once.
        </h1>
        <p className="text-[16.5px] leading-relaxed text-text-mid max-w-[58ch] mb-8">
          If you run a cooperative, church group, estate association or office, you can open
          pools for your members from a catalogue we already have a quote for, collect their
          payments in one place, and earn a fee on every pool that completes.
        </p>

        <StatGrid
          columns={3}
          items={[
            { label: "fee per slot, paid on completion", value: "₦300" },
            { label: "VAT withheld and remitted for you", value: "7.5%" },
            { label: "minimum group size to open a pool", value: "10" },
          ]}
        />

        <div className="mt-8 flex flex-col gap-4">
          <div className="flex gap-3.5">
            <span className="font-display text-[26px] text-text-faint w-10 flex-shrink-0">01</span>
            <div>
              <div className="text-[17px] font-bold">Pick an item from our catalogue</div>
              <p className="text-[14.5px] text-text-dim leading-relaxed">
                You cannot set a price or invent an item — you pool from what we already hold a
                quote for, so nobody ever promises a price we have not bought at.
              </p>
            </div>
          </div>
          <div className="flex gap-3.5">
            <span className="font-display text-[26px] text-text-faint w-10 flex-shrink-0">02</span>
            <div>
              <div className="text-[17px] font-bold">Collect from your members, transfer once</div>
              <p className="text-[14.5px] text-text-dim leading-relaxed">
                Take cash or transfers from your group in whatever way works for you, then send
                one payment to fund the pool.
              </p>
            </div>
          </div>
          <div className="flex gap-3.5">
            <span className="font-display text-[26px] text-text-faint w-10 flex-shrink-0">03</span>
            <div>
              <div className="text-[17px] font-bold">Get paid when it completes</div>
              <p className="text-[14.5px] text-text-dim leading-relaxed">
                Your fee is paid when the pool completes, not when it fills. A cancelled pool
                earns nothing — that is deliberate.
              </p>
            </div>
          </div>
        </div>

        <Btn href="/groups/gwarinpa-womens-coop" size="xl" className="mt-9">
          See a coordinator dashboard
        </Btn>
      </div>
    </SitePage>
  );
}
