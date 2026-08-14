import { Logo, Btn, PhotoPlaceholder, Tag } from "@/components/ui";

export const metadata = { title: "Supplier onboarding" };

export default function SupplierOnboardingPage() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="px-5 sm:px-8 py-3.5 border-b border-ink flex justify-between items-center flex-wrap gap-2">
        <div className="flex items-center gap-4">
          <Logo size={16} />
          <span className="font-mono text-[12.5px] hidden sm:inline">
            FIELD AGENT · IBRAHIM S. · KUJE · ONE VISIT, 40 MINUTES
          </span>
        </div>
        <Tag tone="rust">3 OF 4 SECTIONS DONE</Tag>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1.2fr_1fr]">
        <div className="px-5 sm:px-8 py-8 lg:border-r border-ink">
          <h1 className="font-display text-[30px] sm:text-[34px] tracking-tight mb-2">
            Kuje Livestock Aggregators
          </h1>
          <p className="text-[15.5px] leading-relaxed text-text-dim max-w-[56ch] mb-6">
            Registering a supplier is a visit, not a form they fill in alone. The agent
            photographs the site, captures the bank details, and resolves the account name
            against the BVN before anyone can be paid.
          </p>

          <div className="border border-ink bg-card mb-4">
            <div className="px-4 py-2.5 bg-ink text-dark-dim-2 font-mono text-[11.5px]">
              01 · WHO THEY ARE
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2">
              <div className="p-3.5 sm:border-r border-b border-rule-card">
                <div className="font-mono text-[11px] text-text-dim">TRADING NAME</div>
                <div className="text-[15.5px] font-semibold">Kuje Livestock Aggregators Ltd</div>
              </div>
              <div className="p-3.5 border-b border-rule-card">
                <div className="font-mono text-[11px] text-text-dim">CAC NUMBER</div>
                <div className="text-[15.5px] font-semibold font-mono">RC 1884021</div>
              </div>
              <div className="p-3.5 sm:border-r border-rule-card">
                <div className="font-mono text-[11px] text-text-dim">SPEAKS FOR</div>
                <div className="text-[15.5px] font-semibold">14 farmers around Kuje</div>
              </div>
              <div className="p-3.5">
                <div className="font-mono text-[11px] text-text-dim">SUPPLIES</div>
                <div className="text-[15.5px] font-semibold">Cattle, ram, goat</div>
              </div>
            </div>
          </div>

          <div className="border border-ink bg-card mb-4">
            <div className="px-4 py-2.5 bg-ink text-dark-dim-2 font-mono text-[11.5px]">
              02 · WHERE THE MONEY GOES
            </div>
            <div className="p-4">
              <div className="flex justify-between text-[15px] py-2 border-b border-rule-card">
                <span className="text-text-dim">Bank</span>
                <span className="font-semibold">Sterling Bank</span>
              </div>
              <div className="flex justify-between text-[15px] py-2 border-b border-rule-card">
                <span className="text-text-dim">Account number</span>
                <span className="font-mono font-semibold">0044 118 220</span>
              </div>
              <div className="flex justify-between text-[15px] py-2 border-b border-rule-card">
                <span className="text-text-dim">Name returned by the bank</span>
                <span className="font-semibold">KUJE LIVESTOCK AGG. LTD</span>
              </div>
              <div className="flex justify-between text-[15px] py-2">
                <span className="text-text-dim">BVN name match</span>
                <span className="font-semibold text-green">matched, verified 04 Jun</span>
              </div>
              <div className="bg-paper border border-rule p-3 mt-3 text-[14px] leading-relaxed">
                The account name must match the registered name. A mismatch stops the payout, no
                exceptions and no manual override, because this is where supplier fraud enters a
                business like ours.
              </div>
            </div>
          </div>

          <div className="border border-rust bg-card">
            <div className="px-4 py-2.5 bg-rust text-white font-mono text-[11.5px]">
              04 · STILL MISSING
            </div>
            <div className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <div className="text-[16px] font-bold">Signed quality standard</div>
                <p className="text-[14.5px] text-text-dim leading-relaxed max-w-[44ch] mt-1">
                  Weights, grading, rejection reasons and the 48 hour balance payment. They cannot
                  receive a purchase order until this is signed.
                </p>
              </div>
              <Btn variant="dark" size="md">
                Sign on this phone
              </Btn>
            </div>
          </div>
        </div>

        <div className="px-5 sm:px-8 py-8">
          <div className="font-mono text-[11.5px] text-text-dim mb-3">
            03 · SITE PHOTOS · GEOTAGGED, TAKEN TODAY
          </div>
          <div className="grid grid-cols-2 gap-2.5 mb-4">
            <PhotoPlaceholder caption="the pen, 9.0821 N 7.2287 E" height={130} align="end" />
            <PhotoPlaceholder caption="water and feed store" height={130} align="end" />
            <PhotoPlaceholder caption="owner holding ID" height={130} align="end" />
            <PhotoPlaceholder caption="loading access road" height={130} align="end" />
          </div>
          <div className="border border-ink bg-ink text-paper p-4.5">
            <div className="font-mono text-[11px] text-dark-dim-2 mb-2">AGENT&apos;S NOTE, REQUIRED</div>
            <p className="text-[14.5px] leading-relaxed text-dark-dim">
              Pen holds about 30 head. Road is passable in rain but a full lorry will struggle
              after heavy rain in August. Owner wants payment same day and understood the 48 hour
              balance rule after I explained it twice.
            </p>
          </div>
          <div className="border border-ink bg-card p-4.5 mt-4">
            <div className="font-mono text-[11px] text-text-dim mb-2.5">
              WHAT THEY GET, IN WRITING, BEFORE SIGNING
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
