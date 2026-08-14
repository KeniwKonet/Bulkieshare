import { SupplyHeader } from "@/components/nav";
import { Btn, GridTable } from "@/components/ui";
import { formatNaira, PURCHASE_ORDERS, QUOTE_REQUEST } from "@/lib/mock-data";

export const metadata = { title: "Quote requests" };

export default function QuoteRequestsPage() {
  const q = QUOTE_REQUEST;
  return (
    <div className="min-h-screen bg-paper text-ink">
      <SupplyHeader active="requests" />
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1.25fr_1fr]">
        <div className="px-5 sm:px-8 py-8 lg:border-r border-ink">
          <div className="border border-ink bg-card mb-5">
            <div className="px-4.5 py-3.5 bg-rust text-white flex flex-wrap justify-between gap-2 font-mono text-[12px]">
              <span>QUOTE REQUEST · REPLY BY THU NOON</span>
              <span>EXPIRES IN {q.expiresIn.toUpperCase()}</span>
            </div>
            <div className="p-5">
              <h2 className="font-display text-[26px] sm:text-[28px] tracking-tight mb-1.5">
                {q.title}
              </h2>
              <p className="text-[15px] leading-relaxed text-text-dim mb-4.5">{q.description}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-rule border border-rule mb-4.5">
                <div className="bg-paper p-3.5">
                  <div className="font-mono text-[11px] text-text-dim">YOUR LAST PRICE</div>
                  <div className="text-[16px] font-bold">{formatNaira(q.lastPrice)} / head</div>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <div>
                  <div className="font-mono text-[11px] text-text-dim mb-1.5">YOUR PRICE PER HEAD</div>
                  <div className="border border-ink bg-paper px-4 py-3 font-mono text-[20px] font-semibold">
                    ₦271,500
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[11px] text-text-dim mb-1.5">HOLDS UNTIL</div>
                  <div className="border border-ink bg-paper px-4 py-3 font-mono text-[20px] font-semibold">
                    28 Aug
                  </div>
                </div>
              </div>
              <div className="bg-paper border border-rule p-3.5 text-[14px] leading-relaxed mb-4">
                A 1.3% increase on your last price. We will still buy, but price stability is one
                of the four things your scorecard tracks and it affects who we call first next
                month.
              </div>
              <div className="flex flex-wrap gap-2.5">
                <Btn size="lg">Send this quote</Btn>
                <Btn variant="outline" size="lg">
                  Cannot supply this week
                </Btn>
              </div>
            </div>
          </div>

          <div className="font-mono text-[11.5px] text-text-dim mb-2.5">
            ALSO OPEN, NOT YOUR CATEGORY
          </div>
          <div className="border border-rule bg-card opacity-60">
            <div className="grid grid-cols-3 text-[14px]">
              <div className="px-4 py-2.5 border-b border-rule-card">Rice, long grain 50kg</div>
              <div className="px-3 py-2.5 border-b border-rule-card font-mono">60 bags</div>
              <div className="px-3 py-2.5 border-b border-rule-card font-mono">20 Aug</div>
              <div className="px-4 py-2.5">Catfish, live 1.2kg avg</div>
              <div className="px-3 py-2.5 font-mono">250 pcs</div>
              <div className="px-3 py-2.5 font-mono">23 Aug</div>
            </div>
          </div>
        </div>

        <div className="px-5 sm:px-8 py-8">
          <div className="font-bold text-[17px] mb-3.5">Orders</div>
          <GridTable
            columns="1fr .9fr 1fr 1.1fr"
            headers={["PO", "ITEM", "VALUE", "BALANCE"]}
            fontSize={13}
            rows={PURCHASE_ORDERS.map((po) => [
              po.po,
              po.item,
              formatNaira(po.value),
              <span
                key="b"
                className={
                  po.balanceStatus.includes("due") ? "text-rust" : po.balanceStatus.includes("paid") ? "text-green" : ""
                }
              >
                {po.balanceStatus}
              </span>,
            ])}
          />
          <div className="font-bold text-[17px] mt-6 mb-3.5">Your scorecard</div>
          <div className="border border-ink bg-card p-4.5">
            <div className="flex flex-col gap-3.5">
              {[
                { label: "On time delivery", value: "94%", pct: 94 },
                { label: "Yield accuracy, promised against actual", value: "97%", pct: 97 },
                { label: "QC rejection rate", value: "6%", pct: 6, bad: true },
                { label: "Price stability, 90 days", value: "±2.1%", pct: 18 },
              ].map((m) => (
                <div key={m.label}>
                  <div className="flex justify-between text-[14.5px] mb-1.5">
                    <span>{m.label}</span>
                    <span className={`font-mono ${m.bad ? "text-rust-dark" : ""}`}>{m.value}</span>
                  </div>
                  <div className="h-2 bg-rule-card relative">
                    <div
                      className={`absolute inset-y-0 left-0 ${m.bad ? "bg-rust-dark" : "bg-ink"}`}
                      style={{ width: `${m.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[14px] leading-relaxed text-text-dim mt-4">
              One ram was rejected on 2 Aug for visible injury, photographed at intake. Two more
              rejections inside 90 days moves you out of first call for livestock.
            </p>
            <Btn variant="outline" size="sm" className="mt-3">
              See the rejection photo
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}
