import Link from "next/link";
import { notFound } from "next/navigation";

import { OpsHeader } from "@/components/nav";
import { GoodwillCreditForm, MemberRoleForm } from "@/components/ops-forms";
import { BlockMemberButton } from "@/components/staff-forms";
import { StatGrid } from "@/components/ui";
import { requireOps } from "@/lib/auth/dal";
import { getMemberDetail, recordAudit } from "@/lib/domain/ops";
import { listHubs } from "@/lib/domain/pools";
import { listMemberDisputes } from "@/lib/domain/support";
import { formatKobo, formatKoboSigned } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { formatEventStamp } from "@/lib/time";

export const metadata = { title: "Member 360" };

export default async function Member360Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ops = await requireOps();

  const detail = await getMemberDetail(id);
  if (!detail) notFound();

  const { member, commitments, credit } = detail;
  const [disputes, hubs] = await Promise.all([
    listMemberDisputes(member.id),
    listHubs(),
  ]);

  // Looking at someone's full record is itself an auditable act.
  await recordAudit({
    actorId: ops.id,
    actorLabel: ops.name || "Ops desk",
    action: "member.viewed",
    subject: member.id,
  });

  const spentKobo = commitments.reduce((sum, c) => sum + c.paidKobo, 0);

  // One merged, newest-first history from every record we hold on them.
  const history = [
    ...commitments.map((c) => ({
      at: c.createdAt,
      text: `Paid ${formatKobo(c.paidKobo)} for ${c.slots} slot${c.slots === 1 ? "" : "s"} in ${c.poolTitle} (#${c.poolCode})`,
    })),
    ...credit.map((m) => ({
      at: m.createdAt,
      text: `${m.label}${m.detail ? ` — ${m.detail}` : ""}: ${formatKoboSigned(m.amountKobo)}`,
    })),
    ...disputes.map((d) => ({
      at: d.createdAt,
      text: `Raised dispute ${d.reference}: ${d.reasonLabel} (${d.state})`,
    })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  return (
    <div className="min-h-screen bg-paper text-ink">
      <OpsHeader active="members" />
      <div className="max-w-2xl mx-auto px-5 sm:px-8 py-8">
        <div className="flex justify-between items-center mb-5 flex-wrap gap-2">
          <div>
            <span className="font-display text-[22px]">{member.name || "Unnamed member"}</span>{" "}
            <span className="font-mono text-[11.5px] text-text-dim">
              {formatPhone(member.phone)}
            </span>
          </div>
          <span className="font-mono text-[10.5px] bg-ink text-amber px-2 py-1">
            VIEW LOGGED · {(ops.name || "OPS").toUpperCase()}
          </span>
        </div>

        <StatGrid
          columns={4}
          items={[
            { label: "POOLS", value: String(commitments.length) },
            { label: "SPENT", value: formatKobo(spentKobo) },
            { label: "CREDIT", value: formatKobo(member.creditKobo) },
            {
              label: "DISPUTES",
              value: String(disputes.length),
              valueClassName: disputes.some((d) => d.state === "open") ? "text-rust-dark" : undefined,
            },
          ]}
        />

        <div className="font-mono text-[11px] text-text-dim mt-6 mb-2.5">
          EVERYTHING THAT HAPPENED, NEWEST FIRST
        </div>

        {history.length === 0 ? (
          <p className="text-[14.5px] text-text-dim">Nothing on this account yet.</p>
        ) : (
          <div className="font-mono text-[12.5px]">
            {history.map((h, i) => (
              <div
                key={`${h.at.toISOString()}-${i}`}
                className={`grid grid-cols-[110px_1fr] gap-2 py-2 ${
                  i < history.length - 1 ? "border-b border-rule" : ""
                }`}
              >
                <span className="text-text-dim">{formatEventStamp(h.at)}</span>
                <span className="font-sans text-[14px]">{h.text}</span>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          <div className="border border-ink bg-card p-4.5">
            <div className="font-mono text-[11.5px] text-text-dim mb-3">ROLE</div>
            <MemberRoleForm
              memberId={member.id}
              currentRole={member.role}
              currentHubId={member.homeHubId}
              hubs={hubs.map((h) => ({ id: h.id, name: h.name }))}
              isSelf={member.id === ops.id}
            />
          </div>
          <div className="border border-ink bg-card p-4.5">
            <div className="font-mono text-[11.5px] text-text-dim mb-3">
              GOODWILL CREDIT
            </div>
            <GoodwillCreditForm memberId={member.id} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-5 items-center">
          <BlockMemberButton memberId={member.id} blocked={member.isBlocked} />
          <Link
            href="/admin/members"
            className="border border-ink font-semibold text-[13px] px-3 py-1.5"
          >
            Back to members
          </Link>
        </div>

        <p className="font-mono text-[10.5px] leading-relaxed text-text-dim mt-3">
          Every action here is attributed to you by name. Opening this record was just logged.
        </p>
      </div>
    </div>
  );
}
