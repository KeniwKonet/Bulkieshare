import Link from "next/link";

import { OpsHeader } from "@/components/nav";
import { Btn, GridTable, StatGrid } from "@/components/ui";
import { requireOps } from "@/lib/auth/dal";
import { listAllGroups } from "@/lib/domain/groups";
import { formatKobo } from "@/lib/money";
import { formatPhone } from "@/lib/phone";

export const metadata = { title: "Cooperatives" };

export default async function AdminGroupsPage() {
  await requireOps();

  const groups = await listAllGroups();

  const totalMembers = groups.reduce((sum, g) => sum + g.memberCount, 0);
  const totalCollectedKobo = groups.reduce((sum, g) => sum + g.collectedKobo, 0);
  const totalOpen = groups.reduce((sum, g) => sum + g.openPoolCount, 0);

  // A cooperative that has never run a pool is one the coordinator needs help with.
  const dormant = groups.filter((g) => g.poolCount === 0);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <OpsHeader active="groups" />

      <StatGrid
        columns={4}
        items={[
          { label: "COOPERATIVES", value: String(groups.length) },
          { label: "MEMBERS ACROSS ALL", value: String(totalMembers) },
          { label: "POOLS OPEN NOW", value: String(totalOpen) },
          { label: "COLLECTED THROUGH THEM", value: formatKobo(totalCollectedKobo) },
        ]}
      />

      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-8">
        <div className="flex justify-between items-end mb-5 flex-wrap gap-3">
          <div>
            <h1 className="font-display text-[26px] tracking-tight">Cooperatives</h1>
            <p className="text-[14.5px] text-text-dim mt-1">
              Groups a coordinator runs pools for — an estate, an office, a church.
            </p>
          </div>
          <Btn href="/admin/groups/new" variant="dark" size="md">
            Add a cooperative
          </Btn>
        </div>

        {dormant.length > 0 && (
          <div className="border border-amber bg-card p-4 mb-5">
            <div className="font-mono text-[11.5px] text-text-dim mb-2">
              NEVER RUN A POOL · {dormant.length}
            </div>
            <p className="text-[14.5px] leading-relaxed text-text-mid">
              {dormant.map((g) => g.name).join(", ")}. A coordinator who signed up and never opened
              anything usually needs a call, not another email.
            </p>
          </div>
        )}

        {groups.length === 0 ? (
          <div className="border border-ink bg-card px-6 py-14 text-center">
            <div className="font-display text-[24px] tracking-tight mb-2">
              No cooperatives yet
            </div>
            <p className="text-[15px] text-text-dim max-w-[52ch] mx-auto mb-4">
              A cooperative lets one person collect cash from their neighbours and pay in a single
              transfer, which is how most of Nigeria actually buys together.
            </p>
            <Btn href="/admin/groups/new" size="md">
              Add the first one
            </Btn>
          </div>
        ) : (
          <GridTable
            columns="1.4fr 1.2fr .7fr .7fr .8fr .9fr"
            headers={["COOPERATIVE", "COORDINATOR", "MEMBERS", "POOLS", "FEE", "COLLECTED"]}
            fontSize={13}
            rows={groups.map((g) => [
              <Link key="n" href={`/admin/groups/${g.slug}`} className="underline font-semibold">
                {g.name}
              </Link>,
              <span key="c" className="font-mono text-[12px]">
                {g.coordinatorName || "unnamed"}
                <br />
                <span className="text-text-dim">{formatPhone(g.coordinatorPhone)}</span>
              </span>,
              String(g.memberCount),
              <span key="p" className={g.poolCount === 0 ? "text-text-dim" : ""}>
                {g.openPoolCount > 0 ? `${g.openPoolCount} open` : String(g.poolCount)}
              </span>,
              `${(g.feePctBasisPoints / 100).toFixed(1)}%`,
              formatKobo(g.collectedKobo),
            ])}
            footer={`${groups.length} cooperatives · ${formatKobo(totalCollectedKobo)} collected through them`}
          />
        )}
      </div>
    </div>
  );
}
