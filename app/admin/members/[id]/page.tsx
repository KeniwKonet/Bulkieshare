import { OpsHeader } from "@/components/nav";
import { Btn, StatGrid } from "@/components/ui";

export const metadata = { title: "Member 360" };

const HISTORY: [string, string][] = [
  ["TUE 07:41", "Unmatched ₦8,400 from A IBRAHIM, possibly for her"],
  ["MON 19:02", "Overpaid ₦200, resolved to credit"],
  ["SAT 10:31", "Collected 2 slots at Kuje, 2.61kg and 2.58kg, codes 4471 and 8103"],
  ["02 AUG", "Paid ₦16,800 for A-2190, 12 beneficiaries named"],
  ["24 JUL", "Credited ₦740, yield shortfall on A-2214"],
];

export default async function Member360Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="min-h-screen bg-paper text-ink">
      <OpsHeader active="members" />
      <div className="max-w-2xl mx-auto px-5 sm:px-8 py-8">
        <div className="flex justify-between items-center mb-5 flex-wrap gap-2">
          <div>
            <span className="font-display text-[22px]">Tolu Okafor</span>{" "}
            <span className="font-mono text-[11.5px] text-text-dim">0803 441 9022</span>
          </div>
          <span className="font-mono text-[10.5px] bg-ink text-amber px-2 py-1">
            VIEW LOGGED · A. NWOSU
          </span>
        </div>

        <StatGrid
          columns={4}
          items={[
            { label: "POOLS", value: "6" },
            { label: "SPENT", value: "₦174k" },
            { label: "CREDIT", value: "₦1,940" },
            { label: "DISPUTES", value: "1" },
          ]}
        />

        <div className="font-mono text-[11px] text-text-dim mt-6 mb-2.5">
          EVERYTHING THAT HAPPENED, NEWEST FIRST
        </div>
        <div className="font-mono text-[12.5px]">
          {HISTORY.map(([at, label], i) => (
            <div
              key={at}
              className={`grid grid-cols-[88px_1fr] py-2 ${
                i < HISTORY.length - 1 ? "border-b border-rule" : ""
              }`}
            >
              <span className="text-text-dim">{at}</span>
              <span className="font-sans text-[14px]">{label}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 mt-5">
          <Btn variant="outline" size="sm">
            Resend her code
          </Btn>
          <Btn variant="outline" size="sm">
            Add goodwill credit
          </Btn>
          <Btn variant="outline-rust" size="sm">
            Suspend account
          </Btn>
        </div>
        <p className="font-mono text-[10.5px] leading-relaxed text-text-dim mt-3">
          Goodwill above ₦5,000 needs a second approver. Every action here is attributed to you by
          name. Viewing member #{id} was just logged.
        </p>
      </div>
    </div>
  );
}
