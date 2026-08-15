import Link from "next/link";
import { notFound } from "next/navigation";

import { OpsHeader } from "@/components/nav";
import {
  ApproveSupplierButton,
  GrantSupplierAccessForm,
  SupplierDetailsForm,
} from "@/components/staff-forms";
import { GridTable, StatGrid, Tag } from "@/components/ui";
import { requireOps } from "@/lib/auth/dal";
import {
  getScorecard,
  listPayouts,
  listPurchaseOrders,
  listSupplierUsers,
} from "@/lib/domain/supply";
import { formatKobo } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { formatShortDate } from "@/lib/time";

export const metadata = { title: "Supplier" };

export default async function AdminSupplierDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireOps();

  const card = await getScorecard(id);
  if (!card) notFound();

  const { supplier, totals } = card;
  const [orders, payouts, users] = await Promise.all([
    listPurchaseOrders(id),
    listPayouts(id),
    listSupplierUsers(id),
  ]);

  const owedKobo = payouts
    .filter((p) => p.state !== "paid")
    .reduce((sum, p) => sum + p.amountKobo, 0);
  const paidKobo = payouts
    .filter((p) => p.state === "paid")
    .reduce((sum, p) => sum + p.amountKobo, 0);

  const bankOnFile = Boolean(supplier.bankAccountNumber && supplier.bankAccountName);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <OpsHeader active="suppliers" />
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-8">
        <div className="flex justify-between items-start mb-5 flex-wrap gap-3">
          <div>
            <div className="font-mono text-[11.5px] text-text-dim mb-1">
              <Link href="/admin/suppliers" className="underline">
                SUPPLIERS
              </Link>{" "}
              / {supplier.name.toUpperCase()}
            </div>
            <h1 className="font-display text-[30px] tracking-tight">{supplier.name}</h1>
            <p className="text-[14.5px] text-text-dim mt-1">
              {supplier.contactName ?? "no contact name"} ·{" "}
              {supplier.contactPhone ? formatPhone(supplier.contactPhone) : "no phone on file"}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Tag tone={supplier.isApproved ? "green" : "rust"}>
              {supplier.isApproved ? "APPROVED" : "ONBOARDING"}
            </Tag>
            <ApproveSupplierButton supplierId={supplier.id} approved={supplier.isApproved} />
          </div>
        </div>

        {!bankOnFile && (
          <div className="border border-rust-dark bg-card p-4 mb-5">
            <div className="font-mono text-[11.5px] text-rust-dark mb-1">
              NO BANK DETAILS ON FILE
            </div>
            <p className="text-[14.5px] leading-relaxed text-text-mid">
              They cannot be approved, and no payout can be sent, until an account number and the
              name it is registered under are captured. This is normally done on the field visit.
            </p>
          </div>
        )}

        <StatGrid
          columns={4}
          items={[
            { label: "ORDERS", value: String(totals.orders), sub: `${totals.settled} settled` },
            { label: "ORDERED FROM THEM", value: formatKobo(totals.valueKobo) },
            { label: "PAID OUT", value: formatKobo(paidKobo) },
            {
              label: "OWED",
              value: formatKobo(owedKobo),
              valueClassName: owedKobo > 0 ? "text-rust-dark" : undefined,
            },
          ]}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
          <div className="border border-ink bg-card p-4.5">
            <div className="font-mono text-[11.5px] text-text-dim mb-3">SCORECARD</div>
            <div className="flex flex-col gap-3.5">
              {[
                { label: "On time delivery", value: supplier.onTimePct, bad: false },
                { label: "Yield accuracy", value: supplier.yieldAccuracyPct, bad: false },
                {
                  label: "QC rejection rate",
                  value: supplier.rejectRatePct,
                  bad: supplier.rejectRatePct > 5,
                },
              ].map((m) => (
                <div key={m.label}>
                  <div className="flex justify-between text-[14.5px] mb-1.5">
                    <span>{m.label}</span>
                    <span className={`font-mono ${m.bad ? "text-rust-dark" : ""}`}>
                      {m.value}%
                    </span>
                  </div>
                  <div className="h-2 bg-rule-card relative">
                    <div
                      className={`absolute inset-y-0 left-0 ${m.bad ? "bg-rust-dark" : "bg-ink"}`}
                      style={{ width: `${Math.min(100, m.value)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            {totals.failed > 0 && (
              <p className="text-[13.5px] text-text-dim leading-relaxed mt-3.5">
                {totals.failed} order{totals.failed === 1 ? "" : "s"} failed QC and settled short.
              </p>
            )}
          </div>

          <div className="border border-ink bg-card p-4.5">
            <div className="font-mono text-[11.5px] text-text-dim mb-3">
              WHO CAN SIGN IN AS THEM
            </div>
            {users.length === 0 ? (
              <p className="text-[14.5px] text-text-dim leading-relaxed mb-3">
                Nobody yet. They cannot see quote requests or their orders until an account is
                linked.
              </p>
            ) : (
              <div className="flex flex-col gap-2 mb-3.5">
                {users.map((u) => (
                  <div key={u.id} className="flex justify-between items-baseline gap-3">
                    <span className="text-[14.5px] font-semibold">{u.name || "unnamed"}</span>
                    <span className="font-mono text-[12px] text-text-dim">
                      {formatPhone(u.phone)}
                      {u.lastSeenAt ? ` · seen ${formatShortDate(u.lastSeenAt)}` : " · never"}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <GrantSupplierAccessForm supplierId={supplier.id} />
          </div>
        </div>

        <div className="border border-ink bg-card p-4.5 mt-4">
          <div className="font-mono text-[11.5px] text-text-dim mb-3">DETAILS AND BANK</div>
          <SupplierDetailsForm
            supplierId={supplier.id}
            supplier={{
              name: supplier.name,
              contactName: supplier.contactName,
              contactPhone: supplier.contactPhone
                ? formatPhone(supplier.contactPhone)
                : undefined,
              bankName: supplier.bankName,
              bankAccountNumber: supplier.bankAccountNumber,
              bankAccountName: supplier.bankAccountName,
            }}
          />
        </div>

        <div className="font-mono text-[11.5px] text-text-dim mt-8 mb-2.5">PURCHASE ORDERS</div>
        {orders.length === 0 ? (
          <p className="text-[14.5px] text-text-dim">Nothing ordered from them yet.</p>
        ) : (
          <GridTable
            columns=".9fr 1.1fr 1fr 1fr 1.2fr"
            headers={["PO", "WHAT", "VALUE", "BALANCE", "STATE"]}
            fontSize={13}
            rows={orders.map((o) => [
              <Link key="p" href={`/admin/intake/${o.po}`} className="underline">
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
  );
}
