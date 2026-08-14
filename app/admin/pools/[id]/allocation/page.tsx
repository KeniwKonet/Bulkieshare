import { OpsHeader } from "@/components/nav";
import { Btn, GridTable } from "@/components/ui";

export const metadata = { title: "Allocation" };

const ROWS: [string, string, string, string, string][] = [
  ["01", "Tolu Okafor", "2.61kg", "41%", "normal"],
  ["02", "Aisha Bello", "2.58kg", "44%", "prioritised"],
  ["03", "Hauwa Ibrahim", "2.62kg", "38%", "normal"],
  ["31", "Musa Danjuma", "2.52kg", "35.6%", "prioritised next"],
];

export default async function AllocationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="min-h-screen bg-paper text-ink">
      <OpsHeader active="allocation" />
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-8">
        <div className="font-mono text-[11.5px] text-text-dim mb-1.5">
          ALLOCATION · {id.toUpperCase()} · SEED PUBLISHED 6 AUG
        </div>
        <h1 className="font-display text-[28px] tracking-tight mb-2.5">
          Split 104.4kg between 40 members
        </h1>
        <p className="text-[15px] leading-relaxed text-text-dim mb-5">
          The seed was published two days before this ran, so nobody can claim we tuned the draw
          after seeing who was in the pool. Members who drew below average in A-2140 and A-2166
          are prioritised for prime cuts.
        </p>

        <div className="border border-ink bg-card mb-4">
          <div className="px-4 py-2.5 bg-ink text-dark-dim-2 font-mono text-[11.5px] flex justify-between">
            <span>FAIRNESS CHECK</span>
            <span>SEED a2190-7fd41c</span>
          </div>
          <div className="flex justify-between text-[14px] px-4 py-2.5 border-b border-rule-card">
            <span>Prime share, target 40%</span>
            <span className="font-mono">39.6% mean, ±2.1%</span>
          </div>
          <div className="flex justify-between text-[14px] px-4 py-2.5 border-b border-rule-card">
            <span>Secondary, target 40%</span>
            <span className="font-mono">40.2% mean</span>
          </div>
          <div className="flex justify-between text-[14px] px-4 py-2.5 border-b border-rule-card">
            <span>Widest deviation from mean</span>
            <span className="font-mono">4.4%, member #31</span>
          </div>
          <div className="flex justify-between text-[14px] px-4 py-2.5">
            <span>Members below nominal weight</span>
            <span className="font-mono text-green">0 of 40</span>
          </div>
        </div>

        <GridTable
          columns=".5fr 1.3fr .9fr .9fr 1fr"
          headers={["#", "MEMBER", "WEIGHT", "PRIME", "PRIORITY"]}
          rows={ROWS.map(([n, name, weight, prime, priority]) => [
            <span key="n" className="font-mono text-text-dim">
              {n}
            </span>,
            name,
            <span key="w" className="font-mono">
              {weight}
            </span>,
            <span key="p" className="font-mono">
              {prime}
            </span>,
            <span key="pr" className={priority === "normal" ? "text-text-dim" : "text-green"}>
              {priority}
            </span>,
          ])}
          footer="36 more rows · surplus 4.4kg as bonus portions to the 8 lowest prime shares"
        />

        <div className="flex flex-wrap gap-2.5 mt-5">
          <Btn size="lg">Publish to 40 members</Btn>
          <Btn variant="outline" size="lg">
            Override with a reason
          </Btn>
        </div>
        <p className="font-mono text-[11px] leading-relaxed text-text-dim mt-2.5">
          An override records who did it and why, and appears in the public pool report. There
          have been two, both for a member who could not eat pork.
        </p>
      </div>
    </div>
  );
}
