import { GroupsShell } from "@/components/nav";
import { GridTable, StatGrid } from "@/components/ui";

export const metadata = { title: "My fees" };

const FEE_ROWS: [string, string, string, string][] = [
  ["Cow · #A-2190", "40", "₦11,800", "09 Aug"],
  ["Beans · #A-2185", "30", "₦6,900", "21 Jul"],
  ["Rice · #A-2231", "14", "₦4,200", "on completion"],
  ["Catfish · #A-2166", "14 of 50", "₦0", "cancelled"],
];

export default async function FeesPage({ params }: { params: Promise<{ org: string }> }) {
  const { org } = await params;
  return (
    <GroupsShell org={org} orgName="Gwarinpa Women's Cooperative" active="fees">
      <div className="max-w-2xl">
        <div className="flex justify-between items-center mb-5">
          <h1 className="font-display text-[26px] tracking-tight">My fees</h1>
          <span className="font-mono text-[11.5px] text-text-dim">2026 TO DATE</span>
        </div>
        <StatGrid
          columns={3}
          items={[
            { label: "PAID TO YOU", value: "₦31,600" },
            { label: "VAT WITHHELD", value: "₦2,370" },
            { label: "DUE ON COMPLETION", value: "₦4,200" },
          ]}
        />
        <div className="mt-6">
          <GridTable
            columns="1.4fr .8fr .8fr .9fr"
            headers={["POOL", "SLOTS", "FEE", "PAID"]}
            rows={FEE_ROWS.map(([pool, slots, fee, paid]) => [
              pool,
              slots,
              fee,
              paid === "cancelled" ? (
                <span key="p" className="text-text-dim">
                  {paid}
                </span>
              ) : paid === "on completion" ? (
                <span key="p" className="text-rust">
                  {paid}
                </span>
              ) : (
                <span key="p" className="text-green">
                  {paid}
                </span>
              ),
            ])}
          />
        </div>
        <p className="text-[14.5px] leading-relaxed text-text-dim mt-4">
          A cancelled pool earns nothing. That is deliberate: the fee exists to reward a pool that
          fills and gets collected, not one that was opened.
        </p>
      </div>
    </GroupsShell>
  );
}
