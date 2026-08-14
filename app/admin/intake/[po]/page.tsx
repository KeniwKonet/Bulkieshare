import { OpsHeader } from "@/components/nav";
import { Btn, GridTable, PhotoPlaceholder } from "@/components/ui";

export const metadata = { title: "Intake and QC" };

export default async function IntakePage({ params }: { params: Promise<{ po: string }> }) {
  const { po } = await params;
  return (
    <div className="min-h-screen bg-paper text-ink">
      <OpsHeader active="intake" />
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-8">
        <div className="font-mono text-[11.5px] text-text-dim mb-1.5">
          INTAKE AND QC · {po.toUpperCase()} · KUJE YARD
        </div>
        <h1 className="font-display text-[28px] tracking-tight mb-5">
          2 head of cattle, weighed on arrival
        </h1>

        <GridTable
          columns="1fr 1fr 1fr"
          headers={["ANIMAL", "LIVE WEIGHT", "QC"]}
          rows={[
            ["Tag 8859-A", "238.0kg", <span key="q" className="text-green font-semibold">passed</span>],
            ["Tag 8859-B", "226.5kg", <span key="q" className="text-green font-semibold">passed</span>],
          ]}
        />

        <div className="border border-ink bg-card p-4.5 my-5">
          <div className="font-mono text-[11px] text-text-dim mb-2.5">USABLE YIELD AFTER BUTCHERING</div>
          <div className="flex justify-between font-mono text-[13.5px] py-1.5 border-b border-rule-card">
            <span>Nominal owed, 40 × 2.5kg</span>
            <span>100.0kg</span>
          </div>
          <div className="flex justify-between font-mono text-[13.5px] py-1.5 border-b border-rule-card">
            <span>Usable after QC</span>
            <span>104.4kg</span>
          </div>
          <div className="flex justify-between font-mono text-[13.5px] py-1.5">
            <span>Variance</span>
            <span className="text-green">+4.4%, within ±8%</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 mb-5">
          <PhotoPlaceholder caption="weighbridge ticket" height={110} align="end" />
          <PhotoPlaceholder caption="both animals, tags visible" height={110} align="end" />
        </div>

        <Btn variant="dark" size="lg" block>
          Pass QC and release ₦162,900 balance
        </Btn>
        <p className="font-mono text-[11px] leading-relaxed text-text-dim mt-2.5">
          Balance is due within 48 hours of this click. A rejection needs a reason code and a
          photo before it can be saved.
        </p>
      </div>
    </div>
  );
}
