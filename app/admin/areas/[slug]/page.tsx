import Link from "next/link";
import { notFound } from "next/navigation";

import { OpsHeader } from "@/components/nav";
import { ToggleAreaButton } from "@/components/staff-forms";
import { Btn, GridTable, ProgressBar, StatGrid, Tag } from "@/components/ui";
import { requireOps } from "@/lib/auth/dal";
import { listWaitlist, waitlistByNeighbourhood } from "@/lib/domain/ops";
import { getArea, listHubs, listPoolsByArea } from "@/lib/domain/pools";
import { formatKobo } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { formatShortDate } from "@/lib/time";

export const metadata = { title: "Area" };

/** Roughly what an area needs before a hub and a first pool pay for themselves. */
const TARGET_SIGNUPS = 500;

export default async function AdminAreaDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireOps();

  const area = await getArea(slug);
  if (!area) notFound();

  const [hubs, pools, waiting, byNeighbourhood] = await Promise.all([
    listHubs(slug, { includeInactive: true }),
    listPoolsByArea(slug),
    listWaitlist(slug),
    waitlistByNeighbourhood(slug),
  ]);

  const collectedKobo = pools.reduce((sum, p) => sum + p.paidSlots * p.pricePerSlotKobo, 0);
  const openPools = pools.filter((p) => p.isOpen);
  const activeHubs = hubs.filter((h) => h.isActive);
  const pct = Math.min(100, Math.round((waiting.length / TARGET_SIGNUPS) * 100));

  const readyToOpen = !area.isLive && activeHubs.length > 0;

  return (
    <div className="min-h-screen bg-paper text-ink">
      <OpsHeader active="areas" />
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-8">
        <div className="flex justify-between items-start mb-5 flex-wrap gap-3">
          <div>
            <div className="font-mono text-[11.5px] text-text-dim mb-1">
              <Link href="/admin/areas" className="underline">
                AREAS
              </Link>{" "}
              / {area.slug.toUpperCase()}
            </div>
            <h1 className="font-display text-[30px] tracking-tight">{area.label}</h1>
            <p className="text-[14.5px] text-text-dim mt-1">
              {activeHubs.length} hub{activeHubs.length === 1 ? "" : "s"} ·{" "}
              {pools.length} pool{pools.length === 1 ? "" : "s"} run here
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Tag tone={area.isLive ? "lime" : "outline"}>
              {area.isLive ? "LIVE" : "NOT LIVE"}
            </Tag>
            <ToggleAreaButton area={area.slug} live={area.isLive} />
          </div>
        </div>

        {area.isLive && activeHubs.length === 0 && (
          <div className="border border-rust-dark bg-card p-4 mb-5">
            <div className="font-mono text-[11.5px] text-rust-dark mb-1">
              LIVE WITH NOWHERE TO COLLECT
            </div>
            <p className="text-[14.5px] leading-relaxed text-text-mid mb-2">
              Members can see this area but no pool can be opened, because there is no active hub.
            </p>
            <Btn href="/admin/hubs/new" size="sm">
              Add a hub
            </Btn>
          </div>
        )}

        {readyToOpen && (
          <div className="border border-ink bg-lime p-4 mb-5">
            <div className="font-mono text-[11.5px] mb-1">READY TO SWITCH ON</div>
            <p className="text-[14.5px] leading-relaxed">
              {activeHubs.length} hub{activeHubs.length === 1 ? "" : "s"} and {waiting.length}{" "}
              {waiting.length === 1 ? "person" : "people"} waiting. Making it live lets them browse
              and reserve.
            </p>
          </div>
        )}

        <StatGrid
          columns={4}
          items={[
            { label: "PEOPLE WAITING", value: String(waiting.length) },
            { label: "HUBS", value: String(activeHubs.length) },
            { label: "OPEN POOLS", value: String(openPools.length) },
            { label: "COLLECTED HERE", value: formatKobo(collectedKobo) },
          ]}
        />

        {!area.isLive && (
          <div className="border border-ink bg-card p-4.5 mt-6">
            <div className="flex justify-between items-baseline mb-2 flex-wrap gap-2">
              <span className="font-bold text-[16px]">
                {waiting.length} of {TARGET_SIGNUPS} asked
              </span>
              <span className="font-mono text-[12px] text-text-dim">{pct}%</span>
            </div>
            <ProgressBar paidPct={pct} height={16} />
            <p className="font-mono text-[11px] leading-relaxed text-text-dim mt-2.5">
              A rough bar, not a rule. What decides it is whether one neighbourhood has enough
              people to fill a single pool.
            </p>
          </div>
        )}

        {byNeighbourhood.length > 0 && (
          <>
            <div className="font-mono text-[11.5px] text-text-dim mt-8 mb-2.5">
              WHERE THEY ARE · PUT THE FIRST HUB IN THE TOP ONE
            </div>
            <GridTable
              columns="2fr .7fr"
              headers={["NEIGHBOURHOOD", "PEOPLE"]}
              fontSize={13}
              rows={byNeighbourhood.map((n) => [
                n.neighbourhood || <span key="n" className="text-text-dim">not given</span>,
                String(n.people),
              ])}
              footer={`${waiting.length} across ${byNeighbourhood.length} neighbourhoods`}
            />
          </>
        )}

        <div className="font-mono text-[11.5px] text-text-dim mt-8 mb-2.5">
          HUBS
        </div>
        {hubs.length === 0 ? (
          <div className="border border-ink bg-card px-5 py-8 text-center">
            <p className="text-[15px] text-text-dim mb-3">No hub here yet.</p>
            <Btn href="/admin/hubs/new" size="sm">
              Add the first one
            </Btn>
          </div>
        ) : (
          <GridTable
            columns="1.2fr 1.6fr .8fr .7fr"
            headers={["HUB", "ADDRESS", "CAP/HR", "STATE"]}
            fontSize={13}
            rows={hubs.map((h) => [
              <Link key="h" href={`/admin/hubs/${h.id}`} className="underline font-semibold">
                {h.name}
              </Link>,
              h.address,
              String(h.capacityPerHour),
              <span key="s" className={h.isActive ? "" : "text-text-dim"}>
                {h.isActive ? "open" : "closed"}
              </span>,
            ])}
          />
        )}

        {waiting.length > 0 && (
          <>
            <div className="font-mono text-[11.5px] text-text-dim mt-8 mb-2.5">
              EVERYONE WAITING · NEWEST FIRST
            </div>
            <GridTable
              columns="1.1fr 1.4fr 1fr"
              headers={["PHONE", "NEIGHBOURHOOD", "ASKED"]}
              fontSize={13}
              rows={waiting.slice(0, 100).map((w) => [
                formatPhone(w.phone),
                w.neighbourhood || <span key="n" className="text-text-dim">not given</span>,
                formatShortDate(w.createdAt),
              ])}
              footer={
                waiting.length > 100
                  ? `showing 100 of ${waiting.length}`
                  : `${waiting.length} in total`
              }
            />
            <p className="font-mono text-[11px] leading-relaxed text-text-dim mt-3">
              These people gave a number on the promise of one message when we open. That is the
              only thing it may ever be used for.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
