import Link from "next/link";

export const metadata = { title: "Supplier WhatsApp path" };

const MESSAGES = [
  {
    from: "us" as const,
    at: "TUE 08:02",
    text: "Good morning. We need 2 head of cattle, 220kg or more, at Kuje yard by Thursday 21 August. Your last price was ₦268,000 per head. Reply with your price and how many days it holds.",
  },
  { from: "them" as const, at: "TUE 08:31", text: "271500 per head. Price holds till 28 August." },
  {
    from: "us" as const,
    at: "TUE 08:33",
    text: "Recorded: ₦271,500 per head, holds to 28 Aug. We open the pool today. If it fills you get a purchase order and 40% deposit before you move any animal.",
  },
  {
    from: "us" as const,
    at: "WED 16:12",
    text: "PO-8859 issued. ₦217,200 deposit sent to Sterling 0044118220. Deliver 2 head to Kuje yard on Thu 21 Aug before 08:00. Reply DONE when they are loaded.",
    actions: ["DONE", "DELAY", "SEE PO"],
  },
];

export default function SupplierWhatsAppPage() {
  return (
    <div className="min-h-screen bg-paper text-ink flex items-center justify-center py-10 px-5">
      <div className="max-w-[420px] w-full">
        <p className="text-[13.5px] text-text-dim mb-3">
          <Link href="/supply/requests" className="underline">
            ← Back to the portal
          </Link>{" "}
          · what most suppliers actually use
        </p>
        <div className="border border-dark-rule bg-ink text-paper flex flex-col min-h-[600px]">
          <div className="px-4.5 py-3.5 border-b border-dark-rule-2 flex justify-between items-center">
            <span className="text-[15px] font-semibold">BulkieShare Supply</span>
            <span className="font-mono text-[11px] text-dark-dim-2">BUSINESS ACCOUNT</span>
          </div>
          <div className="p-4.5 flex flex-col gap-3">
            {MESSAGES.map((m, i) => (
              <div
                key={i}
                className={
                  m.from === "them"
                    ? "bg-[#243024] self-end max-w-[80%] px-3.5 py-3 text-[14.5px] leading-relaxed"
                    : "bg-[#1E1E1C] border-l-[3px] border-lime px-3.5 py-3 text-[14.5px] leading-relaxed"
                }
              >
                <div className="font-mono text-[10.5px] text-dark-dim-2 mb-1.5">{m.at}</div>
                {m.text}
                {m.actions && (
                  <div className="flex gap-1.5 mt-3">
                    {m.actions.map((a) => (
                      <span
                        key={a}
                        className="flex-1 text-center border border-dark-rule-2 py-2 text-[13px] font-semibold"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-auto px-4.5 py-4 border-t border-dark-rule-2">
            <p className="font-mono text-[11px] leading-relaxed text-dark-dim-2">
              Every message here writes to the same records as the portal. A supplier who never
              opens a browser still has a full audit trail, a scorecard and a payout history.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
