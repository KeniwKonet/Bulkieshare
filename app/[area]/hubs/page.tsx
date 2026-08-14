import { SitePage } from "@/components/nav";
import { PhotoPlaceholder } from "@/components/ui";
import { AREA_LABELS, HUBS } from "@/lib/mock-data";

export const metadata = { title: "Hubs" };

export default async function HubsPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  const label = AREA_LABELS[area] ?? area;
  const hubs = HUBS.filter((h) => h.area === area);

  return (
    <SitePage area={area}>
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-9">
        <h1 className="font-display text-[32px] sm:text-[40px] tracking-tight mb-2">
          Where you collect in {label}
        </h1>
        <p className="text-[16px] text-text-mid leading-relaxed max-w-[60ch] mb-7">
          Every pool names one hub and one share date. There is no delivery in phase 0 — check
          you can reach a hub before you pay.
        </p>
        <PhotoPlaceholder caption={`map · hub pins across ${label}`} height={280} className="mb-8" />
        <div className="flex flex-col gap-4">
          {hubs.map((h) => (
            <div key={h.id} className="border border-ink bg-card p-5 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
              <div>
                <div className="font-display text-[22px] tracking-tight mb-1">{h.name}</div>
                <div className="text-[14.5px] text-text-dim mb-2">{h.address}</div>
                <div className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-[12.5px] text-text-dim">
                  <span>{h.windows}</span>
                  <span>{h.capacityPerHour} handovers an hour</span>
                  <span>{h.notes}</span>
                </div>
              </div>
              <span className="font-mono text-[12px] bg-lime px-2.5 py-1.5 h-fit whitespace-nowrap">
                {h.openPools} POOL{h.openPools === 1 ? "" : "S"} OPEN
              </span>
            </div>
          ))}
        </div>
      </div>
    </SitePage>
  );
}
