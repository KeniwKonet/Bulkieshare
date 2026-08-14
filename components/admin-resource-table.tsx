import { OpsHeader } from "@/components/nav";
import { GridTable } from "@/components/ui";

export function AdminResourceTable({
  title,
  subtitle,
  columns,
  headers,
  rows,
}: {
  title: string;
  subtitle: string;
  columns: string;
  headers: string[];
  rows: (string | number)[][];
}) {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <OpsHeader active="pools" />
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-8">
        <h1 className="font-display text-[26px] tracking-tight mb-1">{title}</h1>
        <p className="text-[14.5px] text-text-dim mb-5">{subtitle}</p>
        <div className="overflow-x-auto">
          <GridTable columns={columns} headers={headers} rows={rows} />
        </div>
      </div>
    </div>
  );
}
