import Link from "next/link";
import { redirect } from "next/navigation";

import { SupplyHeader } from "@/components/nav";
import { GridTable, StatGrid } from "@/components/ui";
import { requireRole } from "@/lib/auth/dal";
import { listQuotesBySupplier } from "@/lib/domain/procurement";
import { formatKobo } from "@/lib/money";
import { formatShortDate } from "@/lib/time";

export const metadata = { title: "My quotes" };

export default async function SupplierQuotesPage() {
  const member = await requireRole("supplier");
  if (!member.supplierId) redirect("/supply/onboarding");

  const quotes = await listQuotesBySupplier(member.supplierId);

  const won = quotes.filter((q) => q.isAwarded);
  const lost = quotes.filter((q) => !q.isAwarded && q.requestState === "awarded");
  const pending = quotes.filter(
    (q) => q.requestState === "open" || q.requestState === "quoted",
  );

  const wonValueKobo = won.reduce((sum, q) => sum + q.priceKobo * q.quantity, 0);
  const decided = won.length + lost.length;
  const winRate = decided ? Math.round((won.length / decided) * 100) : null;

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SupplyHeader active="quotes" />
      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-8">
        <div className="flex justify-between items-end mb-5 flex-wrap gap-3">
          <div>
            <h1 className="font-display text-[26px] tracking-tight">My quotes</h1>
            <p className="text-[14.5px] text-text-dim mt-1">
              Everything you have priced, and what came of it.
            </p>
          </div>
          <Link href="/supply/requests" className="font-semibold text-[14.5px] border-b-2 border-ink">
            Open requests
          </Link>
        </div>

        <StatGrid
          columns={4}
          items={[
            { label: "QUOTES SENT", value: String(quotes.length) },
            { label: "WON", value: String(won.length) },
            {
              label: "WIN RATE",
              value: winRate === null ? "—" : `${winRate}%`,
              sub: decided ? `of ${decided} decided` : "nothing decided yet",
            },
            { label: "VALUE WON", value: formatKobo(wonValueKobo) },
          ]}
        />

        {pending.length > 0 && (
          <p className="font-mono text-[11.5px] text-text-dim mt-6 mb-2.5">
            {pending.length} STILL WAITING ON A DECISION
          </p>
        )}

        <div className="mt-4">
          {quotes.length === 0 ? (
            <div className="border border-ink bg-card px-6 py-14 text-center">
              <div className="font-display text-[24px] tracking-tight mb-2">
                You have not quoted yet
              </div>
              <p className="text-[15px] text-text-dim max-w-[52ch] mx-auto mb-4">
                We put a request out when member demand is real, not to shop around. You get a
                WhatsApp message the moment one lands in your category.
              </p>
              <Link href="/supply/requests" className="font-semibold border-b-2 border-ink">
                See open requests
              </Link>
            </div>
          ) : (
            <GridTable
              columns="1.6fr .6fr 1fr .8fr 1fr"
              headers={["WHAT", "QTY", "YOUR PRICE", "HOLD", "OUTCOME"]}
              fontSize={13}
              rows={quotes.map((q) => [
                <span key="t">
                  {q.title}
                  <span className="block font-mono text-[11px] text-text-dim">
                    sent {formatShortDate(q.createdAt)}
                  </span>
                </span>,
                String(q.quantity),
                <span key="p">
                  {formatKobo(q.priceKobo)}
                  <span className="block font-mono text-[11px] text-text-dim">
                    {formatKobo(q.priceKobo * q.quantity)} all in
                  </span>
                </span>,
                `${q.holdDays}d`,
                q.isAwarded ? (
                  <span key="o" className="text-green font-semibold">
                    won
                  </span>
                ) : q.requestState === "awarded" ? (
                  <span key="o" className="text-text-dim">
                    went elsewhere
                  </span>
                ) : q.requestState === "expired" ? (
                  <span key="o" className="text-text-dim">
                    closed, nobody won
                  </span>
                ) : (
                  <span key="o" className="text-rust">
                    waiting
                  </span>
                ),
              ])}
              footer={`${quotes.length} quotes · ${won.length} won`}
            />
          )}
        </div>

        <p className="font-mono text-[11.5px] leading-relaxed text-text-dim mt-6 border-t border-rule pt-4">
          Losing on price once changes nothing. What moves you up or down the call list is the
          scorecard: delivering on time, yields matching what you promised, and passing QC.
        </p>
      </div>
    </div>
  );
}
