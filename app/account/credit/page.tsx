import { PhoneShell } from "@/components/nav";
import { Btn } from "@/components/ui";
import { CREDIT_MOVEMENTS, formatNaira } from "@/lib/mock-data";

export const metadata = { title: "Credit" };

export default function CreditPage() {
  return (
    <div className="bg-[#8E8C86] min-h-screen py-6">
      <PhoneShell title="Credit" eyebrow="TOLU OKAFOR">
        <div className="px-5 py-6 border-b border-ink">
          <div className="font-mono text-[11.5px] text-text-dim">AVAILABLE ON YOUR NEXT SLOT</div>
          <div className="font-display text-[48px] sm:text-[52px] tracking-tight leading-tight">
            {formatNaira(1940)}
          </div>
          <p className="text-[14.5px] leading-relaxed text-text-mid my-3.5">
            Credit comes off the price of any pool automatically. You can also ask for it as cash
            to your bank, and we send it within 24 hours.
          </p>
          <div className="flex gap-2">
            <Btn href="/abuja/pools" size="sm" block>
              Spend on a pool
            </Btn>
            <Btn variant="outline" size="sm" block>
              Send to my bank
            </Btn>
          </div>
        </div>
        <div className="px-5 py-5">
          <div className="font-mono text-[11.5px] text-text-dim mb-3.5">EVERY MOVEMENT</div>
          <div className="text-[14px]">
            {CREDIT_MOVEMENTS.map((m, i) => (
              <div
                key={m.label}
                className={`flex justify-between gap-3 py-2.5 ${
                  i < CREDIT_MOVEMENTS.length - 1 ? "border-b border-rule" : ""
                }`}
              >
                <div>
                  <div className="font-semibold">{m.label}</div>
                  <div className="font-mono text-[11.5px] text-text-dim">{m.detail}</div>
                </div>
                <span
                  className={`font-mono whitespace-nowrap ${m.amount > 0 ? "text-green" : ""}`}
                >
                  {m.amount > 0 ? "+" : "−"}
                  {formatNaira(Math.abs(m.amount))}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-auto px-5 py-5 border-t border-ink">
          <p className="font-mono text-[11.5px] leading-relaxed text-text-dim">
            Credit is for buying food here. It is not a savings account and it earns nothing.
          </p>
        </div>
      </PhoneShell>
    </div>
  );
}
