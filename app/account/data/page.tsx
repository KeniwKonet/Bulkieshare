import { PhoneShell } from "@/components/nav";
import { requireMember } from "@/lib/auth/dal";
import { listMemberCommitments } from "@/lib/domain/commitments";
import { listCreditMovements, listMemberDisputes, listMemberRefunds } from "@/lib/domain/support";

export const metadata = { title: "Your data" };

export default async function AccountDataPage() {
  const member = await requireMember("/account/data");

  const [commitments, credit, disputes, refunds] = await Promise.all([
    listMemberCommitments(member.id),
    listCreditMovements(member.id),
    listMemberDisputes(member.id),
    listMemberRefunds(member.id),
  ]);

  const rows: [string, number][] = [
    ["Pools you have joined", commitments.length],
    ["Store credit movements", credit.length],
    ["Disputes you raised", disputes.length],
    ["Refunds owed or paid", refunds.length],
  ];

  return (
    <div className="bg-[#8E8C86] min-h-screen py-6">
      <PhoneShell title="Your data" eyebrow="NDPA REQUEST">
        <div className="px-5 py-6">
          <h2 className="font-display text-[25px] tracking-tight leading-tight mb-2.5">
            Download or delete your data
          </h2>
          <p className="text-[15px] leading-relaxed text-text-dim mb-5">
            Under the Nigeria Data Protection Act you can ask for a copy of everything we hold on
            you, or ask us to delete it.
          </p>

          <div className="border border-ink bg-card p-4 mb-3">
            <div className="text-[16px] font-bold mb-2.5">What we hold on you right now</div>
            <div className="text-[14px]">
              {rows.map(([label, n], i) => (
                <div
                  key={label}
                  className={`flex justify-between py-2 ${i < rows.length - 1 ? "border-b border-rule-card" : ""}`}
                >
                  <span className="text-text-dim">{label}</span>
                  <span className="font-mono font-semibold">{n}</span>
                </div>
              ))}
            </div>
            {/* A plain anchor, not next/link: this is a file download from a
                Route Handler, and a client-side navigation would swallow it. */}
            <a
              href="/api/account/export"
              download
              className="inline-block bg-lime border border-ink text-[14px] font-bold px-4 py-3 mt-3.5"
            >
              Download it as JSON
            </a>
          </div>

          <div className="border border-rust p-4">
            <div className="text-[16px] font-bold text-rust mb-1.5">Delete my account</div>
            <p className="text-[14px] text-text-dim leading-relaxed">
              We keep payment and refund records as required by law, but remove everything else.
              Deletion is handled by a person, so send the request from your registered number on
              WhatsApp and we confirm on a second channel before anything is removed.
            </p>
          </div>
        </div>

        <div className="mt-auto px-5 py-5 border-t border-ink">
          <p className="font-mono text-[11px] leading-relaxed text-text-dim">
            The export is generated live from your records at the moment you press the button.
          </p>
        </div>
      </PhoneShell>
    </div>
  );
}
