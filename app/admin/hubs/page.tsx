import { AdminResourceTable } from "@/components/admin-resource-table";
import { HUBS } from "@/lib/mock-data";

export const metadata = { title: "Hubs" };

export default function AdminHubsPage() {
  return (
    <AdminResourceTable
      title="Hubs"
      subtitle="Standard resource table. Generated, not designed."
      columns="1.2fr 1.5fr 1fr .8fr"
      headers={["HUB", "WINDOWS", "CAPACITY/HR", "OPEN POOLS"]}
      rows={HUBS.map((h) => [h.name, h.windows, h.capacityPerHour, h.openPools])}
    />
  );
}
