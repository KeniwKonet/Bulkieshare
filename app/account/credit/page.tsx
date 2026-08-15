import { PhoneShell } from "@/components/nav";
import { Btn } from "@/components/ui";
import { requireMember } from "@/lib/auth/dal";
import { listCreditMovements } from "@/lib/domain/support";
import { formatKobo } from "@/lib/money";
import { formatShortDate } from "@/lib/time";

export const metadata = { title: "Credit" };

export default async function CreditPage() {
  const member = await requireMember("/account/credit");
  const movements = await listCreditMovements(member.id);

  return (
    <div className="bg-[#8E8C86] min-h-screen py-6">
      <PhoneShell title="Credit" eyebrow={(member.name || "YOU").toUpperCase()}>
        <div className="px-5 py-6 border-b border-ink">
          <div className="font-mono text-[11.5px] text-text-dim">AVAILABLE ON YOUR NEXT SLOT</div>
          <div className="font-display text-[48px] sm:text-[52px] tracking-tight leading-tight">
            {formatKobo(member.creditKobo)}
          </div>
          <p className="text-[14.5px] leading-relaxed text-text-mid my-3.5">
            {member.creditKobo > 0
              ? "Credit comes off the price of any pool automatically. You will see it applied at the reserve step."
              : "Nothing here yet. Credit arrives when a portion lands under its tolerance band, when you overpay, or when we get something wrong."}
          </p>
          <Btn href={`/${member.areaSlug ?? "abuja"}/pools`} size="sm" block>
            {member.creditKobo > 0 ? "Spend it on a pool" : "Browse open pools"}
          </Btn>
        </div>

        <div className="px-5 py-5">
          <div className="font-mono text-[11.5px] text-text-dim mb-3.5">EVERY MOVEMENT</div>
          {movements.length === 0 ? (
            <p className="text-[14.5px] text-text-dim leading-relaxed">
              No credit has moved on your account.
            </p>
          ) : (
            <div className="text-[14px]">
              {movements.map((m, i) => (
                <div
                  key={m.id}
                  className={`flex justify-between gap-3 py-2.5 ${
                    i < movements.length - 1 ? "border-b border-rule" : ""
                  }`}
                >
                  <div>
                    <div className="font-semibold">{m.label}</div>
                    <div className="font-mono text-[11.5px] text-text-dim">
                      {formatShortDate(m.createdAt).toUpperCase()}
                      {m.detail ? ` · ${m.detail}` : ""}
                    </div>
                  </div>
                  <span
                    className={`font-mono whitespace-nowrap ${m.amountKobo > 0 ? "text-green" : ""}`}
                  >
                    {m.amountKobo > 0 ? "+" : "−"}
                    {formatKobo(Math.abs(m.amountKobo))}
                  </span>
                </div>
              ))}
            </div>
          )}
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
