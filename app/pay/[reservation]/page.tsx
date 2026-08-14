import { AppHeader } from "@/components/nav";
import { Btn } from "@/components/ui";
import { Countdown } from "@/components/interactive";
import { formatNaira } from "@/lib/mock-data";

export const metadata = { title: "Pay for your slot" };

export default async function PayPage({
  params,
}: {
  params: Promise<{ reservation: string }>;
}) {
  const { reservation } = params ? await params : { reservation: "a-2214-r1" };
  const poolCode = reservation.split("-r")[0].toUpperCase();
  const amount = 14860;

  return (
    <div className="min-h-screen bg-paper text-ink">
      <AppHeader crumb={`#${poolCode} / PAYMENT`} />
      <div className="bg-rust text-white px-5 sm:px-8 py-3.5 flex flex-wrap justify-between items-center gap-2">
        <span className="text-[15px] sm:text-[16px] font-semibold">
          Your slots are held. Transfer within the countdown or they go back into the pool.
        </span>
        <span className="font-mono text-[22px] sm:text-[24px] font-semibold">
          <Countdown seconds={18 * 60 + 4} />
        </span>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1.25fr_1fr]">
        <div className="px-5 sm:px-8 py-8 lg:border-r border-ink">
          <h1 className="font-display text-[28px] sm:text-[34px] tracking-tight mb-1.5">
            Transfer {formatNaira(amount)} to your own account number
          </h1>
          <p className="text-[15.5px] text-text-dim leading-relaxed max-w-[56ch] mb-6">
            This account belongs to you permanently. Any bank app works. We match the payment the
            moment it lands, so you do not need to send a reference or a screenshot.
          </p>

          <div className="border border-ink bg-card mb-4 grid grid-cols-1 sm:grid-cols-2">
            <div className="p-4.5 sm:border-r border-b border-rule-card">
              <div className="font-mono text-[11.5px] text-text-dim">BANK</div>
              <div className="text-[20px] font-semibold">Wema Bank</div>
            </div>
            <div className="p-4.5 border-b border-rule-card">
              <div className="font-mono text-[11.5px] text-text-dim">ACCOUNT NAME</div>
              <div className="text-[20px] font-semibold">BulkieShare / T. Okafor</div>
            </div>
            <div className="p-4.5 sm:border-r border-rule-card">
              <div className="font-mono text-[11.5px] text-text-dim">ACCOUNT NUMBER</div>
              <div className="font-mono text-[26px] sm:text-[30px] font-semibold tracking-wider">
                7031 449 208
              </div>
            </div>
            <div className="p-4.5 flex items-end">
              <button className="bg-ink text-paper text-[15px] font-semibold px-5 py-3">
                Copy account number
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5 mb-6">
            <button className="border border-ink text-[14.5px] font-semibold px-4.5 py-3">
              Pay by USSD instead
            </button>
            <button className="border border-ink text-[14.5px] font-semibold px-4.5 py-3">
              Pay by card
            </button>
            <button className="border border-ink text-[14.5px] font-semibold px-4.5 py-3">
              Pay cash at hub
            </button>
          </div>

          <div className="border border-ink bg-card p-5">
            <div className="text-[17px] font-bold mb-3">If something goes wrong with the transfer</div>
            <div className="flex flex-col gap-2.5 text-[14.5px] leading-relaxed text-text-mid">
              <div className="flex gap-3">
                <span className="font-mono text-text-dim flex-shrink-0">LATE</span>
                <span>
                  If your money arrives after the hold, we re-reserve your slots automatically
                  when any remain. If the pool filled, it becomes store credit and we tell you
                  immediately. We never send it back.
                </span>
              </div>
              <div className="flex gap-3">
                <span className="font-mono text-text-dim flex-shrink-0">SHORT</span>
                <span>
                  Send less than {formatNaira(amount)} and we hold it as credit and tell you what
                  is outstanding.
                </span>
              </div>
              <div className="flex gap-3">
                <span className="font-mono text-text-dim flex-shrink-0">TWICE</span>
                <span>Pay twice and the second payment becomes credit the same day.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 sm:px-8 py-8">
          <div className="border border-ink bg-card p-5 mb-4">
            <div className="font-mono text-[11.5px] text-text-dim mb-3.5">WAITING FOR YOUR TRANSFER</div>
            <div className="flex flex-col gap-3.5">
              <div className="flex gap-3 items-start">
                <div className="w-[18px] h-[18px] bg-ink text-lime text-[11px] flex items-center justify-center flex-shrink-0">
                  ✓
                </div>
                <div>
                  <div className="text-[15px] font-semibold">Slots reserved</div>
                  <div className="font-mono text-[12px] text-text-dim">08:14:02 · #{poolCode}</div>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-[18px] h-[18px] border border-ink hatch-unpaid flex-shrink-0" />
                <div>
                  <div className="text-[15px] font-semibold">Payment landing</div>
                  <div className="font-mono text-[12px] text-text-dim">
                    bank transfers usually clear in under 2 minutes
                  </div>
                </div>
              </div>
              <div className="flex gap-3 items-start opacity-45">
                <div className="w-[18px] h-[18px] border border-ink flex-shrink-0" />
                <div>
                  <div className="text-[15px] font-semibold">Slots confirmed</div>
                  <div className="font-mono text-[12px] text-text-dim">you get a WhatsApp message</div>
                </div>
              </div>
              <div className="flex gap-3 items-start opacity-45">
                <div className="w-[18px] h-[18px] border border-ink flex-shrink-0" />
                <div>
                  <div className="text-[15px] font-semibold">Name who collects each slot</div>
                  <div className="font-mono text-[12px] text-text-dim">editable until pool locks</div>
                </div>
              </div>
            </div>
          </div>
          <div className="border border-ink bg-ink text-paper p-5">
            <div className="font-mono text-[11.5px] text-dark-dim-2 mb-2">YOUR MONEY UNTIL SHARE DAY</div>
            <p className="text-[14.5px] leading-relaxed text-dark-dim">
              {formatNaira(amount)} sits in a holding account that is separate from the money we
              run the business on. It moves twice only: to the farmer once the pool funds, or
              back to you if this pool is cancelled.
            </p>
          </div>
          <Btn href={`/commitments/${reservation}/people`} block size="lg" className="mt-5">
            I have paid, continue
          </Btn>
        </div>
      </div>
    </div>
  );
}
