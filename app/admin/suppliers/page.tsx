import { AdminResourceTable } from "@/components/admin-resource-table";

export const metadata = { title: "Suppliers" };

export default function AdminSuppliersPage() {
  return (
    <AdminResourceTable
      title="Suppliers"
      subtitle="Standard resource table. Generated, not designed."
      columns="1.4fr 1fr 1fr 1fr"
      headers={["SUPPLIER", "SUPPLIES", "ON TIME", "STATUS"]}
      rows={[
        ["Kuje Livestock Aggregators", "Cattle, ram, goat", "94%", "verified"],
        ["Gwagwalada Livestock Aggregators", "Ram, goat", "97%", "verified"],
        ["Gwagwalada Aquaculture", "Catfish", "91%", "verified"],
        ["Karu Grains", "Rice, beans", "99%", "verified"],
        ["Kogi Palm Millers Cooperative", "Palm oil", "88%", "onboarding"],
      ]}
    />
  );
}
