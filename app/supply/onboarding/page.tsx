import { redirect } from "next/navigation";

import { SupplierOnboardingForm } from "@/components/staff-forms";
import { Logo, PhotoPlaceholder, Tag } from "@/components/ui";
import { requireMember } from "@/lib/auth/dal";
import { getSupplier } from "@/lib/domain/supply";
import { formatPhone } from "@/lib/phone";

export const metadata = { title: "Supplier onboarding" };

export default async function SupplierOnboardingPage() {
  const member = await requireMember("/supply/onboarding");

  // Already onboarded — the portal is the right place for them.
  if (member.supplierId) {
    const supplier = await getSupplier(member.supplierId);
    if (supplier?.isApproved) redirect("/supply/requests");
  }

  const supplier = member.supplierId ? await getSupplier(member.supplierId) : null;

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="px-5 sm:px-8 py-3.5 border-b border-ink flex justify-between items-center flex-wrap gap-2">
        <div className="flex items-center gap-4">
          <Logo size={16} />
          <span className="font-mono text-[12.5px] hidden sm:inline">
            SUPPLIER REGISTRATION · ONE VISIT, 40 MINUTES
          </span>
        </div>
        <Tag tone={supplier ? "amber" : "rust"}>
          {supplier ? "AWAITING FIELD VISIT" : "NOT STARTED"}
        </Tag>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1.2fr_1fr]">
        <div className="px-5 sm:px-8 py-8 lg:border-r border-ink">
          <h1 className="font-display text-[30px] sm:text-[34px] tracking-tight mb-2">
            {supplier?.name ?? "Register as a supplier"}
          </h1>
          <p className="text-[15.5px] leading-relaxed text-text-dim max-w-[56ch] mb-6">
            Registering a supplier is a visit, not a form filled in alone. Start it here, and a
            field agent photographs the site, checks the bank details, and resolves the account
            name before anyone can be paid.
          </p>

          {supplier ? (
            <>
              <div className="border border-ink bg-card mb-4">
                <div className="px-4 py-2.5 bg-ink text-dark-dim-2 font-mono text-[11.5px]">
                  01 · WHAT YOU TOLD US
                </div>
                <div className="p-4">
                  <div className="flex justify-between text-[15px] py-2 border-b border-rule-card">
                    <span className="text-text-dim">Trading name</span>
                    <span className="font-semibold">{supplier.name}</span>
                  </div>
                  <div className="flex justify-between text-[15px] py-2 border-b border-rule-card">
                    <span className="text-text-dim">Who we call</span>
                    <span className="font-semibold">{supplier.contactName ?? "—"}</span>
                  </div>
                  <div className="flex justify-between text-[15px] py-2 border-b border-rule-card">
                    <span className="text-text-dim">Phone</span>
                    <span className="font-mono">
                      {supplier.contactPhone ? formatPhone(supplier.contactPhone) : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between text-[15px] py-2">
                    <span className="text-text-dim">Bank</span>
                    <span className="font-semibold">
                      {supplier.bankName ?? "not given"}
                      {supplier.bankAccountNumber
                        ? ` ····${supplier.bankAccountNumber.slice(-4)}`
                        : ""}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border border-rust bg-card">
                <div className="px-4 py-2.5 bg-rust text-white font-mono text-[11.5px]">
                  STILL MISSING
                </div>
                <div className="p-4">
                  <div className="text-[16px] font-bold mb-1">
                    Field visit and signed quality standard
                  </div>
                  <p className="text-[14.5px] text-text-dim leading-relaxed">
                    Weights, grading, rejection reasons and the 48 hour balance payment. You cannot
                    receive a purchase order until an agent has visited and this is signed. We will
                    call {supplier.contactPhone ? formatPhone(supplier.contactPhone) : "you"} to
                    arrange it.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <SupplierOnboardingForm defaultContact={formatPhone(member.phone)} />
          )}
        </div>

        <div className="px-5 sm:px-8 py-8">
          <div className="font-mono text-[11.5px] text-text-dim mb-3">
            WHAT THE AGENT CAPTURES ON THE VISIT
          </div>
          <div className="grid grid-cols-2 gap-2.5 mb-4">
            <PhotoPlaceholder caption="the pen or store, geotagged" height={130} align="end" />
            <PhotoPlaceholder caption="water and feed" height={130} align="end" />
            <PhotoPlaceholder caption="owner holding ID" height={130} align="end" />
            <PhotoPlaceholder caption="loading access road" height={130} align="end" />
          </div>

          <div className="border border-ink bg-ink text-paper p-4.5">
            <div className="font-mono text-[11px] text-dark-dim-2 mb-2">
              WHY THE BANK NAME MUST MATCH
            </div>
            <p className="text-[14.5px] leading-relaxed text-dark-dim">
              The account name must match the registered name. A mismatch stops the payout, with no
              manual override, because this is where supplier fraud enters a business like ours.
            </p>
          </div>

          <div className="border border-ink bg-card p-4.5 mt-4">
            <div className="font-mono text-[11px] text-text-dim mb-2.5">
              WHAT YOU GET, IN WRITING, BEFORE SIGNING
            </div>
            <div className="flex flex-col gap-2.5 text-[14.5px] leading-relaxed">
              <div className="flex gap-2.5">
                <span className="font-mono text-text-dim flex-shrink-0">40%</span>
                <span>deposit on the purchase order, before delivery</span>
              </div>
              <div className="flex gap-2.5">
                <span className="font-mono text-text-dim flex-shrink-0">48h</span>
                <span>balance after QC passes at the hub</span>
              </div>
              <div className="flex gap-2.5">
                <span className="font-mono text-text-dim flex-shrink-0">7d</span>
                <span>minimum a quote must hold, or we cannot open a pool on it</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
