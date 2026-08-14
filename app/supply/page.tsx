import { SitePage } from "@/components/nav";
import { Btn, StatGrid } from "@/components/ui";

export const metadata = { title: "For suppliers" };

export default function SupplyAcquisitionPage() {
  return (
    <SitePage>
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-10">
        <span className="font-mono text-[12.5px] font-semibold bg-ink text-lime px-2.5 py-1.5">
          FOR SUPPLIERS
        </span>
        <h1 className="font-display text-[38px] sm:text-[48px] tracking-tight leading-[1.02] mt-4 mb-4">
          We buy in whole animals and whole bags, and we pay on time.
        </h1>
        <p className="text-[16.5px] leading-relaxed text-text-mid max-w-[58ch] mb-8">
          Quote a price, we open a pool against it. If it fills you get a purchase order and a
          deposit before you move anything. Everything here also works over WhatsApp — a portal
          is not required to sell to us.
        </p>

        <StatGrid
          columns={3}
          items={[
            { label: "deposit on PO, before delivery", value: "40%" },
            { label: "balance after QC passes at the hub", value: "48h" },
            { label: "minimum a quote must hold", value: "7d" },
          ]}
        />

        <div className="mt-8 flex flex-col gap-4">
          <div className="flex gap-3.5">
            <span className="font-display text-[26px] text-text-faint w-10 flex-shrink-0">01</span>
            <div>
              <div className="text-[17px] font-bold">A field agent visits once</div>
              <p className="text-[14.5px] text-text-dim leading-relaxed">
                Site photos, bank details, and your account name resolved against your BVN, so
                payment is never blocked later.
              </p>
            </div>
          </div>
          <div className="flex gap-3.5">
            <span className="font-display text-[26px] text-text-faint w-10 flex-shrink-0">02</span>
            <div>
              <div className="text-[17px] font-bold">We send demand, you send a price</div>
              <p className="text-[14.5px] text-text-dim leading-relaxed">
                By WhatsApp or the portal. State your price and how many days it holds — we open
                the pool against it the same day.
              </p>
            </div>
          </div>
          <div className="flex gap-3.5">
            <span className="font-display text-[26px] text-text-faint w-10 flex-shrink-0">03</span>
            <div>
              <div className="text-[17px] font-bold">Deliver, get paid, build a track record</div>
              <p className="text-[14.5px] text-text-dim leading-relaxed">
                40% up front, balance within 48 hours of QC passing. Your scorecard tracks on-time
                delivery, yield accuracy and price stability.
              </p>
            </div>
          </div>
        </div>

        <Btn href="/supply/requests" size="xl" className="mt-9">
          See the supplier portal
        </Btn>
      </div>
    </SitePage>
  );
}
