import Link from "next/link";
import { notFound } from "next/navigation";

import { SitePage } from "@/components/nav";
import { PhotoPlaceholder } from "@/components/ui";
import { getPool, getPoolReport, getPoolTimeline } from "@/lib/domain/pools";
import { formatBasisPoints, formatKg, formatKobo } from "@/lib/money";
import { formatEventStamp, formatShortDate } from "@/lib/time";

export const metadata = { title: "Pool report" };

export default async function PoolReportPage({
  params,
}: {
  params: Promise<{ area: string; id: string }>;
}) {
  const { area, id } = await params;

  const pool = await getPool(id);
  if (!pool) notFound();

  const [report, timeline] = await Promise.all([getPoolReport(pool.id), getPoolTimeline(pool.id)]);

  if (!report) {
    return (
      <SitePage area={area}>
        <div className="max-w-3xl mx-auto px-5 sm:px-8 py-14">
          <h1 className="font-display text-[32px] tracking-tight mb-3">
            No report published for #{pool.code} yet
          </h1>
          <p className="text-[16px] leading-relaxed text-text-mid mb-5">
            A pool report goes up within a day of the last handover, with weights straight off the
            scale. {pool.title} is currently {pool.state}.
          </p>
          <Link href={`/${area}/pools/${pool.id}`} className="font-semibold border-b-2 border-ink">
            Back to the pool
          </Link>
        </div>
      </SitePage>
    );
  }

  const totalCostKobo = report.costBreakdown.reduce((sum, c) => sum + c.amountKobo, 0);
  const marginPct = report.collectedKobo
    ? ((report.marginKobo / report.collectedKobo) * 100).toFixed(1)
    : "0.0";
  const nominalPerSlot = report.nominalWeightGrams
    ? report.nominalWeightGrams / pool.totalSlots
    : null;

  return (
    <SitePage area={area}>
      <div className="max-w-6xl mx-auto">
        <div className="px-5 sm:px-8 py-3.5 border-b border-ink flex justify-between items-center flex-wrap gap-2">
          <span className="font-mono text-[12.5px]">
            PUBLIC REPORT · #{pool.code} · ANYONE CAN READ THIS
          </span>
          <a
            href={`/api/pools/${pool.id}/report.csv`}
            className="border border-ink text-[13px] font-semibold px-3.5 py-2.5"
          >
            Download CSV
          </a>
        </div>

        <div className="px-5 sm:px-8 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10 border-b border-ink">
          <div>
            <h1 className="font-display text-[30px] sm:text-[38px] tracking-tight leading-tight mb-3">
              {pool.title}, {pool.totalSlots} slots, completed{" "}
              {formatShortDate(report.completedAt)}
            </h1>
            <p className="text-[16px] leading-relaxed text-text-mid max-w-[52ch] mb-5">
              Everything below was recorded at the hub on the day and published unedited. Weights
              come off the scale photo, not from our estimate. This is what we mean when we say a
              pool is auditable.
            </p>
            <div className="flex flex-wrap gap-6 sm:gap-8 font-mono text-[12.5px] text-text-dim">
              <div>
                <div className="font-display text-[26px] text-ink">
                  {pool.paidSlots} / {pool.totalSlots}
                </div>
                slots paid
              </div>
              <div>
                <div className="font-display text-[26px] text-ink">
                  {formatKobo(report.collectedKobo)}
                </div>
                collected
              </div>
              <div>
                <div className="font-display text-[26px] text-ink">
                  {report.yieldVarianceBasisPoints >= 0 ? "+" : "−"}
                  {formatBasisPoints(Math.abs(report.yieldVarianceBasisPoints))}
                </div>
                yield variance
              </div>
              <div>
                <div className="font-display text-[26px] text-ink">{report.handovers}</div>
                handovers, {report.disputes} disputes
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <PhotoPlaceholder caption="intake, live weight" height={130} />
            <PhotoPlaceholder caption="QC verdict sheet" height={130} />
            <PhotoPlaceholder caption="portions on the bench" height={130} />
            <PhotoPlaceholder caption="scale readout" height={130} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2">
          <div className="px-5 sm:px-8 py-8 lg:border-r border-ink">
            <h3 className="text-[20px] font-semibold mb-3.5">Yield reconciliation</h3>
            <div className="border border-ink bg-card font-mono text-[13.5px] mb-6">
              {report.liveWeightGrams && (
                <div className="flex justify-between px-4 py-3 border-b border-rule-card">
                  <span>Live weight at intake</span>
                  <span>{formatKg(report.liveWeightGrams)}</span>
                </div>
              )}
              {report.usableWeightGrams && (
                <div className="flex justify-between px-4 py-3 border-b border-rule-card">
                  <span>Usable after butchering and QC</span>
                  <span>{formatKg(report.usableWeightGrams)}</span>
                </div>
              )}
              {report.nominalWeightGrams && nominalPerSlot && (
                <div className="flex justify-between px-4 py-3 border-b border-rule-card">
                  <span>
                    Nominal owed, {pool.totalSlots} × {formatKg(nominalPerSlot)}
                  </span>
                  <span>{formatKg(report.nominalWeightGrams)}</span>
                </div>
              )}
              <div className="flex justify-between px-4 py-3">
                <span>Variance</span>
                <span className={report.yieldVarianceBasisPoints >= 0 ? "text-green" : "text-rust"}>
                  {report.yieldVarianceBasisPoints >= 0 ? "+" : "−"}
                  {formatBasisPoints(Math.abs(report.yieldVarianceBasisPoints))}
                  {pool.toleranceBand ? `, band ${pool.toleranceBand}` : ""}
                </span>
              </div>
            </div>

            {pool.allocationSeed && (
              <>
                <h3 className="text-[20px] font-semibold mb-3.5">Grade fairness</h3>
                <p className="text-[15px] leading-relaxed text-text-dim">
                  Allocation seed <b className="font-mono">{pool.allocationSeed}</b>
                  {pool.seedPublishedAt
                    ? `, published ${formatShortDate(pool.seedPublishedAt)}, before allocation ran.`
                    : "."}{" "}
                  {pool.cutsBreakdown
                    ? `The split targets ${pool.cutsBreakdown}.`
                    : ""}
                </p>
              </>
            )}
          </div>

          <div className="px-5 sm:px-8 py-8">
            <h3 className="text-[20px] font-semibold mb-3.5">
              Where the {formatKobo(report.collectedKobo)} went
            </h3>
            <div className="border border-ink bg-card font-mono text-[13.5px] mb-6">
              {report.costBreakdown.map((c) => (
                <div
                  key={c.label}
                  className="flex justify-between px-4 py-3 border-b border-rule-card gap-3"
                >
                  <span>{c.label}</span>
                  <span className="whitespace-nowrap">{formatKobo(c.amountKobo)}</span>
                </div>
              ))}
              <div className="flex justify-between px-4 py-3 border-b border-rule-card gap-3">
                <span>Total cost</span>
                <span className="whitespace-nowrap">{formatKobo(totalCostKobo)}</span>
              </div>
              <div className="flex justify-between px-4 py-3.5 bg-ink text-lime gap-3">
                <span>Our margin</span>
                <span className="whitespace-nowrap">
                  {formatKobo(report.marginKobo)} · {marginPct}%
                </span>
              </div>
            </div>

            <h3 className="text-[20px] font-semibold mb-3.5">Timeline</h3>
            <div className="font-mono text-[13px] text-text-mid">
              {timeline.map((t, i) => (
                <div
                  key={t.id}
                  className={`grid grid-cols-[110px_1fr] gap-2 py-2.5 ${
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
      </div>
    </SitePage>
  );
}
