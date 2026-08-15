import { redirect } from "next/navigation";

import { SupplyHeader } from "@/components/nav";
import { QuoteForm } from "@/components/staff-forms";
import { GridTable } from "@/components/ui";
import { requireRole } from "@/lib/auth/dal";
import { listOpenQuoteRequests, listPurchaseOrders } from "@/lib/domain/supply";
import { formatKobo, koboToNaira } from "@/lib/money";
import { formatSlaRemaining } from "@/lib/time";

export const metadata = { title: "Quote requests" };

export default async function QuoteRequestsPage() {
  const member = await requireRole("supplier");
  if (!member.supplierId) redirect("/supply/onboarding");

  const [requests, orders] = await Promise.all([
    listOpenQuoteRequests(),
    listPurchaseOrders(member.supplierId),
  ]);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SupplyHeader active="requests" />
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1.25fr_1fr]">
        <div className="px-5 sm:px-8 py-8 lg:border-r border-ink">
          {requests.length === 0 ? (
            <div className="border border-ink bg-card p-6">
              <div className="font-display text-[24px] tracking-tight mb-2">
                Nothing out for quote right now
              </div>
              <p className="text-[15px] text-text-dim leading-relaxed">
                We put requests out when member demand is real, not to shop around. You get a
                WhatsApp message the moment one lands in your category.
              </p>
            </div>
          ) : (
            requests.map((q) => (
              <div key={q.id} className="border border-ink bg-card mb-5">
                <div className="px-4.5 py-3.5 bg-rust text-white flex flex-wrap justify-between gap-2 font-mono text-[12px]">
                  <span>QUOTE REQUEST · {q.quoteCount} QUOTED SO FAR</span>
                  <span>EXPIRES IN {formatSlaRemaining(q.expiresAt).toUpperCase()}</span>
                </div>
                <div className="p-5">
                  <h2 className="font-display text-[26px] sm:text-[28px] tracking-tight mb-1.5">
                    {q.title}
                  </h2>
                  <p className="text-[15px] leading-relaxed text-text-dim mb-4.5">
                    {q.description}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-rule border border-rule mb-4.5">
                    <div className="bg-paper p-3.5">
                      <div className="font-mono text-[11px] text-text-dim">LAST PRICE PAID</div>
                      <div className="text-[16px] font-bold">
                        {q.lastPriceKobo ? formatKobo(q.lastPriceKobo) : "—"}
                      </div>
                    </div>
                    <div className="bg-paper p-3.5">
                      <div className="font-mono text-[11px] text-text-dim">DEPOSIT ON PO</div>
                      <div className="text-[16px] font-bold">{q.depositPct}%</div>
                    </div>
                    <div className="bg-paper p-3.5">
                      <div className="font-mono text-[11px] text-text-dim">QUOTE MUST HOLD</div>
                      <div className="text-[16px] font-bold">{q.minHoldDays} days minimum</div>
                    </div>
                  </div>

                  <QuoteForm
                    quoteRequestId={q.id}
                    lastPriceNaira={q.lastPriceKobo ? koboToNaira(q.lastPriceKobo) : null}
                    minHoldDays={q.minHoldDays}
                  />

                  <p className="font-mono text-[11.5px] leading-relaxed text-text-dim mt-3.5">
                    Price stability is one of the four things your scorecard tracks, and it affects
                    who we call first next month.
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-5 sm:px-8 py-8">
          <div className="font-bold text-[17px] mb-3.5">Your orders</div>
          {orders.length === 0 ? (
            <p className="text-[15px] text-text-dim leading-relaxed">
              No purchase orders yet. They appear here once we award you a quote.
            </p>
          ) : (
            <GridTable
              columns="1fr .9fr 1fr 1.1fr"
              headers={["PO", "ITEM", "VALUE", "STATE"]}
              fontSize={13}
              rows={orders.map((po) => [
                <a key="p" href={`/supply/orders/${po.po}`} className="underline">
                  {po.po}
                </a>,
                po.item,
                formatKobo(po.valueKobo),
                <span
                  key="b"
                  className={
                    po.state === "settled"
                      ? "text-green"
                      : po.state === "qc_failed"
                        ? "text-rust"
                        : ""
                  }
                >
                  {po.stateLabel}
                </span>,
              ])}
            />
          )}
        </div>
      </div>
    </div>
  );
}
