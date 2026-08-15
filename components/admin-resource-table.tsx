import type { ReactNode } from "react";

import { OpsHeader } from "./nav";
import { GridTable } from "./ui";

/** Shared shell for the plainer back-office tables. */
export function AdminResourceTable({
  title,
  subtitle,
  active,
  columns,
  headers,
  rows,
  footer,
  children,
}: {
  title: string;
  subtitle: string;
  active: Parameters<typeof OpsHeader>[0]["active"];
  columns: string;
  headers: string[];
  rows: ReactNode[][];
  footer?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <OpsHeader active={active} />
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-8">
        <h1 className="font-display text-[26px] tracking-tight mb-1">{title}</h1>
        <p className="text-[14.5px] text-text-dim mb-5">{subtitle}</p>
        {rows.length === 0 ? (
          <p className="border border-ink bg-card px-5 py-10 text-center text-[15px] text-text-dim">
            Nothing here yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <GridTable columns={columns} headers={headers} rows={rows} footer={footer} />
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
