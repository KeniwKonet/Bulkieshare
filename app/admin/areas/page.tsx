import { AdminResourceTable } from "@/components/admin-resource-table";

export const metadata = { title: "Areas" };

export default function AreasPage() {
  return (
    <AdminResourceTable
      title="Areas"
      subtitle="Standard resource table. Generated, not designed."
      columns="1fr 1fr 1fr 1fr"
      headers={["AREA", "STATE", "HUBS", "WAITLIST"]}
      rows={[
        ["Abuja", "live", "4", "—"],
        ["Lagos", "not live", "0", "1,204"],
        ["Enugu", "not live", "0", "340"],
        ["Port Harcourt", "not live", "0", "118"],
      ]}
    />
  );
}
