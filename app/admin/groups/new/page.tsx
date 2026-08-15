import Link from "next/link";

import { OpsHeader } from "@/components/nav";
import { NewGroupForm } from "@/components/staff-forms";
import { requireOps } from "@/lib/auth/dal";
import { listAreas, listHubs } from "@/lib/domain/pools";

export const metadata = { title: "Add a cooperative" };

export default async function NewGroupPage() {
  await requireOps();

  const [areas, hubs] = await Promise.all([listAreas(), listHubs()]);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <OpsHeader active="groups" />
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-8">
        <div className="font-mono text-[11.5px] text-text-dim mb-1">
          <Link href="/admin/groups" className="underline">
            COOPERATIVES
          </Link>{" "}
          / NEW
        </div>
        <h1 className="font-display text-[28px] tracking-tight mb-2">Add a cooperative</h1>
        <p className="text-[15px] leading-relaxed text-text-dim mb-6 max-w-[62ch]">
          One person collects cash from their neighbours and pays in a single transfer. Naming them
          coordinator lets them open pools for the group and earn a fee on each one that completes.
        </p>

        <NewGroupForm
          areas={areas.map((a) => ({ slug: a.slug, label: a.label }))}
          hubs={hubs.map((h) => ({ id: h.id, name: h.name, areaSlug: h.areaSlug }))}
        />
      </div>
    </div>
  );
}
