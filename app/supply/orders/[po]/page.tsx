import { notFound, redirect } from "next/navigation";

import { SupplyHeader } from "@/components/nav";
import { MarkDeliveredButton } from "@/components/staff-forms";
import { PhotoPlaceholder, Tag } from "@/components/ui";
import { requireRole } from "@/lib/auth/dal";
import { getPurchaseOrder } from "@/lib/domain/supply";
import { formatKobo } from "@/lib/money";
import { formatShortDate } from "@/lib/time";

export const metadata = { title: "Purchase order" };

export default async function OrderPage({ params }: { params: Promise<{ po: string }> }) {
  const { po } = await params;
  const member = await requireRole("supplier");
  if (!member.supplierId) redirect("/supply/onboarding");

  const order = await getPurchaseOrder(po);
  if (!order) notFound();

  // A supplier only ever sees their own orders; ops has its own intake screen.
  const isOps = member.role === "ops" || member.role === "admin";
  if (order.supplierId !== member.supplierId && !isOps) notFound();

  const tone =
    order.state === "settled" ? "green" : order.state === "qc_failed" ? "rust" : "amber";

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SupplyHeader active="orders" />
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-8">
        <div className="flex justify-between items-start mb-5 flex-wrap gap-3">
          <div>
            <div className="font-mono text-[12px] text-text-dim mb-1">{order.po}</div>
            <h1 className="font-display text-[30px] tracking-tight">{order.item}</h1>
          </div>
          <Tag tone={tone}>{order.stateLabel.toUpperCase()}</Tag>
        </div>

        <div className="border border-ink bg-card mb-5">
          <div className="grid grid-cols-1 sm:grid-cols-3">
            <div className="p-4 sm:border-r border-b sm:border-b-0 border-rule-card">
              <div className="font-mono text-[11px] text-text-dim">PO VALUE</div>
              <div className="text-[19px] font-bold">{formatKobo(order.valueKobo)}</div>
            </div>
            <div className="p-4 sm:border-r border-b sm:border-b-0 border-rule-card">
              <div className="font-mono text-[11px] text-text-dim">DEPOSIT SENT</div>
              <div className="text-[19px] font-bold text-green">
                {formatKobo(order.depositKobo)}
              </div>
            </div>
            <div className="p-4">
              <div className="font-mono text-[11px] text-text-dim">BALANCE</div>
              <div className="text-[19px] font-bold">
                {formatKobo(order.balanceKobo)}
                {order.settledAt && (
                  <span className="text-[13px] text-green"> · paid {formatShortDate(order.settledAt)}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {order.qcNote && (
          <div className="border border-rust bg-card p-4 mb-5">
            <div className="font-mono text-[11.5px] text-rust mb-1">QC NOTE</div>
            <p className="text-[14.5px] leading-relaxed">{order.qcNote}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <PhotoPlaceholder caption="weighbridge ticket" height={130} align="end" />
          <PhotoPlaceholder caption="goods at intake, tags visible" height={130} align="end" />
        </div>

        <div className="border border-ink bg-card p-5">
          <div className="font-bold text-[16px] mb-3">Delivery</div>
          <p className="text-[14.5px] leading-relaxed text-text-dim mb-4">
            {order.deliveredAt
              ? `Delivered ${formatShortDate(order.deliveredAt)}. The balance of ${formatKobo(order.balanceKobo)} pays within 48 hours of QC passing.`
              : `Deliver to the yard named on the PO. The balance of ${formatKobo(order.balanceKobo)} pays within 48 hours of QC passing.`}
          </p>

          {!order.deliveredAt && order.state !== "settled" && (
            <MarkDeliveredButton po={order.po} />
          )}
        </div>
      </div>
    </div>
  );
}
