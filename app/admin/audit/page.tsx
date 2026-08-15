import { AdminResourceTable } from "@/components/admin-resource-table";
import { requireOps } from "@/lib/auth/dal";
import { listAuditEvents } from "@/lib/domain/ops";
import { formatEventStamp } from "@/lib/time";

export const metadata = { title: "Audit log" };

export default async function AuditPage() {
  await requireOps();

  const events = await listAuditEvents();

  return (
    <AdminResourceTable
      title="Audit log"
      subtitle="Every money movement and every view of personal data, attributed to a user."
      active="audit"
      columns="1fr 1.1fr 1.5fr 1fr"
      headers={["WHEN", "ACTION", "SUBJECT", "USER"]}
      rows={events.map((e) => [
        <span key="w" className="font-mono text-[12.5px]">
          {formatEventStamp(e.at)}
        </span>,
        <span key="a" className="font-mono text-[12.5px]">
          {e.action}
        </span>,
        e.subject || "—",
        e.actorName || e.actorLabel,
      ])}
      footer={`${events.length} most recent events`}
    />
  );
}
