import Link from "next/link";

import { OpsHeader } from "@/components/nav";
import { ApproveSupplierButton } from "@/components/staff-forms";
import { Btn, GridTable, StatGrid } from "@/components/ui";
import { requireOps } from "@/lib/auth/dal";
import { listPurchaseOrders, listSuppliers } from "@/lib/domain/supply";
import { formatKobo } from "@/lib/money";

export const metadata = { title: "Suppliers" };

export default async function AdminSuppliersPage() {
  await requireOps();

  const [suppliers, orders] = await Promise.all([listSuppliers(), listPurchaseOrders()]);

  const awaiting = suppliers.filter((s) => !s.isApproved);
  const openOrders = orders.filter((o) => o.state !== "settled" && o.state !== "cancelled");
  const owedKobo = openOrders.reduce((sum, o) => sum + o.balanceKobo, 0);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <OpsHeader active="suppliers" />

      <StatGrid
        columns={4}
        items={[
          { label: "SUPPLIERS", value: String(suppliers.length) },
          {
            label: "AWAITING APPROVAL",
            value: String(awaiting.length),
            valueClassName: awaiting.length > 0 ? "text-rust-dark" : undefined,
            sub: awaiting.length > 0 ? "cannot receive a PO yet" : "nothing pending",
          },
          { label: "OPEN PURCHASE ORDERS", value: String(openOrders.length) },
          { label: "BALANCE OWED OUT", value: formatKobo(owedKobo) },
        ]}
      />

      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-8">
        <div className="flex justify-between items-end mb-5 flex-wrap gap-3">
          <div>
            <h1 className="font-display text-[26px] tracking-tight">Suppliers</h1>
            <p className="text-[14.5px] text-text-dim mt-1">
              Who we buy from, how well they deliver, and who is cleared to receive an order.
            </p>
          </div>
          <Btn href="/admin/suppliers/new" variant="dark" size="md">
            Add a supplier
          </Btn>
        </div>

        {awaiting.length > 0 && (
          <div className="border border-rust-dark bg-card p-4 mb-5">
            <div className="font-mono text-[11.5px] text-rust-dark mb-2.5">
              WAITING ON YOU · {awaiting.length} SUPPLIER{awaiting.length === 1 ? "" : "S"}
            </div>
            <div className="flex flex-col gap-2.5">
              {awaiting.map((s) => (
                <div key={s.id} className="flex justify-between items-center gap-3 flex-wrap">
                  <div>
                    <Link
                      href={`/admin/suppliers/${s.id}`}
                      className="font-semibold text-[15.5px] underline"
                    >
                      {s.name}
                    </Link>
                    <div className="font-mono text-[12px] text-text-dim">
                      {s.contactName ?? "no contact name"} ·{" "}
                      {s.contactPhone ?? "no phone on file"}
                    </div>
                  </div>
                  <ApproveSupplierButton supplierId={s.id} approved={s.isApproved} />
                </div>
              ))}
            </div>
          </div>
        )}

        <GridTable
          columns="1.5fr .7fr .7fr .7fr .7fr .9fr"
          headers={["SUPPLIER", "ON TIME", "YIELD", "REJECTS", "OPEN PO", "STATUS"]}
          fontSize={13}
          rows={suppliers.map((s) => [
            <Link key="n" href={`/admin/suppliers/${s.id}`} className="underline font-semibold">
              {s.name}
            </Link>,
            `${s.onTimePct}%`,
            `${s.yieldAccuracyPct}%`,
            <span key="r" className={s.rejectRatePct > 5 ? "text-rust-dark" : ""}>
              {s.rejectRatePct}%
            </span>,
            String(s.openOrders),
            <span key="s" className={s.isApproved ? "text-green" : "text-rust-dark"}>
              {s.isApproved ? "approved" : "onboarding"}
            </span>,
          ])}
          footer={`${suppliers.length} suppliers · ${openOrders.length} open purchase orders`}
        />

        {openOrders.length > 0 && (
          <>
            <div className="font-mono text-[11.5px] text-text-dim mt-8 mb-2.5">
              OPEN PURCHASE ORDERS · GO TO INTAKE TO RECORD QC
            </div>
            <div className="flex flex-col gap-2">
              {openOrders.map((o) => (
                <Link
                  key={o.id}
                  href={`/admin/intake/${o.po}`}
                  className="border border-ink bg-card px-4 py-3 flex justify-between items-center gap-3 flex-wrap"
                >
                  <span className="font-semibold text-[15px]">
                    {o.po} · {o.item}
                  </span>
                  <span className="font-mono text-[12px] text-text-dim">
                    {o.supplierName} · {o.stateLabel}
                  </span>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
