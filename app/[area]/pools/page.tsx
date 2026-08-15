import Link from "next/link";
import { notFound } from "next/navigation";

import { SitePage } from "@/components/nav";
import { AreaNotLive } from "@/components/area-not-live";
import { PoolCard } from "@/components/ui";
import { getArea, listHubs, listOpenPools, settleClosedPools } from "@/lib/domain/pools";
import { nairaToKobo } from "@/lib/money";

const FILTERS = [
  { key: "all", label: "ALL" },
  { key: "meat", label: "MEAT" },
  { key: "grains", label: "GRAINS" },
  { key: "under10k", label: "UNDER ₦10,000" },
];

export const metadata = { title: "Open pools" };

export default async function PoolsListing({
  params,
  searchParams,
}: {
  params: Promise<{ area: string }>;
  searchParams: Promise<{ filter?: string; hub?: string }>;
}) {
  const { area } = await params;
  const { filter = "all", hub } = await searchParams;

  const areaRow = await getArea(area);
  if (!areaRow) notFound();

  if (!areaRow.isLive) {
    return (
      <SitePage area={area}>
        <AreaNotLive area={area} label={areaRow.label} waitlistCount={areaRow.waitlistCount} />
      </SitePage>
    );
  }

  // Anything past its closing time gets moved out of "open" before we list.
  await settleClosedPools();

  const [all, hubs] = await Promise.all([listOpenPools(area), listHubs(area)]);

  const filtered = all.filter((p) => {
    if (hub && p.hubId !== hub) return false;
    if (filter === "meat") return p.category === "meat";
    if (filter === "grains") return p.category === "grains";
    if (filter === "under10k") return p.pricePerSlotKobo < nairaToKobo(10_000);
    return true;
  });

  const closingThisWeek = all.filter((p) => p.closesInDays < 7).length;

  return (
    <SitePage area={area}>
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8 sm:py-10">
        <div className="flex justify-between items-end mb-1 flex-wrap gap-4">
          <div>
            <h1 className="font-display text-[32px] sm:text-[40px] tracking-tight">
              {all.length} pool{all.length === 1 ? "" : "s"} open in {areaRow.label}
            </h1>
            <p className="text-[15.5px] text-text-dim mt-1.5">
              {closingThisWeek > 0
                ? `${closingThisWeek} close${closingThisWeek === 1 ? "s" : ""} this week. `
                : ""}
              Prices are set per hub, so what you see is what you pay at that hub.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {FILTERS.map((f) => (
              <Link
                key={f.key}
                href={f.key === "all" ? `/${area}/pools` : `/${area}/pools?filter=${f.key}`}
                className={`font-mono text-[12px] px-3 py-2 border ${
                  filter === f.key ? "bg-ink text-paper border-ink" : "border-ink"
                }`}
              >
                {f.label}
              </Link>
            ))}
          </div>
        </div>

        {hubs.length > 1 && (
          <div className="flex gap-2 flex-wrap mt-4">
            <Link
              href={`/${area}/pools${filter !== "all" ? `?filter=${filter}` : ""}`}
              className={`font-mono text-[11.5px] px-2.5 py-1.5 border ${
                !hub ? "bg-ink text-paper border-ink" : "border-rule"
              }`}
            >
              ALL HUBS
            </Link>
            {hubs.map((h) => (
              <Link
                key={h.id}
                href={`/${area}/pools?hub=${h.id}${filter !== "all" ? `&filter=${filter}` : ""}`}
                className={`font-mono text-[11.5px] px-2.5 py-1.5 border ${
                  hub === h.id ? "bg-ink text-paper border-ink" : "border-rule"
                }`}
              >
                {h.name.toUpperCase()}
              </Link>
            ))}
          </div>
        )}

        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {filtered.map((p) => (
              <PoolCard key={p.id} pool={p} area={area} />
            ))}
          </div>
        ) : (
          <div className="border border-ink bg-card px-6 py-14 text-center mt-8">
            <div className="font-display text-[26px] tracking-tight mb-2">
              {all.length === 0
                ? "No pools are open right now"
                : "Nothing matches that filter right now"}
            </div>
            <p className="text-[15px] text-text-dim max-w-[52ch] mx-auto mb-4">
              {all.length === 0
                ? `We open new pools in ${areaRow.label} every week. Sign in and we will tell you first.`
                : `Try a different category, or see everything open in ${areaRow.label} today.`}
            </p>
            <Link href={`/${area}/pools`} className="font-semibold border-b-2 border-ink">
              {all.length === 0 ? "Refresh" : "Clear filters"}
            </Link>
          </div>
        )}
      </div>
    </SitePage>
  );
}
