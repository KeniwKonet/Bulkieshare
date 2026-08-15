import Link from "next/link";
import { notFound } from "next/navigation";

import { OpsHeader } from "@/components/nav";
import { IntakeQcForm, SettlePoButton } from "@/components/staff-forms";
import { PhotoPlaceholder, Tag } from "@/components/ui";
import { requireOps } from "@/lib/auth/dal";
import { getPool, getPoolReport } from "@/lib/domain/pools";
import { getPurchaseOrder } from "@/lib/domain/supply";
import { formatBasisPoints, formatKg, formatKobo, koboToNaira } from "@/lib/money";
import { formatShortDate } from "@/lib/time";

export const metadata = { title: "Intake and QC" };

export default async function IntakePage({ params }: { params: Promise<{ po: string }> }) {
  const { po } = await params;
  await requireOps();

  const order = await getPurchaseOrder(po);
  if (!order) notFound();

  const [pool, report] = await Promise.all([
    order.poolId ? getPool(order.poolId) : Promise.resolve(null),
    order.poolId ? getPoolReport(order.poolId) : Promise.resolve(null),
  ]);

  const settled = order.state === "settled";
  const qcDone = order.state === "qc_passed" || order.state === "qc_failed" || settled;

  return (
    <div className="min-h-screen bg-paper text-ink">
      <OpsHeader active="intake" />
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-8">
        <div className="flex justify-between items-start mb-1.5 flex-wrap gap-2">
          <div className="font-mono text-[11.5px] text-text-dim">
            INTAKE AND QC · {order.po} · {order.supplierName.toUpperCase()}
          </div>
          <Tag tone={settled ? "green" : order.state === "qc_failed" ? "rust" : "amber"}>
            {order.stateLabel.toUpperCase()}
          </Tag>
        </div>

        <h1 className="font-display text-[28px] tracking-tight mb-5">{order.item}</h1>

        <div className="border border-ink bg-card mb-5">
          <div className="grid grid-cols-1 sm:grid-cols-3">
            <div className="p-4 sm:border-r border-b sm:border-b-0 border-rule-card">
              <div className="font-mono text-[11px] text-text-dim">PO VALUE</div>
              <div className="text-[19px] font-bold">{formatKobo(order.valueKobo)}</div>
            </div>
            <div className="p-4 sm:border-r border-b sm:border-b-0 border-rule-card">
              <div className="font-mono text-[11px] text-text-dim">DEPOSIT RELEASED</div>
              <div className="text-[19px] font-bold text-green">
                {formatKobo(order.depositKobo)}
              </div>
            </div>
            <div className="p-4">
              <div className="font-mono text-[11px] text-text-dim">BALANCE OUTSTANDING</div>
              <div className="text-[19px] font-bold">{formatKobo(order.balanceKobo)}</div>
            </div>
          </div>
        </div>

        {report && pool && (
          <div className="border border-ink bg-card p-4.5 mb-5">
            <div className="font-mono text-[11px] text-text-dim mb-2.5">
              USABLE YIELD AFTER BUTCHERING
            </div>
            {report.nominalWeightGrams && (
              <div className="flex justify-between font-mono text-[13.5px] py-1.5 border-b border-rule-card">
                <span>
                  Nominal owed, {pool.totalSlots} ×{" "}
                  {formatKg(report.nominalWeightGrams / pool.totalSlots)}
                </span>
                <span>{formatKg(report.nominalWeightGrams)}</span>
              </div>
            )}
            {report.usableWeightGrams && (
              <div className="flex justify-between font-mono text-[13.5px] py-1.5 border-b border-rule-card">
                <span>Usable after QC</span>
                <span>{formatKg(report.usableWeightGrams)}</span>
              </div>
            )}
            <div className="flex justify-between font-mono text-[13.5px] py-1.5">
              <span>Variance</span>
              <span className={report.yieldVarianceBasisPoints >= 0 ? "text-green" : "text-rust"}>
                {report.yieldVarianceBasisPoints >= 0 ? "+" : "−"}
                {formatBasisPoints(Math.abs(report.yieldVarianceBasisPoints))}
                {pool.toleranceBand ? `, band ${pool.toleranceBand}` : ""}
              </span>
            </div>
          </div>
        )}

        {order.qcNote && (
          <div className="border border-rust bg-card p-4 mb-5">
            <div className="font-mono text-[11.5px] text-rust mb-1">QC NOTE ON RECORD</div>
            <p className="text-[14.5px] leading-relaxed">{order.qcNote}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5 mb-5">
          <PhotoPlaceholder caption="weighbridge ticket" height={110} align="end" />
          <PhotoPlaceholder caption="goods at intake, tags visible" height={110} align="end" />
        </div>

        {settled ? (
          <div className="border border-green bg-card p-4">
            <div className="font-mono text-[11.5px] text-green mb-1">SETTLED</div>
            <p className="text-[14.5px] leading-relaxed">
              Balance of {formatKobo(order.balanceKobo)} released
              {order.settledAt ? ` on ${formatShortDate(order.settledAt)}` : ""}.
            </p>
          </div>
        ) : qcDone ? (
          <div className="border border-ink bg-card p-4">
            <div className="font-mono text-[11.5px] text-text-dim mb-2">
              QC RECORDED · BALANCE QUEUED FOR PAYOUT
            </div>
            <SettlePoButton po={order.po} />
          </div>
        ) : (
          <div className="border border-ink bg-card p-4">
            <div className="font-mono text-[11.5px] text-text-dim mb-2.5">RECORD THE QC VERDICT</div>
            <IntakeQcForm po={order.po} balanceNaira={koboToNaira(order.balanceKobo)} />
          </div>
        )}

        <p className="font-mono text-[11px] leading-relaxed text-text-dim mt-2.5">
          Balance is due within 48 hours of passing QC. A rejection settles short and is recorded
          against the supplier&apos;s scorecard.
        </p>

        <Link
          href="/admin/suppliers"
          className="inline-block font-semibold text-[14.5px] border-b-2 border-ink mt-5"
        >
          ← All suppliers
        </Link>
      </div>
    </div>
  );
}
