import Link from "next/link";

import { OpsHeader } from "@/components/nav";
import { Btn, GridTable, StatGrid } from "@/components/ui";
import { requireOps } from "@/lib/auth/dal";
import { listQuoteRequests } from "@/lib/domain/procurement";
import { listAllPools } from "@/lib/domain/pools";
import { listPurchaseOrders } from "@/lib/domain/supply";
import { formatKobo } from "@/lib/money";

export const metadata = { title: "Buying" };

export default async function ProcurementBoard() {
  await requireOps();

  const [requests, pools, orders] = await Promise.all([
    listQuoteRequests(),
    listAllPools(),
    listPurchaseOrders(),
  ]);

  const live = requests.filter((r) => r.state === "open" || r.state === "quoted");
  const awaitingDecision = live.filter((r) => r.quoteCount > 0);
  const noQuotesYet = live.filter((r) => r.quoteCount === 0);
  const closingSoon = live.filter((r) => !r.hasExpired && r.expiresInHours < 24);

  // A funded pool with nothing on order is the thing that quietly goes wrong:
  // members have paid and nobody has bought anything yet.
  const orderedPoolIds = new Set(orders.map((o) => o.poolId).filter(Boolean));
  const requestedPoolIds = new Set(live.map((r) => r.poolId).filter(Boolean));
  const unbought = pools.filter(
    (p) =>
      p.state === "funded" && !orderedPoolIds.has(p.id) && !requestedPoolIds.has(p.id),
  );

  const committedKobo = orders
    .filter((o) => o.state !== "settled" && o.state !== "cancelled")
    .reduce((sum, o) => sum + o.valueKobo, 0);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <OpsHeader active="procurement" />

      <StatGrid
        columns={4}
        items={[
          {
            label: "AWAITING YOUR DECISION",
            value: String(awaitingDecision.length),
            valueClassName: awaitingDecision.length > 0 ? "text-rust-dark" : undefined,
            sub: "quotes in, nothing awarded",
          },
          { label: "OUT FOR QUOTE", value: String(noQuotesYet.length), sub: "no replies yet" },
          {
            label: "FUNDED, NOTHING ORDERED",
            value: String(unbought.length),
            valueClassName: unbought.length > 0 ? "text-rust-dark" : undefined,
            sub: "members have paid",
          },
          { label: "COMMITTED TO SUPPLIERS", value: formatKobo(committedKobo) },
        ]}
      />

      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-8">
        <div className="flex justify-between items-end mb-5 flex-wrap gap-3">
          <div>
            <h1 className="font-display text-[26px] tracking-tight">Buying</h1>
            <p className="text-[14.5px] text-text-dim mt-1 max-w-[62ch]">
              A pool that funds is a promise to forty people. This is where that promise turns into
              an order.
            </p>
          </div>
          <Btn href="/admin/procurement/new" variant="dark" size="md">
            Request quotes
          </Btn>
        </div>

        {unbought.length > 0 && (
          <div className="border border-rust-dark bg-card p-4 mb-5">
            <div className="font-mono text-[11.5px] text-rust-dark mb-2.5">
              FUNDED WITH NOTHING ON ORDER · {unbought.length}
            </div>
            <div className="flex flex-col gap-2.5">
              {unbought.map((p) => (
                <div key={p.id} className="flex justify-between items-center gap-3 flex-wrap">
                  <div>
                    <span className="font-semibold text-[15.5px]">{p.title}</span>
                    <div className="font-mono text-[12px] text-text-dim">
                      #{p.code} · {p.hubName} · {formatKobo(p.paidSlots * p.pricePerSlotKobo)}{" "}
                      collected · shares {p.shareDateLabel}
                    </div>
                  </div>
                  <Btn href={`/admin/procurement/new?pool=${p.id}`} size="sm">
                    Request quotes
                  </Btn>
                </div>
              ))}
            </div>
          </div>
        )}

        {closingSoon.length > 0 && (
          <p className="font-mono text-[11.5px] text-amber mb-4">
            {closingSoon.length} request{closingSoon.length === 1 ? "" : "s"} stop accepting quotes
            within a day.
          </p>
        )}

        {requests.length === 0 ? (
          <div className="border border-ink bg-card px-6 py-14 text-center">
            <div className="font-display text-[24px] tracking-tight mb-2">
              Nothing out for quote
            </div>
            <p className="text-[15px] text-text-dim max-w-[54ch] mx-auto mb-4">
              Ask suppliers for a price when a pool funds, or ahead of one you expect to fill.
            </p>
            <Btn href="/admin/procurement/new" size="md">
              Request quotes
            </Btn>
          </div>
        ) : (
          <GridTable
            columns="1.6fr .7fr .8fr 1fr .9fr .9fr"
            headers={["REQUEST", "QTY", "QUOTES", "BEST PRICE", "CLOSES", "STATE"]}
            fontSize={13}
            rows={requests.map((r) => [
              <Link key="t" href={`/admin/procurement/${r.id}`} className="underline font-semibold">
                {r.title}
                {r.poolCode ? (
                  <span className="font-mono text-[11.5px] text-text-dim"> · #{r.poolCode}</span>
                ) : null}
              </Link>,
              String(r.quantity),
              <span key="q" className={r.quoteCount === 0 ? "text-text-dim" : ""}>
                {r.quoteCount}
              </span>,
              r.bestPriceKobo ? formatKobo(r.bestPriceKobo) : "—",
              <span key="c" className={r.hasExpired ? "text-rust-dark" : ""}>
                {r.hasExpired ? "closed" : r.expiryLabel}
              </span>,
              <span
                key="s"
                className={
                  r.state === "awarded"
                    ? "text-green"
                    : r.state === "expired"
                      ? "text-text-dim"
                      : "text-rust"
                }
              >
                {r.state}
              </span>,
            ])}
            footer={`${live.length} live · ${requests.filter((r) => r.state === "awarded").length} awarded`}
          />
        )}
      </div>
    </div>
  );
}
