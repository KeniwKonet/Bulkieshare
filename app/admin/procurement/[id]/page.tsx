import Link from "next/link";
import { notFound } from "next/navigation";

import { OpsHeader } from "@/components/nav";
import { AwardQuoteButton, CancelRfqButton } from "@/components/ops-forms";
import { StatGrid, Tag } from "@/components/ui";
import { requireOps } from "@/lib/auth/dal";
import { getQuoteRequestById, listQuotesFor } from "@/lib/domain/procurement";
import { getPool } from "@/lib/domain/pools";
import { listPurchaseOrders } from "@/lib/domain/supply";
import { formatBasisPoints, formatKobo } from "@/lib/money";
import { formatEventStamp } from "@/lib/time";

export const metadata = { title: "Quote request" };

export default async function QuoteRequestDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireOps();

  const request = await getQuoteRequestById(id);
  if (!request) notFound();

  const [quotes, pool, orders] = await Promise.all([
    listQuotesFor(request.id),
    request.poolId ? getPool(request.poolId) : Promise.resolve(null),
    listPurchaseOrders(),
  ]);

  const awarded = quotes.find((q) => q.isAwarded);
  const isSettled = request.state === "awarded";
  // The order this request produced, so the page can hand ops onward to intake.
  const order = awarded
    ? orders.find((o) => o.supplierId === awarded.supplierId && o.poolId === request.poolId)
    : null;

  const best = quotes[0] ?? null;
  const depositOnBest = best ? Math.round((best.totalKobo * request.depositPct) / 100) : 0;
  const collectedKobo = pool ? pool.paidSlots * pool.pricePerSlotKobo : 0;

  return (
    <div className="min-h-screen bg-paper text-ink">
      <OpsHeader active="procurement" />
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-8">
        <div className="flex justify-between items-start mb-5 flex-wrap gap-3">
          <div>
            <div className="font-mono text-[11.5px] text-text-dim mb-1">
              <Link href="/admin/procurement" className="underline">
                BUYING
              </Link>{" "}
              / {request.quantity} × {request.title.toUpperCase()}
            </div>
            <h1 className="font-display text-[30px] tracking-tight">{request.title}</h1>
            <p className="text-[14.5px] text-text-dim mt-1">
              {request.quantity} needed
              {request.hubName ? ` · deliver to ${request.hubName}` : ""}
              {pool ? ` · for #${pool.code}, shares ${pool.shareDateLabel}` : ""}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Tag
              tone={
                isSettled ? "green" : request.hasExpired ? "outline" : quotes.length ? "amber" : "rust"
              }
            >
              {isSettled
                ? "AWARDED"
                : request.hasExpired
                  ? "CLOSED"
                  : request.expiryLabel.toUpperCase()}
            </Tag>
            {!isSettled && <CancelRfqButton quoteRequestId={request.id} />}
          </div>
        </div>

        {request.description && (
          <p className="text-[15px] leading-relaxed text-text-mid max-w-[64ch] mb-5">
            {request.description}
          </p>
        )}

        <StatGrid
          columns={4}
          items={[
            { label: "QUOTES IN", value: String(quotes.length) },
            {
              label: "BEST PRICE, ALL IN",
              value: best ? formatKobo(best.totalKobo) : "—",
              sub: best ? `${formatKobo(best.priceKobo)} each` : undefined,
            },
            {
              label: `DEPOSIT AT ${request.depositPct}%`,
              value: best ? formatKobo(depositOnBest) : "—",
              sub: "due on award",
            },
            {
              label: pool ? "COLLECTED FROM MEMBERS" : "LAST PRICE PAID",
              value: pool
                ? formatKobo(collectedKobo)
                : request.lastPriceKobo
                  ? formatKobo(request.lastPriceKobo)
                  : "—",
              valueClassName:
                pool && best && best.totalKobo > collectedKobo ? "text-rust-dark" : undefined,
              sub: pool && best && best.totalKobo > collectedKobo ? "cheapest quote exceeds it" : undefined,
            },
          ]}
        />

        {pool && best && best.totalKobo > collectedKobo && (
          <div className="border border-rust-dark bg-card p-4 mt-5">
            <div className="font-mono text-[11.5px] text-rust-dark mb-1">CHECK THIS FIRST</div>
            <p className="text-[14.5px] leading-relaxed text-text-mid">
              The cheapest quote is {formatKobo(best.totalKobo - collectedKobo)} more than{" "}
              {pool.code} collected. Awarding it buys at a loss unless the difference is a margin
              you meant to give up.
            </p>
          </div>
        )}

        {isSettled && awarded && (
          <div className="border border-green bg-card p-4 mt-5">
            <div className="font-mono text-[11.5px] text-green mb-1">AWARDED</div>
            <p className="text-[14.5px] leading-relaxed">
              {awarded.supplierName} at {formatKobo(awarded.totalKobo)}
              {order ? (
                <>
                  {" "}
                  ·{" "}
                  <Link href={`/admin/intake/${order.po}`} className="underline font-semibold">
                    {order.po}
                  </Link>{" "}
                  is {order.stateLabel}
                </>
              ) : null}
              .
            </p>
          </div>
        )}

        <div className="font-mono text-[11.5px] text-text-dim mt-8 mb-2.5">
          QUOTES · CHEAPEST FIRST
        </div>

        {quotes.length === 0 ? (
          <div className="border border-ink bg-card px-5 py-10 text-center">
            <div className="font-display text-[22px] tracking-tight mb-1.5">Nobody has quoted</div>
            <p className="text-[14.5px] text-text-dim max-w-[52ch] mx-auto">
              Approved suppliers can see this request. If it is urgent, WhatsApp them — the reply
              lands here either way.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {quotes.map((q) => (
              <div
                key={q.id}
                className={`border bg-card p-4.5 ${
                  q.isAwarded ? "border-green" : q.isBlocked ? "border-rust-dark" : "border-ink"
                }`}
              >
                <div className="flex justify-between items-start gap-4 flex-wrap mb-3">
                  <div>
                    <Link
                      href={`/admin/suppliers/${q.supplierId}`}
                      className="font-display text-[21px] tracking-tight underline"
                    >
                      {q.supplierName}
                    </Link>
                    <div className="font-mono text-[11.5px] text-text-dim mt-0.5">
                      quoted {formatEventStamp(q.createdAt)} · holds {q.holdDays} days
                      {!q.meetsHoldRequirement && (
                        <span className="text-rust-dark">
                          {" "}
                          · short of the {request.minHoldDays} we asked for
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-[26px]">{formatKobo(q.totalKobo)}</div>
                    <div className="font-mono text-[11.5px] text-text-dim">
                      {formatKobo(q.priceKobo)} each
                      {q.aboveBestBasisPoints > 0 && (
                        <span className="text-rust">
                          {" "}
                          · {formatBasisPoints(q.aboveBestBasisPoints)} above best
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-rule border border-rule mb-3">
                  {[
                    { label: "ON TIME", value: `${q.onTimePct}%`, bad: q.onTimePct < 90 },
                    { label: "YIELD", value: `${q.yieldAccuracyPct}%`, bad: q.yieldAccuracyPct < 90 },
                    { label: "REJECTS", value: `${q.rejectRatePct}%`, bad: q.rejectRatePct > 5 },
                    { label: "DELIVERED", value: String(q.ordersDelivered), bad: false },
                  ].map((m) => (
                    <div key={m.label} className="bg-paper p-2.5">
                      <div className="font-mono text-[10.5px] text-text-dim">{m.label}</div>
                      <div className={`text-[15px] font-bold ${m.bad ? "text-rust-dark" : ""}`}>
                        {m.value}
                      </div>
                    </div>
                  ))}
                </div>

                {q.note && (
                  <p className="text-[14px] leading-relaxed text-text-mid border-l-2 border-rule pl-3 mb-3">
                    {q.note}
                  </p>
                )}

                {q.isAwarded ? (
                  <Tag tone="green">AWARDED</Tag>
                ) : isSettled ? (
                  <span className="font-mono text-[11.5px] text-text-dim">not awarded</span>
                ) : (
                  <AwardQuoteButton
                    quoteId={q.id}
                    supplierName={q.supplierName}
                    totalKobo={q.totalKobo}
                    blocked={q.isBlocked}
                  />
                )}

                {q.isBlocked && !isSettled && (
                  <p className="font-mono text-[11px] text-rust-dark mt-2 leading-relaxed">
                    Approve them and add bank details before this quote can be awarded.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        <p className="font-mono text-[11.5px] leading-relaxed text-text-dim mt-6 border-t border-rule pt-4">
          Awarding issues the purchase order, releases the deposit, and records the supplier
          against the pool. It cannot be undone from here.
        </p>
      </div>
    </div>
  );
}
