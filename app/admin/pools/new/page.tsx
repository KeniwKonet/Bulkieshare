import { OpsHeader } from "@/components/nav";
import { CreatePoolForm } from "@/components/staff-forms";
import { requireOps } from "@/lib/auth/dal";
import { listAreas, listHubs } from "@/lib/domain/pools";

export const metadata = { title: "Open a pool" };

export default async function NewPoolPage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string }>;
}) {
  await requireOps();
  const { area } = await searchParams;

  const areas = await listAreas();
  const areaSlug = area ?? areas.find((a) => a.isLive)?.slug ?? areas[0]?.slug ?? "abuja";
  const hubs = await listHubs(areaSlug);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <OpsHeader active="pools" />
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-8">
        <h1 className="font-display text-[28px] tracking-tight mb-1">Pool builder</h1>
        <p className="text-[15px] text-text-dim mb-6 max-w-[62ch]">
          Threshold and shortfall rule are set once here and locked to this pool for its whole
          life, so nothing can be argued about after it closes.
        </p>

        <div className="flex gap-2 flex-wrap mb-6">
          {areas.map((a) => (
            <a
              key={a.slug}
              href={`/admin/pools/new?area=${a.slug}`}
              className={`font-mono text-[11.5px] px-2.5 py-1.5 border ${
                a.slug === areaSlug ? "bg-ink text-paper border-ink" : "border-rule"
              }`}
            >
              {a.label.toUpperCase()}
              {a.isLive ? "" : " · NOT LIVE"}
            </a>
          ))}
        </div>

        {hubs.length === 0 ? (
          <div className="border border-rust bg-card p-5">
            <div className="font-display text-[20px] tracking-tight mb-1.5">
              No hubs in this area
            </div>
            <p className="text-[14.5px] text-text-dim leading-relaxed">
              A pool needs somewhere to collect from. Add a hub before opening a pool here.
            </p>
          </div>
        ) : (
          <CreatePoolForm
            areaSlug={areaSlug}
            hubs={hubs.map((h) => ({ id: h.id, name: h.name }))}
          />
        )}
      </div>
    </div>
  );
}
