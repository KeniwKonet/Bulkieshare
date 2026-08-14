import { PhoneShell } from "@/components/nav";
import { Btn } from "@/components/ui";

export const metadata = { title: "Invite" };

const REFERRALS = [
  { name: "Hauwa Ibrahim", status: "₦1,000 paid", tone: "text-green" },
  { name: "Musa Danjuma", status: "joined, not collected", tone: "text-text-dim" },
  { name: "Grace Adeyemi", status: "link opened", tone: "text-text-faint" },
];

export default function InvitePage() {
  return (
    <div className="bg-[#8E8C86] min-h-screen py-6">
      <PhoneShell title="Invite" eyebrow="#A-2214 · 4 SLOTS OPEN">
        <div className="px-5 py-6 border-b border-ink">
          <h2 className="font-display text-[26px] sm:text-[28px] tracking-tight leading-tight mb-2.5">
            Four people short. You know four people.
          </h2>
          <p className="text-[15px] leading-relaxed text-text-mid mb-3.5">
            The ram pool closes Friday at 18:00. If it does not fill, everyone including you gets
            refunded and nobody eats. Sharing it is the fastest way to make it happen.
          </p>
          <div className="bg-card border border-ink p-3.5 text-[14.5px] leading-relaxed mb-3.5">
            <div className="font-mono text-[11px] text-text-dim mb-1.5">WHAT THEY WILL SEE</div>
            I am buying a share of a ram with 35 other people in Abuja, ₦8,400 for about 2.5kg.
            Collect at Lugbe hub on Sunday 24 August. Four slots left. bulkieshare.ng/p/A-2214
          </div>
          <div className="flex gap-2">
            <Btn size="sm" block>
              Send on WhatsApp
            </Btn>
            <Btn variant="outline" size="sm" block>
              Copy the link
            </Btn>
          </div>
        </div>
        <div className="px-5 py-5">
          <div className="font-mono text-[11.5px] text-text-dim mb-3">WHAT YOU GET</div>
          <p className="text-[15px] leading-relaxed text-text-mid mb-3.5">
            ₦1,000 credit for each person who joins and pays for their first slot, capped at five
            people a month. It lands when their pool completes, not when they sign up.
          </p>
          <div className="border border-ink bg-card">
            {REFERRALS.map((r, i) => (
              <div
                key={r.name}
                className={`flex justify-between px-3.5 py-2.5 text-[14.5px] ${
                  i < REFERRALS.length - 1 ? "border-b border-rule-card" : ""
                }`}
              >
                <span>{r.name}</span>
                <span className={`font-mono ${r.tone}`}>{r.status}</span>
              </div>
            ))}
          </div>
        </div>
      </PhoneShell>
    </div>
  );
}
