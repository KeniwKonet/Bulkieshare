import { PhoneShell } from "@/components/nav";
import { Btn, ProgressBar } from "@/components/ui";

export const metadata = { title: "Hub agent" };

const QUEUE = [
  { name: "Tolu Okafor", detail: "2 slots · codes 4471, 8103", status: "here" as const },
  { name: "Hauwa Ibrahim", detail: "1 slot · code 2210", status: "waiting" as const },
  { name: "Ngozi Eze", detail: "1 slot · code 8845", status: "waiting" as const },
  { name: "Musa Danjuma", detail: "1 slot · collected 10:04", status: "done" as const },
];

export default function HubQueuePage() {
  return (
    <div className="bg-[#8E8C86] min-h-screen py-6">
      <PhoneShell dark>
        <div className="px-4.5 py-3.5 bg-rust flex justify-between items-center font-mono text-[12px] font-semibold">
          <span>OFFLINE · 6 HANDOVERS QUEUED</span>
          <span>SYNCS WHEN BACK</span>
        </div>
        <div className="px-4.5 py-4.5 border-b border-dark-rule-2">
          <div className="font-mono text-[11.5px] text-dark-dim-2">KUJE HUB · SAT 16 AUG · POOL #A-2190</div>
          <div className="font-display text-[28px] tracking-tight mt-1">18 of 40 done</div>
          <div className="mt-2.5">
            <ProgressBar paidPct={45} height={12} onDark />
          </div>
        </div>
        <div className="px-4.5 py-4.5">
          <div className="font-mono text-[11.5px] text-dark-dim-2 mb-3">10:20 TO 10:40 WINDOW</div>
          <div className="flex flex-col gap-2.5">
            {QUEUE.map((q) => (
              <div
                key={q.name}
                className={`border px-3.5 py-3.5 flex justify-between items-center ${
                  q.status === "here"
                    ? "border-lime bg-[#1A1A18]"
                    : q.status === "done"
                      ? "border-dark-rule-2 opacity-50"
                      : "border-dark-rule-2"
                }`}
              >
                <div>
                  <div className={`text-[17px] ${q.status === "here" ? "font-bold" : "font-semibold"}`}>
                    {q.name}
                  </div>
                  <div className="font-mono text-[12px] text-dark-dim-2">{q.detail}</div>
                </div>
                <span
                  className={`font-mono text-[11.5px] ${
                    q.status === "here" ? "bg-lime text-ink px-2 py-1" : "text-dark-dim-2"
                  }`}
                >
                  {q.status.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-auto px-4.5 py-4.5 border-t border-dark-rule-2">
          <Btn href="/hub/handover" size="xl" block>
            Enter a code
          </Btn>
        </div>
      </PhoneShell>
    </div>
  );
}
