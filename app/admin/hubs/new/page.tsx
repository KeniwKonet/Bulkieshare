import Link from "next/link";

import { OpsHeader } from "@/components/nav";
import { NewHubForm } from "@/components/ops-forms";
import { requireOps } from "@/lib/auth/dal";
import { listAreas } from "@/lib/domain/pools";

export const metadata = { title: "Add a hub" };

export default async function NewHubPage() {
  await requireOps();
  const areas = await listAreas();

  return (
    <div className="min-h-screen bg-paper text-ink">
      <OpsHeader active="hubs" />
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-8">
        <div className="font-mono text-[11.5px] text-text-dim mb-1">
          <Link href="/admin/hubs" className="underline">
            HUBS
          </Link>{" "}
          / NEW
        </div>
        <h1 className="font-display text-[28px] tracking-tight mb-2">Add a hub</h1>
        <p className="text-[15px] leading-relaxed text-text-dim mb-6 max-w-[62ch]">
          A hub is where members collect. Every pool names exactly one, so an area cannot run a
          pool until it has at least one hub with an agent working it.
        </p>

        <NewHubForm areas={areas.map((a) => ({ slug: a.slug, label: a.label }))} />
      </div>
    </div>
  );
}
