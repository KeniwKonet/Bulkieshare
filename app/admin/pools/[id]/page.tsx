import Link from "next/link";
import { notFound } from "next/navigation";

import { OpsHeader } from "@/components/nav";
import { RefundPoolButton } from "@/components/staff-forms";
import { Btn, GridTable, ProgressBar, StatGrid, Tag } from "@/components/ui";
import { requireOps } from "@/lib/auth/dal";
import { getPool, getPoolReport, getPoolRoster, getPoolTimeline } from "@/lib/domain/pools";
import { listQuoteRequests } from "@/lib/domain/procurement";
import { listPurchaseOrders } from "@/lib/domain/supply";
import { formatKobo } from "@/lib/money";
import { formatEventStamp, secondsUntil } from "@/lib/time";

export const metadata = { title: "Pool" };

export default async function AdminPoolDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireOps();

  const pool = await getPool(id);
  if (!pool) notFound();

  const [roster, timeline, report, orders, requests] = await Promise.all([
    getPoolRoster(pool.id),
    getPoolTimeline(pool.id),
    getPoolReport(pool.id),
    listPurchaseOrders(),
    listQuoteRequests(),
  ]);

  const poolOrders = orders.filter((o) => o.poolId === pool.id);
  const poolRequests = requests.filter((r) => r.poolId === pool.id);
  const liveRequest = poolRequests.find((r) => r.state === "open" || r.state === "quoted");

  const collectedKobo = pool.paidSlots * pool.pricePerSlotKobo;
  const holdingKobo = pool.holdingSlots * pool.pricePerSlotKobo;
  const committedKobo = poolOrders.reduce((sum, o) => sum + o.valueKobo, 0);
  const marginKobo = collectedKobo - committedKobo;
  const collected = roster.paid.filter((p) => (p.state === "collected")).length;

  const needsBuying = pool.state === "funded" && poolOrders.length === 0 && !liveRequest;

  return (
    <div className="min-h-screen bg-paper text-ink">
      <OpsHeader active="pools" />
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-8">
        <div className="flex justify-between items-start mb-5 flex-wrap gap-3">
          <div>
            <div className="font-mono text-[11.5px] text-text-dim mb-1">
              <Link href="/admin/pools" className="underline">
                POOLS
              </Link>{" "}
              / #{pool.code}
            </div>
            <h1 className="font-display text-[30px] tracking-tight">{pool.title}</h1>
            <p className="text-[14.5px] text-text-dim mt-1">
              {pool.hubName} · shares {pool.shareDateLabel}
              {pool.supplierName ? ` · supplied by ${pool.supplierName}` : " · no supplier yet"}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Tag
              tone={
                pool.state === "completed"
                  ? "green"
                  : pool.state === "underfilled" || pool.state === "refunding"
                    ? "rust"
                    : pool.isOpen
                      ? "lime"
                      : "amber"
              }
            >
              {pool.state.toUpperCase()}
            </Tag>
            <Link
              href={`/${pool.areaSlug}/pools/${pool.id}`}
              className="font-mono text-[11.5px] border border-ink px-2.5 py-1.5"
            >
              see the public page
            </Link>
          </div>
        </div>

        {needsBuying && (
          <div className="border border-rust-dark bg-card p-4 mb-5 flex justify-between items-center gap-4 flex-wrap">
            <div>
              <div className="font-mono text-[11.5px] text-rust-dark mb-1">
                FUNDED, NOTHING ON ORDER
              </div>
              <p className="text-[14.5px] leading-relaxed text-text-mid max-w-[54ch]">
                {formatKobo(collectedKobo)} has been collected from {roster.paid.length} people who
                expect food on {pool.shareDateLabel}. Nobody has been asked to supply it.
              </p>
            </div>
            <Btn href={`/admin/procurement/new?pool=${pool.id}`} size="md" variant="dark">
              Request quotes
            </Btn>
          </div>
        )}

        <div className="border border-ink bg-card p-5 mb-5">
          <div className="flex justify-between items-baseline mb-2 flex-wrap gap-2">
            <span className="font-display text-[26px]">
              {pool.paidSlots} / {pool.totalSlots} paid
            </span>
            <span className="font-mono text-[12.5px] text-text-dim">
              threshold {pool.threshold} ·{" "}
              {pool.isOpen ? `closes ${pool.closesAtLabel}` : pool.closesAtLabel}
            </span>
          </div>
          <ProgressBar
            paidPct={(pool.paidSlots / pool.totalSlots) * 100}
            reservedPct={(pool.holdingSlots / pool.totalSlots) * 100}
            thresholdPct={(pool.threshold / pool.totalSlots) * 100}
            height={16}
          />
        </div>

        <StatGrid
          columns={4}
          items={[
            { label: "COLLECTED", value: formatKobo(collectedKobo) },
            {
              label: "ON HOLD, UNPAID",
              value: formatKobo(holdingKobo),
              valueClassName: holdingKobo > 0 ? "text-rust" : undefined,
            },
            { label: "COMMITTED TO SUPPLIERS", value: formatKobo(committedKobo) },
            {
              label: marginKobo >= 0 ? "MARGIN" : "SHORTFALL",
              value: formatKobo(Math.abs(marginKobo)),
              valueClassName: marginKobo < 0 ? "text-rust-dark" : undefined,
              sub: committedKobo === 0 ? "nothing ordered yet" : undefined,
            },
          ]}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
          <div className="border border-ink bg-card p-4.5">
            <div className="font-mono text-[11.5px] text-text-dim mb-3">BUYING</div>
            {poolRequests.length === 0 && poolOrders.length === 0 ? (
              <p className="text-[14.5px] text-text-dim leading-relaxed">
                Nothing requested or ordered for this pool.
              </p>
            ) : (
              <div className="flex flex-col gap-2.5 text-[14.5px]">
                {poolRequests.map((r) => (
                  <div key={r.id} className="flex justify-between gap-3">
                    <Link href={`/admin/procurement/${r.id}`} className="underline">
                      {r.quantity} × {r.title}
                    </Link>
                    <span className="font-mono text-[12px] text-text-dim whitespace-nowrap">
                      {r.quoteCount} quote{r.quoteCount === 1 ? "" : "s"} · {r.state}
                    </span>
                  </div>
                ))}
                {poolOrders.map((o) => (
                  <div key={o.id} className="flex justify-between gap-3">
                    <Link href={`/admin/intake/${o.po}`} className="underline font-semibold">
                      {o.po}
                    </Link>
                    <span className="font-mono text-[12px] text-text-dim whitespace-nowrap">
                      {formatKobo(o.valueKobo)} · {o.stateLabel}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border border-ink bg-card p-4.5">
            <div className="font-mono text-[11.5px] text-text-dim mb-3">WHAT YOU CAN DO</div>
            <div className="flex flex-col gap-2.5 items-start">
              {pool.state === "funded" && (
                <Btn href={`/admin/pools/${pool.id}/allocation`} size="sm">
                  Allocate and publish
                </Btn>
              )}
              {(pool.state === "underfilled" || pool.state === "open") && (
                <RefundPoolButton poolId={pool.id} />
              )}
              {report && (
                <Btn href={`/${pool.areaSlug}/pools/${pool.id}/report`} variant="outline" size="sm">
                  Read the public report
                </Btn>
              )}
              {!needsBuying && pool.state !== "completed" && (
                <Btn href={`/admin/procurement/new?pool=${pool.id}`} variant="outline" size="sm">
                  Request more quotes
                </Btn>
              )}
            </div>
          </div>
        </div>

        <div className="font-mono text-[11.5px] text-text-dim mt-8 mb-2.5">
          MEMBERS · {roster.paid.length} PAID, {roster.holding.length} HOLDING, {collected}{" "}
          COLLECTED
        </div>

        {roster.paid.length === 0 && roster.holding.length === 0 ? (
          <p className="text-[14.5px] text-text-dim">Nobody has taken a slot yet.</p>
        ) : (
          <GridTable
            columns="1.4fr .6fr 1fr .8fr .9fr"
            headers={["MEMBER", "SLOTS", "STATUS", "CODE", "WINDOW"]}
            fontSize={13}
            rows={[
              ...roster.paid.map((p) => [
                <Link key="n" href={`/admin/members/${p.memberId}`} className="underline">
                  {p.name || "unnamed"}
                </Link>,
                String(p.slots),
                <span key="s" className={(p.state === "collected") ? "text-green" : ""}>
                  {(p.state === "collected") ? "collected" : p.paidByCoordinator ? "paid by coordinator" : "paid"}
                </span>,
                p.code ?? "—",
                p.windowAt ? formatEventStamp(p.windowAt) : "not booked",
              ]),
              ...roster.holding.map((h) => [
                <Link key="n" href={`/admin/members/${h.memberId}`} className="underline">
                  {h.name || "unnamed"}
                </Link>,
                String(h.slots),
                <span key="s" className="text-rust">
                  holding {Math.max(0, Math.ceil(secondsUntil(h.expiresAt) / 60))}m
                </span>,
                "—",
                "—",
              ]),
            ]}
          />
        )}

        <div className="font-mono text-[11.5px] text-text-dim mt-8 mb-2.5">TIMELINE</div>
        <div className="font-mono text-[13px] text-text-mid">
          {timeline.map((t, i) => (
            <div
              key={t.id}
              className={`grid grid-cols-[110px_1fr] gap-2 py-2 ${
                i < timeline.length - 1 ? "border-b border-rule" : ""
              }`}
            >
              <span className="text-text-dim">{formatEventStamp(t.at)}</span>
              <span>{t.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
