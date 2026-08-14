import { AppHeader } from "@/components/nav";
import { Btn } from "@/components/ui";
import { BENEFICIARIES, formatNaira } from "@/lib/mock-data";

export const metadata = { title: "Who collects" };

export default async function BeneficiariesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const named = BENEFICIARIES.filter((b) => b.status === "named").length;

  return (
    <div className="min-h-screen bg-paper text-ink">
      <AppHeader crumb={`#${id.toUpperCase()} / ${BENEFICIARIES.length} SLOTS / WHO COLLECTS`} />
      <div className="bg-lime px-5 sm:px-8 py-3.5 border-b border-ink flex flex-wrap justify-between items-center gap-2">
        <span className="text-[16px] font-semibold">
          {formatNaira(100800)} received. {BENEFICIARIES.length} slots confirmed.
        </span>
        <span className="font-mono text-[12.5px]">RECEIPT #R-88412 SENT ON WHATSAPP</span>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1.4fr_1fr]">
        <div className="px-5 sm:px-8 py-8 lg:border-r border-ink">
          <h1 className="font-display text-[30px] sm:text-[34px] tracking-tight mb-1.5">
            Name the people collecting
          </h1>
          <p className="text-[15.5px] text-text-dim leading-relaxed max-w-[58ch] mb-6">
            Each person gets their own code and their own share day message, so nobody has to
            stand at the hub holding several codes. You can change these names until the pool
            locks.
          </p>

          <div className="border border-ink bg-card overflow-x-auto">
            <div className="grid grid-cols-[36px_1.3fr_1fr_90px] font-mono text-[11.5px] bg-ink text-dark-dim-2 min-w-[420px]">
              <div className="px-3 py-2.5">#</div>
              <div className="px-3 py-2.5">NAME</div>
              <div className="px-3 py-2.5">PHONE</div>
              <div className="px-3 py-2.5">CODE</div>
            </div>
            <div className="grid grid-cols-[36px_1.3fr_1fr_90px] text-[14.5px] min-w-[420px]">
              {BENEFICIARIES.map((b, i) => (
                <div key={b.index} className="contents">
                  <div className={`px-3 py-2.5 font-mono text-text-dim ${i < BENEFICIARIES.length - 1 ? "border-b border-rule-card" : ""}`}>
                    {String(b.index).padStart(2, "0")}
                  </div>
                  <div className={`px-3 py-2.5 ${i < BENEFICIARIES.length - 1 ? "border-b border-rule-card" : ""} ${b.status === "waiting" ? "text-rust" : ""}`}>
                    {b.status === "waiting" ? "Waiting for a name" : (
                      <>
                        {b.name} {b.isPayer && <span className="font-mono text-[11.5px] text-text-dim">(you)</span>}
                      </>
                    )}
                  </div>
                  <div className={`px-3 py-2.5 font-mono ${i < BENEFICIARIES.length - 1 ? "border-b border-rule-card" : ""} ${b.status === "waiting" ? "text-text-faint" : ""}`}>
                    {b.status === "waiting" ? "add a phone number" : b.phone}
                  </div>
                  <div className={`px-3 py-2.5 font-mono font-semibold ${i < BENEFICIARIES.length - 1 ? "border-b border-rule-card" : ""} ${b.status === "waiting" ? "text-text-faint" : ""}`}>
                    {b.status === "waiting" ? "—" : b.code}
                  </div>
                </div>
              ))}
            </div>
            <div className="px-3 py-3 border-t border-rule flex flex-wrap justify-between items-center gap-2">
              <span className="font-mono text-[12px] text-text-dim">
                {named} of {BENEFICIARIES.length} named
              </span>
              <button className="border border-ink text-[14px] font-semibold px-3.5 py-2.5">
                Import from my WhatsApp group
              </button>
            </div>
          </div>
        </div>

        <div className="px-5 sm:px-8 py-8">
          <div className="border border-ink bg-ink text-paper p-5 mb-4">
            <div className="font-mono text-[11.5px] text-dark-dim-2 mb-2">ONE THING TO BE CLEAR ABOUT</div>
            <p className="text-[15px] leading-relaxed text-dark-dim">
              If this pool is cancelled, all {formatNaira(100800)} goes back to{" "}
              <b className="text-paper">your</b> account, not split between the group. You
              collected the cash, so you return it. This is also in the terms you agreed to.
            </p>
          </div>
          <div className="border border-ink bg-card p-5 mb-4">
            <div className="text-[16px] font-bold mb-3">What each person will receive</div>
            <p className="text-[14.5px] leading-relaxed text-text-dim mb-3">
              A WhatsApp message with their code, their 20 minute window, and what to bring.
            </p>
            <div className="bg-paper border border-rule p-3.5 text-[14px] leading-relaxed">
              <div className="font-mono text-[11px] text-text-dim mb-1.5">PREVIEW</div>
              Hauwa, Tolu bought you a share of the Kuje cow pool. Collect at Kuje hub on Sat 16
              Aug between 10:20 and 10:40. Your code is 2210. Bring a cooler if you have one.
            </div>
          </div>
          <Btn block size="lg">
            Send everyone their codes
          </Btn>
        </div>
      </div>
    </div>
  );
}
