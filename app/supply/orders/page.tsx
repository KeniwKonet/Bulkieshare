import Link from "next/link";
import { redirect } from "next/navigation";

import { SupplyHeader } from "@/components/nav";
import { GridTable, StatGrid } from "@/components/ui";
import { requireRole } from "@/lib/auth/dal";
import { listPurchaseOrders } from "@/lib/domain/supply";
import { formatKobo } from "@/lib/money";
import { formatShortDate } from "@/lib/time";

export const metadata = { title: "Orders" };

export default async function OrdersPage() {
  const member = await requireRole("supplier");
  if (!member.supplierId) redirect("/supply/onboarding");

  const orders = await listPurchaseOrders(member.supplierId);

  const open = orders.filter((o) => o.state !== "settled" && o.state !== "cancelled");
  const owedKobo = open.reduce((sum, o) => sum + o.balanceKobo, 0);
  const valueKobo = orders.reduce((sum, o) => sum + o.valueKobo, 0);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SupplyHeader active="orders" />
      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-8">
        <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
          <h1 className="font-display text-[26px] tracking-tight">Purchase orders</h1>
          <Link href="/supply/requests" className="font-semibold text-[14.5px] border-b-2 border-ink">
            Quote requests
          </Link>
        </div>

        <StatGrid
          columns={3}
          items={[
            { label: "OPEN ORDERS", value: String(open.length) },
            { label: "BALANCE OWED TO YOU", value: formatKobo(owedKobo) },
            { label: "TOTAL ORDERED FROM YOU", value: formatKobo(valueKobo) },
          ]}
        />

        <div className="mt-6">
          {orders.length === 0 ? (
            <p className="text-[15px] text-text-dim leading-relaxed">
              No purchase orders yet. They appear here once we award you a quote.
            </p>
          ) : (
            <GridTable
              columns=".9fr 1.1fr 1fr 1fr 1.2fr"
              headers={["PO", "WHAT", "VALUE", "BALANCE", "STATE"]}
              fontSize={13}
              rows={orders.map((o) => [
                <Link key="p" href={`/supply/orders/${o.po}`} className="underline">
                  {o.po}
                </Link>,
                o.item,
                formatKobo(o.valueKobo),
                formatKobo(o.balanceKobo),
                <span
                  key="s"
                  className={
                    o.state === "settled"
                      ? "text-green"
                      : o.state === "qc_failed"
                        ? "text-rust-dark"
                        : "text-rust"
                  }
                >
                  {o.settledAt ? `settled ${formatShortDate(o.settledAt)}` : o.stateLabel}
                </span>,
              ])}
            />
          )}
        </div>
      </div>
    </div>
  );
}
