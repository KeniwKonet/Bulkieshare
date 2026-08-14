import { SitePage } from "@/components/nav";
import { Btn, GridTable, PhotoPlaceholder } from "@/components/ui";
import { formatNaira, getPool, POOL_REPORT } from "@/lib/mock-data";

export const metadata = { title: "Pool report" };

export default async function PoolReportPage({
  params,
}: {
  params: Promise<{ area: string; id: string }>;
}) {
  const { area, id } = await params;
  const pool = getPool(id);
  const r = POOL_REPORT;

  return (
    <SitePage area={area}>
      <div className="max-w-6xl mx-auto">
        <div className="px-5 sm:px-8 py-3.5 border-b border-ink flex justify-between items-center flex-wrap gap-2">
          <span className="font-mono text-[12.5px]">
            PUBLIC REPORT · #{pool.code} · ANYONE CAN READ THIS
          </span>
          <Btn variant="outline" size="sm">
            Download CSV
          </Btn>
        </div>

        <div className="px-5 sm:px-8 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10 border-b border-ink">
          <div>
            <h1 className="font-display text-[30px] sm:text-[38px] tracking-tight leading-tight mb-3">
              {pool.title}, {r.totalSlots} slots, completed {r.completedDate}
            </h1>
            <p className="text-[16px] leading-relaxed text-text-mid max-w-[52ch] mb-5">
              Everything below was recorded at the hub on the day and published unedited. Weights
              come off the scale photo, not from our estimate. This is what we mean when we say a
              pool is auditable.
            </p>
            <div className="flex flex-wrap gap-6 sm:gap-8 font-mono text-[12.5px] text-text-dim">
              <div>
                <div className="font-display text-[26px] text-ink">
                  {r.slotsSold} / {r.totalSlots}
                </div>
                slots paid
              </div>
              <div>
                <div className="font-display text-[26px] text-ink">{formatNaira(r.collected)}</div>
                collected
              </div>
              <div>
                <div className="font-display text-[26px] text-ink">+{r.yieldVariancePct}%</div>
                yield variance
              </div>
              <div>
                <div className="font-display text-[26px] text-ink">{r.handovers}</div>
                handovers, {r.disputes} disputes
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <PhotoPlaceholder caption="intake, live weight" height={130} />
            <PhotoPlaceholder caption="QC verdict sheet" height={130} />
            <PhotoPlaceholder caption="portions on the bench" height={130} />
            <PhotoPlaceholder caption="scale readout, slot 12" height={130} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2">
          <div className="px-5 sm:px-8 py-8 lg:border-r border-ink">
            <h3 className="text-[20px] font-semibold mb-3.5">Yield reconciliation</h3>
            <div className="border border-ink bg-card font-mono text-[13.5px] mb-6">
              <div className="flex justify-between px-4 py-3 border-b border-rule-card">
                <span>Live weight at intake</span>
                <span>{r.liveWeightKg.toFixed(1)}kg</span>
              </div>
              <div className="flex justify-between px-4 py-3 border-b border-rule-card">
                <span>Usable after butchering and QC</span>
                <span>{r.usableWeightKg.toFixed(1)}kg</span>
              </div>
              <div className="flex justify-between px-4 py-3 border-b border-rule-card">
                <span>Nominal owed, {r.totalSlots} × 2.5kg</span>
                <span>{r.nominalWeightKg.toFixed(1)}kg</span>
              </div>
              <div className="flex justify-between px-4 py-3">
                <span>Variance</span>
                <span className="text-green">{r.varianceLabel}</span>
              </div>
            </div>
            <h3 className="text-[20px] font-semibold mb-3.5">Grade fairness</h3>
            <p className="text-[15px] leading-relaxed text-text-dim mb-3.5">
              Allocation seed <b className="font-mono">{r.allocationSeed}</b>, published{" "}
              {r.seedPublishedDate}, two days before allocation ran.
            </p>
            <GridTable
              columns="1.4fr 1fr"
              headers={[]}
              rows={[
                ["Prime share, target 40%", "39.6% mean, ±2.1%"],
                ["Secondary, target 40%", "40.2% mean"],
                ["Widest member deviation", "4.4% from mean"],
              ]}
              fontSize={13}
            />
          </div>
          <div className="px-5 sm:px-8 py-8">
            <h3 className="text-[20px] font-semibold mb-3.5">Where the {formatNaira(r.collected)} went</h3>
            <div className="border border-ink bg-card font-mono text-[13.5px] mb-6">
              {r.costBreakdown.map((c) => (
                <div key={c.label} className="flex justify-between px-4 py-3 border-b border-rule-card">
                  <span>{c.label}</span>
                  <span>{formatNaira(c.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between px-4 py-3.5 bg-ink text-lime">
                <span>Our margin</span>
                <span>
                  {formatNaira(r.marginAmount)} · {r.marginPct}%
                </span>
              </div>
            </div>
            <h3 className="text-[20px] font-semibold mb-3.5">Timeline</h3>
            <div className="font-mono text-[13px] text-text-mid">
              {r.timeline.map((t, i) => (
                <div
                  key={t.at}
                  className={`grid grid-cols-[110px_1fr] py-2.5 ${
                    i < r.timeline.length - 1 ? "border-b border-rule" : ""
                  }`}
                >
                  <span className="text-text-dim">{t.at}</span>
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
