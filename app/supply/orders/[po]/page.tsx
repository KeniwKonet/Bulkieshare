import { SupplyHeader } from "@/components/nav";
import { Btn, PhotoPlaceholder, Tag } from "@/components/ui";
import { formatNaira } from "@/lib/mock-data";

export const metadata = { title: "Purchase order" };

export default async function OrderPage({ params }: { params: Promise<{ po: string }> }) {
  const { po } = await params;
  return (
    <div className="min-h-screen bg-paper text-ink">
      <SupplyHeader active="orders" />
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-8">
        <div className="flex justify-between items-start mb-5 flex-wrap gap-3">
          <div>
            <div className="font-mono text-[12px] text-text-dim mb-1">{po.toUpperCase()}</div>
            <h1 className="font-display text-[30px] tracking-tight">2 head of cattle, 220kg+</h1>
          </div>
          <Tag tone="amber">DEPOSIT PAID · BALANCE DUE ON QC</Tag>
        </div>

        <div className="border border-ink bg-card mb-5">
          <div className="grid grid-cols-1 sm:grid-cols-3">
            <div className="p-4 sm:border-r border-b sm:border-b-0 border-rule-card">
              <div className="font-mono text-[11px] text-text-dim">PO VALUE</div>
              <div className="text-[19px] font-bold">{formatNaira(271500)}</div>
            </div>
            <div className="p-4 sm:border-r border-b sm:border-b-0 border-rule-card">
              <div className="font-mono text-[11px] text-text-dim">DEPOSIT SENT</div>
              <div className="text-[19px] font-bold text-green">{formatNaira(108600)}</div>
            </div>
            <div className="p-4">
              <div className="font-mono text-[11px] text-text-dim">DELIVER BY</div>
              <div className="text-[19px] font-bold">Thu 21 Aug, 08:00</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <PhotoPlaceholder caption="weighbridge ticket" height={130} align="end" />
          <PhotoPlaceholder caption="both animals, tags visible" height={130} align="end" />
        </div>

        <div className="border border-ink bg-card p-5">
          <div className="font-bold text-[16px] mb-3">Delivery</div>
          <p className="text-[14.5px] leading-relaxed text-text-dim mb-4">
            Deliver to Kuje yard before 08:00 on Thursday 21 August. Balance of{" "}
            {formatNaira(162900)} pays within 48 hours of QC passing.
          </p>
          <div className="flex flex-wrap gap-2.5">
            <Btn size="md">Mark as delivered</Btn>
            <Btn variant="outline" size="md">
              Request a delay
            </Btn>
            <Btn variant="outline" size="md">
              Download PO
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}
