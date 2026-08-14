import { PhoneShell } from "@/components/nav";
import { Btn } from "@/components/ui";

export const metadata = { title: "Your data" };

export default function AccountDataPage() {
  return (
    <div className="bg-[#8E8C86] min-h-screen py-6">
      <PhoneShell title="Your data" eyebrow="NDPA REQUEST">
        <div className="px-5 py-6">
          <h2 className="font-display text-[25px] tracking-tight leading-tight mb-2.5">
            Download or delete your data
          </h2>
          <p className="text-[15px] leading-relaxed text-text-dim mb-5">
            Under the Nigeria Data Protection Act you can ask for a copy of everything we hold on
            you, or ask us to delete it. Both are tracked as a ticket you can follow.
          </p>
          <div className="border border-ink bg-card p-4 mb-3">
            <div className="text-[16px] font-bold mb-1.5">Request a copy of my data</div>
            <p className="text-[14px] text-text-dim leading-relaxed mb-3">
              A file with your profile, payments, pools and messages, sent within 14 days.
            </p>
            <Btn size="sm">Request a copy</Btn>
          </div>
          <div className="border border-rust p-4">
            <div className="text-[16px] font-bold text-rust mb-1.5">Delete my account</div>
            <p className="text-[14px] text-text-dim leading-relaxed mb-3">
              We keep payment and refund records as required by law, but remove everything else.
              This cannot be undone.
            </p>
            <button className="border border-rust text-rust text-[14px] font-semibold px-4 py-2.5">
              Start deletion request
            </button>
          </div>
        </div>
        <div className="mt-auto px-5 py-5 border-t border-ink">
          <p className="font-mono text-[11px] leading-relaxed text-text-dim">
            Open tickets show here with a tracked status. Nothing is deleted immediately without
            confirmation on a second channel.
          </p>
        </div>
      </PhoneShell>
    </div>
  );
}
