import Link from "next/link";
import { notFound } from "next/navigation";

import { OpsHeader } from "@/components/nav";
import { ChangeCoordinatorForm, OpsGroupFeeForm } from "@/components/staff-forms";
import { GridTable, StatGrid, Tag } from "@/components/ui";
import { requireOps } from "@/lib/auth/dal";
import {
  getGroupBySlug,
  listCoordinatorFees,
  listGroupMembers,
  totalCoordinatorEarnings,
} from "@/lib/domain/groups";
import { formatKobo } from "@/lib/money";
import { formatPhone } from "@/lib/phone";

export const metadata = { title: "Cooperative" };

export default async function AdminGroupDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await requireOps();

  const group = await getGroupBySlug(slug);
  if (!group) notFound();

  const [members, fees, earnings] = await Promise.all([
    listGroupMembers(group.id),
    listCoordinatorFees(group.id),
    totalCoordinatorEarnings(group.id),
  ]);

  const collectedKobo = fees.reduce((sum, f) => sum + f.collectedKobo, 0);
  const signedIn = members.filter((m) => m.name).length;
  const openPools = fees.filter((f) => f.pool.isOpen);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <OpsHeader active="groups" />
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-8">
        <div className="flex justify-between items-start mb-5 flex-wrap gap-3">
          <div>
            <div className="font-mono text-[11.5px] text-text-dim mb-1">
              <Link href="/admin/groups" className="underline">
                COOPERATIVES
              </Link>{" "}
              / {group.slug.toUpperCase()}
            </div>
            <h1 className="font-display text-[30px] tracking-tight">{group.name}</h1>
            <p className="text-[14.5px] text-text-dim mt-1">
              {group.areaSlug}
              {group.hubName ? ` · ${group.hubName}` : ""} · run by {group.coordinatorName}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Tag tone={openPools.length > 0 ? "lime" : "outline"}>
              {openPools.length > 0 ? `${openPools.length} POOL OPEN` : "NOTHING OPEN"}
            </Tag>
            <Link
              href={`/groups/${group.slug}`}
              className="font-mono text-[11.5px] border border-ink px-2.5 py-1.5"
            >
              open coordinator view
            </Link>
          </div>
        </div>

        <StatGrid
          columns={4}
          items={[
            { label: "MEMBERS", value: String(group.memberCount), sub: `${signedIn} signed in` },
            { label: "POOLS RUN", value: String(fees.length) },
            { label: "COLLECTED", value: formatKobo(collectedKobo) },
            {
              label: "COORDINATOR FEES",
              value: formatKobo(earnings.paidKobo),
              sub: `${formatKobo(earnings.pendingKobo)} pending`,
            },
          ]}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
          <div className="border border-ink bg-card p-4.5">
            <div className="font-mono text-[11.5px] text-text-dim mb-2">COORDINATOR</div>
            <div className="text-[16px] font-bold">{group.coordinatorName || "unnamed"}</div>
            <div className="font-mono text-[12.5px] text-text-dim mb-3.5">
              <Link href={`/admin/members/${group.coordinatorId}`} className="underline">
                open member record
              </Link>
            </div>
            <div className="border-t border-rule pt-3.5">
              <div className="font-mono text-[11px] text-text-dim mb-2">HAND OVER TO SOMEONE</div>
              <ChangeCoordinatorForm groupId={group.id} />
              <p className="font-mono text-[11px] leading-relaxed text-text-dim mt-2">
                The outgoing coordinator drops back to being an ordinary member unless they still
                run another cooperative.
              </p>
            </div>
          </div>

          <div className="border border-ink bg-card p-4.5">
            <div className="font-mono text-[11.5px] text-text-dim mb-2">COORDINATOR FEE</div>
            <div className="font-display text-[30px] mb-2">
              {(group.feePctBasisPoints / 100).toFixed(1)}%
            </div>
            <p className="text-[14px] text-text-dim leading-relaxed mb-3.5">
              Charged on what each pool collects, paid only once it completes. A cancelled pool
              earns nothing.
            </p>
            <OpsGroupFeeForm groupId={group.id} currentPct={group.feePctBasisPoints / 100} />
          </div>
        </div>

        <div className="font-mono text-[11.5px] text-text-dim mt-8 mb-2.5">POOLS</div>
        {fees.length === 0 ? (
          <p className="text-[14.5px] text-text-dim">
            This cooperative has never opened a pool.
          </p>
        ) : (
          <GridTable
            columns="1.4fr .8fr .8fr 1fr .9fr"
            headers={["POOL", "PAID", "STATE", "COLLECTED", "FEE"]}
            fontSize={13}
            rows={fees.map((f) => [
              <Link
                key="p"
                href={`/${f.pool.areaSlug}/pools/${f.pool.id}`}
                className="underline font-semibold"
              >
                {f.pool.title} · #{f.pool.code}
              </Link>,
              `${f.pool.paidSlots}/${f.pool.totalSlots}`,
              f.pool.state,
              formatKobo(f.collectedKobo),
              f.isPaid ? (
                <span key="f" className="text-green">
                  {formatKobo(f.feeKobo)}
                </span>
              ) : (
                formatKobo(f.feeKobo)
              ),
            ])}
          />
        )}

        <div className="font-mono text-[11.5px] text-text-dim mt-8 mb-2.5">
          MEMBERS · {members.length}
        </div>
        {members.length === 0 ? (
          <p className="text-[14.5px] text-text-dim">Nobody has been added to this cooperative.</p>
        ) : (
          <GridTable
            columns="1.4fr 1.1fr .7fr"
            headers={["NAME", "PHONE", "POOLS"]}
            fontSize={13}
            rows={members.map((m) => [
              <Link key="n" href={`/admin/members/${m.memberId}`} className="underline">
                {m.name || "not signed in yet"}
              </Link>,
              formatPhone(m.phone),
              String(m.pools),
            ])}
            footer={`${signedIn} of ${members.length} have signed in`}
          />
        )}
      </div>
    </div>
  );
}
