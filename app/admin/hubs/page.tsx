import { AdminResourceTable } from "@/components/admin-resource-table";
import { requireOps } from "@/lib/auth/dal";
import { listHubs } from "@/lib/domain/pools";

export const metadata = { title: "Hubs" };

export default async function AdminHubsPage() {
  await requireOps();

  const hubs = await listHubs();

  return (
    <AdminResourceTable
      title="Hubs"
      subtitle="Where members collect. Capacity per hour is what generates the bookable windows."
      active="hubs"
      columns="1.1fr 1.4fr 1.3fr .8fr .7fr"
      headers={["HUB", "ADDRESS", "WINDOWS", "CAP/HR", "OPEN"]}
      rows={hubs.map((h) => [
        h.name,
        h.address,
        h.windows,
        String(h.capacityPerHour),
        String(h.openPools),
      ])}
      footer={`${hubs.length} hubs`}
    />
  );
}
