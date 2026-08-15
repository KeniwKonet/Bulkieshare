import { AdminResourceTable } from "@/components/admin-resource-table";
import { ToggleAreaButton } from "@/components/staff-forms";
import { requireOps } from "@/lib/auth/dal";
import { listAreasWithCounts } from "@/lib/domain/ops";

export const metadata = { title: "Areas" };

export default async function AreasPage() {
  await requireOps();

  const areas = await listAreasWithCounts();

  return (
    <AdminResourceTable
      title="Areas"
      subtitle="An area goes live when it has a hub and enough people asking for it."
      active="areas"
      columns="1fr .8fr .6fr .7fr .8fr .9fr"
      headers={["AREA", "STATE", "HUBS", "POOLS", "WAITLIST", ""]}
      rows={areas.map((a) => [
        a.label,
        <span key="s" className={a.isLive ? "text-green" : "text-text-dim"}>
          {a.isLive ? "live" : "not live"}
        </span>,
        String(a.hubs),
        String(a.pools),
        String(a.waitlist),
        <ToggleAreaButton key="t" area={a.slug} live={a.isLive} />,
      ])}
      footer={`${areas.filter((a) => a.isLive).length} of ${areas.length} live`}
    />
  );
}
