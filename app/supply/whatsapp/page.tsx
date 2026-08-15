import Link from "next/link";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/dal";
import { getSupplier, listOpenQuoteRequests, listPurchaseOrders } from "@/lib/domain/supply";
import { formatKobo } from "@/lib/money";
import { formatEventStamp, formatShortDate } from "@/lib/time";

export const metadata = { title: "Supplier WhatsApp path" };

interface Message {
  from: "us" | "them";
  at: string;
  text: string;
  actions?: string[];
}

export default async function SupplierWhatsAppPage() {
  const member = await requireRole("supplier");
  if (!member.supplierId) redirect("/supply/onboarding");

  const [supplier, requests, orders] = await Promise.all([
    getSupplier(member.supplierId),
    listOpenQuoteRequests(),
    listPurchaseOrders(member.supplierId),
  ]);

  // The thread is generated from this supplier's real requests and orders, so
  // it shows what they would actually have received rather than a mock-up.
  const messages: Message[] = [];

  for (const q of requests.slice(0, 1)) {
    messages.push({
      from: "us",
      at: formatEventStamp(q.expiresAt),
      text: `Good morning. ${q.title}. ${
        q.lastPriceKobo ? `Your last price was ${formatKobo(q.lastPriceKobo)}. ` : ""
      }Reply with your price and how many days it holds.`,
    });
  }

  for (const po of orders.slice(0, 3).reverse()) {
    messages.push({
      from: "us",
      at: formatEventStamp(po.createdAt),
      text: `${po.po} issued. ${formatKobo(po.depositKobo)} deposit sent${
        supplier?.bankName ? ` to ${supplier.bankName}` : ""
      }. Deliver ${po.item}. Reply DONE when loaded.`,
      actions: ["DONE", "DELAY", "SEE PO"],
    });

    if (po.deliveredAt) {
      messages.push({
        from: "them",
        at: formatEventStamp(po.deliveredAt),
        text: "DONE",
      });
    }

    if (po.settledAt) {
      messages.push({
        from: "us",
        at: formatEventStamp(po.settledAt),
        text: `QC passed on ${po.po}. Balance of ${formatKobo(po.balanceKobo)} sent ${formatShortDate(po.settledAt)}.`,
      });
    } else if (po.state === "qc_failed") {
      messages.push({
        from: "us",
        at: formatEventStamp(po.createdAt),
        text: `${po.po} settled short. ${po.qcNote ?? "Part of the delivery was rejected at intake."}`,
      });
    }
  }

  return (
    <div className="min-h-screen bg-paper text-ink flex items-center justify-center py-10 px-5">
      <div className="max-w-[420px] w-full">
        <p className="text-[13.5px] text-text-dim mb-3">
          <Link href="/supply/requests" className="underline">
            ← Back to the portal
          </Link>{" "}
          · what most suppliers actually use
        </p>

        <div className="border border-dark-rule bg-ink text-paper flex flex-col min-h-[600px]">
          <div className="px-4.5 py-3.5 border-b border-dark-rule-2 flex justify-between items-center">
            <span className="text-[15px] font-semibold">BulkieShare Supply</span>
            <span className="font-mono text-[11px] text-dark-dim-2">
              {supplier?.whatsappOptIn ? "OPTED IN" : "BUSINESS ACCOUNT"}
            </span>
          </div>

          <div className="p-4.5 flex flex-col gap-3">
            {messages.length === 0 ? (
              <p className="text-[14.5px] leading-relaxed text-dark-dim">
                Nothing sent yet. Once we put a request out or issue you a purchase order, the
                whole exchange happens here as well as in the portal.
              </p>
            ) : (
              messages.map((m, i) => (
                <div
                  key={i}
                  className={
                    m.from === "them"
                      ? "bg-[#243024] self-end max-w-[80%] px-3.5 py-3 text-[14.5px] leading-relaxed"
                      : "bg-[#1E1E1C] border-l-[3px] border-lime px-3.5 py-3 text-[14.5px] leading-relaxed"
                  }
                >
                  <div className="font-mono text-[10.5px] text-dark-dim-2 mb-1.5">{m.at}</div>
                  {m.text}
                  {m.actions && (
                    <div className="flex gap-1.5 mt-3">
                      {m.actions.map((a) => (
                        <span
                          key={a}
                          className="flex-1 text-center border border-dark-rule-2 py-2 text-[13px] font-semibold"
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="mt-auto px-4.5 py-4 border-t border-dark-rule-2">
            <p className="font-mono text-[11px] leading-relaxed text-dark-dim-2">
              Every message here writes to the same records as the portal. A supplier who never
              opens a browser still has a full audit trail, a scorecard and a payout history.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
