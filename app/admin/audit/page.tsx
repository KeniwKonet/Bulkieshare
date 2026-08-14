import { AdminResourceTable } from "@/components/admin-resource-table";

export const metadata = { title: "Audit log" };

export default function AuditPage() {
  return (
    <AdminResourceTable
      title="Audit log"
      subtitle="Every money movement and every view of personal data, attributed to a user. Standard resource table. Generated, not designed."
      columns="1fr 1.6fr 1fr"
      headers={["WHEN", "EVENT", "USER"]}
      rows={[
        ["TUE 08:14", "Viewed member 4471 (Tolu Okafor)", "A. Nwosu"],
        ["TUE 07:42", "Approved refund batch A-2226 (2nd approver)", "A. Nwosu"],
        ["MON 17:42", "Approved refund batch A-2226 (1st approver)", "A. Nwosu"],
        ["MON 11:05", "Published allocation A-2190, seed a2190-7fd41c", "T. Bello"],
        ["SUN 09:00", "Opened pool A-2244, quote KGM-Q118", "T. Bello"],
      ]}
    />
  );
}
