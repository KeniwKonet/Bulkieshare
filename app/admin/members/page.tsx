import Link from "next/link";

import { OpsHeader } from "@/components/nav";
import { GridTable } from "@/components/ui";
import { requireOps } from "@/lib/auth/dal";
import { searchMembers } from "@/lib/domain/ops";
import { formatKobo } from "@/lib/money";
import { formatPhone } from "@/lib/phone";

export const metadata = { title: "Members" };

export default async function MembersIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireOps();
  const { q } = await searchParams;

  const members = await searchMembers(q);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <OpsHeader active="members" />
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-8">
        <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
          <h1 className="font-display text-[26px] tracking-tight">Members</h1>
          <form className="flex gap-2">
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Name or phone"
              className="border border-ink bg-card px-3 py-2 text-[14px] w-56"
            />
            <button type="submit" className="border border-ink font-semibold text-[13px] px-3 py-2">
              Search
            </button>
          </form>
        </div>

        <p className="text-[14.5px] text-text-dim mb-5">
          {members.length} shown{q ? ` for “${q}”` : ""}. Opening a member record is logged.
        </p>

        <GridTable
          columns="1.3fr 1.1fr .8fr .7fr .8fr .8fr"
          headers={["NAME", "PHONE", "ROLE", "POOLS", "CREDIT", "DISPUTES"]}
          fontSize={13}
          rows={members.map((m) => [
            <Link key="n" href={`/admin/members/${m.id}`} className="underline">
              {m.name || "unnamed"}
            </Link>,
            formatPhone(m.phone),
            <span key="r" className={m.isBlocked ? "text-rust-dark" : ""}>
              {m.isBlocked ? "blocked" : m.role}
            </span>,
            String(m.pools),
            formatKobo(m.creditKobo),
            <span key="d" className={m.openDisputes > 0 ? "text-rust-dark" : ""}>
              {m.openDisputes}
            </span>,
          ])}
        />
      </div>
    </div>
  );
}
