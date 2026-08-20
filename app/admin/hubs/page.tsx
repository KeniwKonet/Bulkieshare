import Link from "next/link";

import { OpsHeader } from "@/components/nav";
import { Btn, GridTable, StatGrid } from "@/components/ui";
import { requireOps } from "@/lib/auth/dal";
import { listHubAgents } from "@/lib/domain/ops";
import { listAreas, listHubs } from "@/lib/domain/pools";

export const metadata = { title: "Hubs" };

export default async function AdminHubsPage() {
  await requireOps();

  const [hubs, areas] = await Promise.all([listHubs(undefined, { includeInactive: true }), listAreas()]);
  const staffing = await Promise.all(
    hubs.map(async (h) => ({ id: h.id, agents: (await listHubAgents(h.id)).length })),
  );
  const agentsByHub = new Map(staffing.map((s) => [s.id, s.agents]));

  const unstaffed = hubs.filter((h) => (agentsByHub.get(h.id) ?? 0) === 0);
  const liveAreas = areas.filter((a) => a.isLive);
  const areasWithoutHub = liveAreas.filter((a) => !hubs.some((h) => h.areaSlug === a.slug));

  return (
    <div className="min-h-screen bg-paper text-ink">
      <OpsHeader active="hubs" />

      <StatGrid
        columns={4}
        items={[
          { label: "HUBS", value: String(hubs.length) },
          {
            label: "WITHOUT AN AGENT",
            value: String(unstaffed.length),
            valueClassName: unstaffed.length > 0 ? "text-rust-dark" : undefined,
            sub: "cannot hand anything over",
          },
          { label: "OPEN POOLS ACROSS ALL", value: String(hubs.reduce((n, h) => n + h.openPools, 0)) },
          {
            label: "LIVE AREAS WITH NO HUB",
            value: String(areasWithoutHub.length),
            valueClassName: areasWithoutHub.length > 0 ? "text-rust-dark" : undefined,
          },
        ]}
      />

      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-8">
        <div className="flex justify-between items-end mb-5 flex-wrap gap-3">
          <div>
            <h1 className="font-display text-[26px] tracking-tight">Hubs</h1>
            <p className="text-[14.5px] text-text-dim mt-1">
              Where members collect. Capacity per hour is what generates the bookable windows.
            </p>
          </div>
          <Btn href="/admin/hubs/new" variant="dark" size="md">
            Add a hub
          </Btn>
        </div>

        {areasWithoutHub.length > 0 && (
          <div className="border border-rust-dark bg-card p-4 mb-5">
            <div className="font-mono text-[11.5px] text-rust-dark mb-1">
              LIVE WITH NOWHERE TO COLLECT
            </div>
            <p className="text-[14.5px] leading-relaxed text-text-mid">
              {areasWithoutHub.map((a) => a.label).join(", ")}{" "}
              {areasWithoutHub.length === 1 ? "is" : "are"} switched on but{" "}
              {areasWithoutHub.length === 1 ? "has" : "have"} no hub, so no pool can be opened
              there.
            </p>
          </div>
        )}

        <GridTable
          columns="1.1fr 1.4fr 1.2fr .7fr .7fr .8fr"
          headers={["HUB", "ADDRESS", "WINDOWS", "CAP/HR", "AGENTS", "OPEN"]}
          fontSize={13}
          rows={hubs.map((h) => [
            <Link key="n" href={`/admin/hubs/${h.id}`} className="underline font-semibold">
              {h.name}
            </Link>,
            h.address,
            h.windows || <span key="w" className="text-text-dim">not set</span>,
            String(h.capacityPerHour),
            <span
              key="a"
              className={(agentsByHub.get(h.id) ?? 0) === 0 ? "text-rust-dark font-semibold" : ""}
            >
              {agentsByHub.get(h.id) ?? 0}
            </span>,
            String(h.openPools),
          ])}
          footer={`${hubs.length} hubs across ${new Set(hubs.map((h) => h.areaSlug)).size} areas`}
        />
      </div>
    </div>
  );
}
