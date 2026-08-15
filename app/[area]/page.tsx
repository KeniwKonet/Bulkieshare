import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SitePage } from "@/components/nav";
import { AreaNotLive } from "@/components/area-not-live";
import { Btn, PhotoPlaceholder, PoolProgress } from "@/components/ui";
import { getArea, listHubs, listOpenPools, listPoolsByArea } from "@/lib/domain/pools";
import { getPoolReport } from "@/lib/domain/pools";
import { formatKobo, slotsLeftLabel } from "@/lib/money";
import { formatKg, formatBasisPoints } from "@/lib/money";
import { formatShortDate } from "@/lib/time";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ area: string }>;
}): Promise<Metadata> {
  const { area } = await params;
  const row = await getArea(area);
  return { title: `Buy a cow, ${row?.label ?? area}` };
}

export default async function AreaHome({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  const areaRow = await getArea(area);
  if (!areaRow) notFound();

  if (!areaRow.isLive) {
    return (
      <SitePage area={area}>
        <AreaNotLive area={area} label={areaRow.label} waitlistCount={areaRow.waitlistCount} />
      </SitePage>
    );
  }

  const label = areaRow.label;
  const [openPools, areaHubs, completed] = await Promise.all([
    listOpenPools(area),
    listHubs(area),
    listPoolsByArea(area, { states: ["completed"] }),
  ]);

  // The hero features whichever open pool is closest to closing.
  const featured = openPools[0];
  const cheapestSlotKobo = openPools.length
    ? Math.min(...openPools.map((p) => p.pricePerSlotKobo))
    : 0;

  // The transparency table is built from real completed pools and their reports.
  const reports = await Promise.all(
    completed.slice(0, 4).map(async (p) => ({ pool: p, report: await getPoolReport(p.id) })),
  );

  return (
    <SitePage area={area}>
      <div className="max-w-6xl mx-auto">
        {/* HERO */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_.9fr] gap-8 sm:gap-12 px-5 sm:px-8 pt-10 sm:pt-14 pb-10">
          <div>
            <h1 className="font-display text-[52px] sm:text-[64px] lg:text-[76px] leading-[0.95] tracking-[-.035em] mb-5">
              Buy a cow
              <br />
              eight thousand
              <br />
              naira at a time.
            </h1>
            <p className="text-[17px] sm:text-[19px] leading-relaxed max-w-[34ch] mb-7 text-text-mid text-pretty">
              Forty neighbours split one cow from a Kuje farm. You pay for your portion, collect
              it at a hub near you, and pay wholesale instead of market price.
            </p>
            <div className="flex flex-wrap gap-3.5 items-center">
              <Btn href={`/${area}/pools`} size="xl">
                See pools closing this week
              </Btn>
              <Link
                href="/how-it-works"
                className="text-[16px] font-semibold border-b-2 border-ink pb-0.5"
              >
                How collection works
              </Link>
            </div>
          </div>

          {featured ? (
            <div className="border border-ink bg-card p-5 sm:p-6 h-fit">
              <div className="flex justify-between font-mono text-[12px] mb-2">
                <span>
                  #{featured.code} · {featured.hubName.toUpperCase()}
                </span>
                <span className="bg-lime px-1.5 py-0.5">
                  {featured.closesAtLabel.toUpperCase()}
                </span>
              </div>
              <h3 className="font-display text-[27px] tracking-tight mb-1">{featured.title}</h3>
              <p className="text-[14.5px] text-text-dim mb-4.5">
                {featured.unitDescription}
                {featured.supplierName ? ` · ${featured.supplierName}` : ""}
              </p>
              <div className="flex justify-between items-baseline mb-2">
                <span className="font-display text-[30px]">
                  {slotsLeftLabel(featured.slotsLeft)}
                </span>
                <span className="font-mono text-[13px]">
                  {featured.paidSlots} / {featured.totalSlots} paid
                </span>
              </div>
              <PoolProgress pool={featured} height={24} />
              <div className="border-t border-rule pt-4 mt-4.5 flex justify-between items-end">
                <div>
                  <div className="font-mono text-[12px] text-text-dim">PER SLOT</div>
                  <div className="font-display text-[34px]">
                    {formatKobo(featured.pricePerSlotKobo)}
                  </div>
                  {featured.marketPricePerSlotKobo && (
                    <div className="text-[13px] text-text-dim">
                      Market price: {formatKobo(featured.marketPricePerSlotKobo)}
                    </div>
                  )}
                </div>
                <Btn href={`/${area}/pools/${featured.id}`} variant="dark" size="lg">
                  Take a slot
                </Btn>
              </div>
            </div>
          ) : (
            <div className="border border-ink bg-card p-6 h-fit">
              <div className="font-display text-[26px] tracking-tight mb-2">
                No pools open right now
              </div>
              <p className="text-[15px] text-text-dim leading-relaxed">
                We open new pools every week in {label}. Sign in and we will message you the
                moment one opens at your hub.
              </p>
              <Btn href="/join" className="mt-4" size="md">
                Get told first
              </Btn>
            </div>
          )}
        </div>

        {/* STATS STRIP */}
        <div className="border-y border-ink grid grid-cols-2 lg:grid-cols-4">
          {[
            {
              value: cheapestSlotKobo ? formatKobo(cheapestSlotKobo) : "—",
              label: `smallest slot in ${label}`,
            },
            { value: "7 days", label: "typical pool window" },
            {
              value: `${areaHubs.length} hub${areaHubs.length === 1 ? "" : "s"}`,
              label: areaHubs.map((h) => h.name.split(" ")[0]).join(", "),
            },
            { value: "48 hours", label: "every dispute answered inside this" },
          ].map((s) => (
            <div
              key={s.label}
              className="px-5 sm:px-6 py-6 border-r border-ink last:border-r-0 [&:nth-child(2)]:border-r"
            >
              <div className="font-display text-[30px]">{s.value}</div>
              <div className="text-[14px] text-text-dim">{s.label}</div>
            </div>
          ))}
        </div>

        {/* OPEN POOLS */}
        {openPools.length > 0 && (
          <div className="px-5 sm:px-8 py-10 sm:py-12">
            <div className="flex justify-between items-end mb-5 flex-wrap gap-3">
              <h2 className="font-display text-[30px] sm:text-[36px] tracking-tight">
                Open right now in {label}
              </h2>
              <Link
                href={`/${area}/pools`}
                className="text-[15px] font-semibold border-b-2 border-ink"
              >
                All {openPools.length} pools
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {openPools.slice(0, 3).map((p) => (
                <div key={p.id} className="border border-ink bg-card">
                  <PhotoPlaceholder caption={p.photoCaption} height={110} />
                  <div className="p-4">
                    <div className="font-mono text-[11.5px] mb-1.5">
                      #{p.code} · {p.hubName.toUpperCase()}
                    </div>
                    <div className="font-display text-[21px] tracking-tight">{p.title}</div>
                    <div className="flex justify-between items-baseline my-2.5">
                      <span className="font-bold">{slotsLeftLabel(p.slotsLeft)}</span>
                      <span className="font-mono text-[12px] text-text-dim">
                        {p.paidSlots} / {p.totalSlots}
                      </span>
                    </div>
                    <PoolProgress pool={p} height={12} showCaption={false} />
                    <div className="flex justify-between items-end mt-3.5">
                      <span className="font-display text-[22px]">
                        {formatKobo(p.pricePerSlotKobo)}
                      </span>
                      <Btn href={`/${area}/pools/${p.id}`} size="sm">
                        Take a slot
                      </Btn>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TRANSPARENCY */}
        <div className="bg-ink text-paper px-5 sm:px-8 py-10 sm:py-12 grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-8 sm:gap-12 items-center">
          <div>
            <h2 className="font-display text-[32px] sm:text-[42px] leading-tight tracking-tight mb-4">
              A cow does not divide evenly. We publish what that costs you.
            </h2>
            <p className="text-[17px] leading-relaxed text-dark-dim max-w-[44ch] mb-5">
              Every listing states its tolerance band before you pay. When a portion lands under
              nominal, the difference goes back to you as store credit, automatically.
            </p>
            {reports.find((r) => r.report) && (
              <Btn href={`/${area}/pools/${reports.find((r) => r.report)!.pool.id}/report`}>
                Read a completed pool report
              </Btn>
            )}
          </div>
          <div className="border border-dark-rule overflow-x-auto">
            <div className="grid grid-cols-4 font-mono text-[13px] min-w-[480px]">
              {["POOL", "NOMINAL", "ACTUAL", "VARIANCE"].map((h) => (
                <div key={h} className="px-3.5 py-3 border-b border-dark-rule text-dark-dim-2">
                  {h}
                </div>
              ))}
              {reports.map(({ pool, report }, ri) => {
                const cells = report
                  ? [
                      `${pool.title.split(",")[0]} · ${formatShortDate(pool.shareDate)}`,
                      report.nominalWeightGrams
                        ? formatKg(report.nominalWeightGrams / pool.totalSlots)
                        : "—",
                      report.usableWeightGrams
                        ? formatKg(report.usableWeightGrams / pool.totalSlots)
                        : "—",
                      formatBasisPoints(report.yieldVarianceBasisPoints),
                    ]
                  : [
                      `${pool.title.split(",")[0]} · ${formatShortDate(pool.shareDate)}`,
                      "—",
                      "—",
                      "report pending",
                    ];
                return cells.map((cell, ci) => (
                  <div
                    key={`${ri}-${ci}`}
                    className={`px-3.5 py-3 ${
                      ri < reports.length - 1 ? "border-b border-dark-rule-2" : ""
                    } ${ci === 3 && report && report.yieldVarianceBasisPoints > 0 ? "text-lime" : ""}`}
                  >
                    {cell}
                  </div>
                ));
              })}
            </div>
          </div>
        </div>

        {/* HUBS */}
        <div className="px-5 sm:px-8 py-10 sm:py-12 border-b border-ink">
          <h2 className="font-display text-[28px] sm:text-[34px] tracking-tight mb-5">
            Where you collect
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-6">
            <PhotoPlaceholder caption={`map · hub pins across ${label}`} height={260} />
            <div className="flex flex-col gap-2.5">
              {areaHubs.map((h) => (
                <Link
                  key={h.id}
                  href={`/${area}/hubs`}
                  className="border border-ink bg-card px-4 py-3.5 flex justify-between items-center gap-3"
                >
                  <div>
                    <div className="font-bold text-[17px]">{h.name}</div>
                    <div className="text-[13.5px] text-text-dim">
                      {h.windows}
                      {h.notes ? ` · ${h.notes}` : ""}
                    </div>
                  </div>
                  <span className="font-mono text-[12px] bg-lime px-2 py-1 whitespace-nowrap">
                    {h.openPools} POOL{h.openPools === 1 ? "" : "S"}
                  </span>
                </Link>
              ))}
              <p className="text-[14.5px] text-text-dim leading-relaxed mt-1.5">
                Home delivery costs ₦2,500 to ₦4,000 in {label} and we price it honestly rather
                than hiding it in the slot price. Most people collect.
              </p>
            </div>
          </div>
        </div>
      </div>
    </SitePage>
  );
}
