import Link from "next/link";
import { notFound } from "next/navigation";

import { OpsHeader } from "@/components/nav";
import { HubDetailsForm, ToggleHubButton } from "@/components/ops-forms";
import { GridTable, StatGrid, Tag } from "@/components/ui";
import { requireOps } from "@/lib/auth/dal";
import { listHubAgents } from "@/lib/domain/ops";
import { getHub, listAllPools } from "@/lib/domain/pools";
import { formatKobo } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { formatShortDate } from "@/lib/time";

export const metadata = { title: "Hub" };

export default async function AdminHubDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireOps();

  const hub = await getHub(id);
  if (!hub) notFound();

  const [agents, pools] = await Promise.all([listHubAgents(hub.id), listAllPools()]);

  const hubPools = pools.filter((p) => p.hubId === hub.id);
  const openHere = hubPools.filter((p) => p.isOpen);
  const upcoming = hubPools.filter(
    (p) => p.state === "funded" || p.state === "allocating" || p.state === "distributing",
  );
  const collectedKobo = hubPools.reduce((sum, p) => sum + p.paidSlots * p.pricePerSlotKobo, 0);

  // Twenty minute windows, so capacity per hour divided by three per window.
  const perWindow = Math.max(1, Math.round(hub.capacityPerHour / 3));

  return (
    <div className="min-h-screen bg-paper text-ink">
      <OpsHeader active="hubs" />
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-8">
        <div className="flex justify-between items-start mb-5 flex-wrap gap-3">
          <div>
            <div className="font-mono text-[11.5px] text-text-dim mb-1">
              <Link href="/admin/hubs" className="underline">
                HUBS
              </Link>{" "}
              / {hub.id.toUpperCase()}
            </div>
            <h1 className="font-display text-[30px] tracking-tight">{hub.name}</h1>
            <p className="text-[14.5px] text-text-dim mt-1">
              {hub.address}
              {hub.landmark ? ` · ${hub.landmark}` : ""}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Tag tone={hub.isActive ? "lime" : "outline"}>
              {hub.isActive ? "OPEN" : "CLOSED"}
            </Tag>
            <ToggleHubButton hubId={hub.id} isActive={hub.isActive} />
          </div>
        </div>

        {agents.length === 0 && (
          <div className="border border-rust-dark bg-card p-4 mb-5">
            <div className="font-mono text-[11.5px] text-rust-dark mb-1">NOBODY WORKS THIS HUB</div>
            <p className="text-[14.5px] leading-relaxed text-text-mid">
              Without a hub agent nobody can look up a collection code or record a handover here.
              Find the person on the members list and set their role to hub agent.
            </p>
            <Link
              href="/admin/members"
              className="inline-block font-semibold text-[14px] border-b-2 border-ink mt-2"
            >
              Go to members
            </Link>
          </div>
        )}

        <StatGrid
          columns={4}
          items={[
            { label: "POOLS RUN HERE", value: String(hubPools.length) },
            { label: "OPEN NOW", value: String(openHere.length) },
            {
              label: "COMING TO COLLECT",
              value: String(upcoming.length),
              sub: upcoming.length > 0 ? `next ${upcoming[0].shareDateLabel}` : undefined,
            },
            { label: "COLLECTED THROUGH IT", value: formatKobo(collectedKobo) },
          ]}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
          <div className="border border-ink bg-card p-4.5">
            <div className="font-mono text-[11.5px] text-text-dim mb-3">
              AGENTS · {agents.length}
            </div>
            {agents.length === 0 ? (
              <p className="text-[14.5px] text-text-dim leading-relaxed">
                No agent assigned yet.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {agents.map((a) => (
                  <div key={a.id} className="flex justify-between items-baseline gap-3">
                    <Link href={`/admin/members/${a.id}`} className="text-[14.5px] underline">
                      {a.name || "unnamed"}
                    </Link>
                    <span className="font-mono text-[12px] text-text-dim">
                      {formatPhone(a.phone)}
                      {a.lastSeenAt ? ` · seen ${formatShortDate(a.lastSeenAt)}` : " · never"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border border-ink bg-card p-4.5">
            <div className="font-mono text-[11.5px] text-text-dim mb-3">THROUGHPUT</div>
            <div className="flex justify-between text-[14.5px] py-1.5 border-b border-rule-card">
              <span className="text-text-dim">Handovers an hour</span>
              <span className="font-mono">{hub.capacityPerHour}</span>
            </div>
            <div className="flex justify-between text-[14.5px] py-1.5 border-b border-rule-card">
              <span className="text-text-dim">People per 20 minute window</span>
              <span className="font-mono">{perWindow}</span>
            </div>
            <div className="flex justify-between text-[14.5px] py-1.5">
              <span className="text-text-dim">Windows offered</span>
              <span className="font-mono text-right">{hub.windows || "not set"}</span>
            </div>
            <p className="font-mono text-[11px] leading-relaxed text-text-dim mt-3">
              Capacity is what generates the bookable slots members see. Raising it lets more
              people book the same window, and makes the queue longer.
            </p>
          </div>
        </div>

        <div className="border border-ink bg-card p-4.5 mt-4">
          <div className="font-mono text-[11.5px] text-text-dim mb-3">DETAILS</div>
          <HubDetailsForm
            hubId={hub.id}
            values={{
              name: hub.name,
              address: hub.address,
              landmark: hub.landmark,
              windows: hub.windows,
              capacityPerHour: hub.capacityPerHour,
              notes: hub.notes,
            }}
          />
        </div>

        <div className="font-mono text-[11.5px] text-text-dim mt-8 mb-2.5">POOLS AT THIS HUB</div>
        {hubPools.length === 0 ? (
          <p className="text-[14.5px] text-text-dim">Nothing has been run here yet.</p>
        ) : (
          <GridTable
            columns="1.5fr .8fr .9fr 1fr"
            headers={["POOL", "PAID", "STATE", "SHARE DATE"]}
            fontSize={13}
            rows={hubPools.map((p) => [
              <Link key="p" href={`/admin/pools/${p.id}`} className="underline font-semibold">
                {p.title} · #{p.code}
              </Link>,
              `${p.paidSlots}/${p.totalSlots}`,
              p.state,
              p.shareDateLabel,
            ])}
          />
        )}
      </div>
    </div>
  );
}
