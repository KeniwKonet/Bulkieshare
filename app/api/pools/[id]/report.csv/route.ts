import { getPool, getPoolReport, getPoolTimeline } from "@/lib/domain/pools";
import { koboToNaira } from "@/lib/money";

/**
 * The pool report as CSV, so the transparency claim survives contact with a
 * spreadsheet. Public, exactly like the report page it sits behind.
 */

function esc(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const pool = await getPool(id);
  if (!pool) return new Response("Not found", { status: 404 });

  const [report, timeline] = await Promise.all([getPoolReport(pool.id), getPoolTimeline(pool.id)]);
  if (!report) return new Response("No report published for this pool", { status: 404 });

  const rows: (string | number)[][] = [
    ["section", "label", "value"],
    ["pool", "code", pool.code],
    ["pool", "title", pool.title],
    ["pool", "hub", pool.hubName],
    ["pool", "supplier", pool.supplierName ?? ""],
    ["pool", "slots_total", pool.totalSlots],
    ["pool", "slots_paid", pool.paidSlots],
    ["pool", "threshold", pool.threshold],
    ["pool", "price_per_slot_naira", koboToNaira(pool.pricePerSlotKobo)],
    ["pool", "allocation_seed", pool.allocationSeed ?? ""],
    ["report", "completed_at", report.completedAt.toISOString()],
    ["report", "collected_naira", koboToNaira(report.collectedKobo)],
    ["report", "live_weight_g", report.liveWeightGrams ?? ""],
    ["report", "usable_weight_g", report.usableWeightGrams ?? ""],
    ["report", "nominal_weight_g", report.nominalWeightGrams ?? ""],
    ["report", "yield_variance_basis_points", report.yieldVarianceBasisPoints],
    ["report", "handovers", report.handovers],
    ["report", "disputes", report.disputes],
    ["report", "margin_naira", koboToNaira(report.marginKobo)],
    ...report.costBreakdown.map((c) => ["cost", c.label, koboToNaira(c.amountKobo)]),
    ...timeline.map((t) => ["timeline", t.at.toISOString(), t.label]),
  ];

  const csv = rows.map((r) => r.map(esc).join(",")).join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bulkieshare-${pool.code}-report.csv"`,
    },
  });
}
