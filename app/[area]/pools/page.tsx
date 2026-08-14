import Link from "next/link";
import { SitePage } from "@/components/nav";
import { AreaNotLive } from "@/components/area-not-live";
import { PoolCard } from "@/components/ui";
import { AREA_LABELS, LIVE_AREAS, poolsByArea } from "@/lib/mock-data";

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
  searchParams: Promise<{ filter?: string }>;
}) {
  const { area } = await params;
  const { filter = "all" } = await searchParams;

  if (!LIVE_AREAS.has(area)) {
    return (
      <SitePage area={area}>
        <AreaNotLive area={area} />
      </SitePage>
    );
  }

  const label = AREA_LABELS[area] ?? area;
  const all = poolsByArea(area).filter((p) => p.state === "open");
  const filtered = all.filter((p) => {
    if (filter === "meat") return p.category === "meat";
    if (filter === "grains") return p.category === "grains";
    if (filter === "under10k") return p.pricePerSlot < 10000;
    return true;
  });

  return (
    <SitePage area={area}>
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8 sm:py-10">
        <div className="flex justify-between items-end mb-1 flex-wrap gap-4">
          <div>
            <h1 className="font-display text-[32px] sm:text-[40px] tracking-tight">
              {all.length} pools open in {label}
            </h1>
            <p className="text-[15.5px] text-text-dim mt-1.5">
              Two close this week. Prices are set per hub, so what you see is what you pay at
              that hub.
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

        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {filtered.map((p) => (
              <PoolCard key={p.id} pool={p} area={area} />
            ))}
          </div>
        ) : (
          <div className="border border-ink bg-card px-6 py-14 text-center mt-8">
            <div className="font-display text-[26px] tracking-tight mb-2">
              Nothing matches that filter right now
            </div>
            <p className="text-[15px] text-text-dim max-w-[52ch] mx-auto mb-4">
              Try a different category, or see everything open in {label} today.
            </p>
            <Link href={`/${area}/pools`} className="font-semibold border-b-2 border-ink">
              Clear filters
            </Link>
          </div>
        )}

        <div className="mt-10 border border-ink bg-ink text-paper px-6 py-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="max-w-[60ch]">
            <div className="font-display text-[22px] tracking-tight mb-1">Nothing near Enugu yet</div>
            <p className="text-[14.5px] leading-relaxed text-dark-dim">
              You are seeing {label} because that is where we run hubs. Tell us where you are and
              we will open there when enough people ask. 340 people in Enugu have.
            </p>
          </div>
          <Link href="/enugu/pools" className="bg-lime text-ink font-bold text-[15px] px-5 py-3.5 whitespace-nowrap">
            Add me to the waitlist
          </Link>
        </div>
      </div>
    </SitePage>
  );
}
