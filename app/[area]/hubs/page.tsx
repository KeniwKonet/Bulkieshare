import Link from "next/link";
import { notFound } from "next/navigation";

import { SitePage } from "@/components/nav";
import { PhotoPlaceholder } from "@/components/ui";
import { getArea, listHubs, listOpenPools } from "@/lib/domain/pools";
import { formatKobo } from "@/lib/money";

export const metadata = { title: "Hubs" };

export default async function HubsPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;

  const areaRow = await getArea(area);
  if (!areaRow) notFound();

  const [hubs, openPools] = await Promise.all([listHubs(area), listOpenPools(area)]);

  return (
    <SitePage area={area}>
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-9">
        <h1 className="font-display text-[32px] sm:text-[40px] tracking-tight mb-2">
          Where you collect in {areaRow.label}
        </h1>
        <p className="text-[16px] text-text-mid leading-relaxed max-w-[60ch] mb-7">
          Every pool names one hub and one share date. There is no delivery yet — check you can
          reach a hub before you pay.
        </p>

        <PhotoPlaceholder
          caption={`map · hub pins across ${areaRow.label}`}
          height={280}
          className="mb-8"
        />

        <div className="flex flex-col gap-4">
          {hubs.map((h) => {
            const poolsHere = openPools.filter((p) => p.hubId === h.id);
            return (
              <div key={h.id} className="border border-ink bg-card p-5">
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
                  <div>
                    <div className="font-display text-[22px] tracking-tight mb-1">{h.name}</div>
                    <div className="text-[14.5px] text-text-dim mb-2">{h.address}</div>
                    <div className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-[12.5px] text-text-dim">
                      <span>{h.windows}</span>
                      <span>{h.capacityPerHour} handovers an hour</span>
                      {h.notes && <span>{h.notes}</span>}
                    </div>
                  </div>
                  <Link
                    href={`/${area}/pools?hub=${h.id}`}
                    className="font-mono text-[12px] bg-lime px-2.5 py-1.5 h-fit whitespace-nowrap border border-ink"
                  >
                    {h.openPools} POOL{h.openPools === 1 ? "" : "S"} OPEN
                  </Link>
                </div>

                {poolsHere.length > 0 && (
                  <div className="border-t border-rule mt-4 pt-3.5 flex flex-col gap-2">
                    {poolsHere.map((p) => (
                      <Link
                        key={p.id}
                        href={`/${area}/pools/${p.id}`}
                        className="flex justify-between items-center gap-3 text-[14.5px]"
                      >
                        <span className="font-semibold">{p.title}</span>
                        <span className="font-mono text-[12.5px] text-text-dim whitespace-nowrap">
                          {formatKobo(p.pricePerSlotKobo)} · {p.slotsLeft} left ·{" "}
                          {p.shareDateLabel}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </SitePage>
  );
}
