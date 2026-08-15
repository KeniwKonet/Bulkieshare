import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PayPanel } from "@/components/forms";
import { AppHeader } from "@/components/nav";
import { Countdown } from "@/components/interactive";
import { requireMember } from "@/lib/auth/dal";
import { ensurePaymentStarted } from "@/app/actions/checkout";
import { getReservation } from "@/lib/domain/checkout";
import { formatKobo } from "@/lib/money";
import { paymentsAreMocked } from "@/lib/providers/payments";
import { formatTimeOfDay } from "@/lib/time";

export const metadata = { title: "Pay for your slot" };

export default async function PayPage({
  params,
}: {
  params: Promise<{ reservation: string }>;
}) {
  const { reservation: reference } = await params;

  const member = await requireMember(`/pay/${reference}`);
  const reservation = await getReservation(reference);

  if (!reservation) notFound();
  if (reservation.memberId !== member.id) notFound();

  // Already settled — nothing to pay for.
  if (reservation.state === "paid") redirect("/my-pools?paid=1");

  const expired = reservation.state === "expired" || reservation.expiresAt <= new Date();

  if (expired) {
    return (
      <div className="min-h-screen bg-paper text-ink">
        <AppHeader crumb={`#${reservation.poolCode} / PAYMENT`} />
        <div className="max-w-xl mx-auto px-5 sm:px-8 py-12">
          <h1 className="font-display text-[30px] tracking-tight mb-2.5">
            That hold has expired
          </h1>
          <p className="text-[15.5px] leading-relaxed text-text-mid mb-5">
            Your {reservation.slots} slot{reservation.slots === 1 ? "" : "s"} went back into{" "}
            {reservation.poolTitle}. Nothing was charged. If the pool still has room you can
            reserve again.
          </p>
          <Link
            href={`/pools/${reservation.poolId}/reserve`}
            className="bg-lime border border-ink font-bold text-[16px] px-6 py-4 inline-block"
          >
            Try again
          </Link>
        </div>
      </div>
    );
  }

  const payment = await ensurePaymentStarted(reference);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <AppHeader crumb={`#${reservation.poolCode} / PAYMENT`} />

      <div className="bg-rust text-white px-5 sm:px-8 py-3.5 flex flex-wrap justify-between items-center gap-2">
        <span className="text-[15px] sm:text-[16px] font-semibold">
          Your slot{reservation.slots === 1 ? " is" : "s are"} held. Transfer within the countdown
          or {reservation.slots === 1 ? "it goes" : "they go"} back into the pool.
        </span>
        <span className="font-mono text-[22px] sm:text-[24px] font-semibold">
          <Countdown until={reservation.expiresAt.toISOString()} />
        </span>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1.25fr_1fr]">
        <div className="px-5 sm:px-8 py-8 lg:border-r border-ink">
          <h1 className="font-display text-[28px] sm:text-[34px] tracking-tight mb-1.5">
            {reservation.amountDueKobo === 0
              ? "Your credit covers this"
              : `Transfer ${formatKobo(reservation.amountDueKobo)} to the account below`}
          </h1>
          <p className="text-[15.5px] text-text-dim leading-relaxed max-w-[56ch] mb-6">
            {reservation.amountDueKobo === 0
              ? "There is nothing to send. Confirm and the slot is yours."
              : "This account is issued for this payment. Any bank app works. We match the payment the moment it lands, so you do not need to send a reference or a screenshot."}
          </p>

          <div className="border border-ink bg-card p-5 mb-6">
            <div className="font-mono text-[11.5px] text-text-dim mb-2">WHAT YOU ARE PAYING FOR</div>
            <div className="font-display text-[22px] tracking-tight mb-1">
              {reservation.poolTitle}
            </div>
            <div className="text-[14.5px] text-text-dim">
              {reservation.slots} slot{reservation.slots === 1 ? "" : "s"} · {reservation.hubName}
            </div>
            <div className="border-t border-rule mt-3.5 pt-3.5 flex flex-col gap-1.5 text-[14.5px]">
              <div className="flex justify-between text-text-dim">
                <span>Slots</span>
                <span className="font-mono">{formatKobo(reservation.subtotalKobo)}</span>
              </div>
              {reservation.creditAppliedKobo > 0 && (
                <div className="flex justify-between text-text-dim">
                  <span>Store credit applied</span>
                  <span className="font-mono">−{formatKobo(reservation.creditAppliedKobo)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-[16px] pt-1.5">
                <span>To transfer</span>
                <span className="font-mono">{formatKobo(reservation.amountDueKobo)}</span>
              </div>
            </div>
          </div>

          <div className="border border-ink bg-card p-5">
            <div className="text-[17px] font-bold mb-3">
              If something goes wrong with the transfer
            </div>
            <div className="flex flex-col gap-2.5 text-[14.5px] leading-relaxed text-text-mid">
              <div className="flex gap-3">
                <span className="font-mono text-text-dim flex-shrink-0">LATE</span>
                <span>
                  If your money arrives after the hold, we re-reserve your slots automatically when
                  any remain. If the pool filled, it becomes store credit and we tell you
                  immediately. We never send it back.
                </span>
              </div>
              <div className="flex gap-3">
                <span className="font-mono text-text-dim flex-shrink-0">SHORT</span>
                <span>
                  Send less than {formatKobo(reservation.amountDueKobo)} and we hold it as credit
                  and tell you what is outstanding.
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
          <PayPanel
            reservationReference={reservation.reference}
            amountKobo={reservation.amountDueKobo}
            accountNumber={payment?.instruction?.accountNumber ?? null}
            bankName={payment?.instruction?.bankName ?? null}
            accountName={payment?.instruction?.accountName ?? null}
            expiresAt={reservation.expiresAt.toISOString()}
            isMock={paymentsAreMocked()}
          />

          <div className="border border-ink bg-card p-5 my-4">
            <div className="font-mono text-[11.5px] text-text-dim mb-3.5">
              WAITING FOR YOUR TRANSFER
            </div>
            <div className="flex flex-col gap-3.5">
              <div className="flex gap-3 items-start">
                <div className="w-[18px] h-[18px] bg-ink text-lime text-[11px] flex items-center justify-center flex-shrink-0">
                  ✓
                </div>
                <div>
                  <div className="text-[15px] font-semibold">Slots reserved</div>
                  <div className="font-mono text-[12px] text-text-dim">
                    {formatTimeOfDay(reservation.createdAt)} · #{reservation.poolCode}
                  </div>
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
                  <div className="font-mono text-[12px] text-text-dim">
                    you get a WhatsApp message
                  </div>
                </div>
              </div>
              <div className="flex gap-3 items-start opacity-45">
                <div className="w-[18px] h-[18px] border border-ink flex-shrink-0" />
                <div>
                  <div className="text-[15px] font-semibold">Name who collects each slot</div>
                  <div className="font-mono text-[12px] text-text-dim">
                    editable until the pool locks
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border border-ink bg-ink text-paper p-5">
            <div className="font-mono text-[11.5px] text-dark-dim-2 mb-2">
              YOUR MONEY UNTIL SHARE DAY
            </div>
            <p className="text-[14.5px] leading-relaxed text-dark-dim">
              {formatKobo(reservation.subtotalKobo)} sits in a holding account that is separate
              from the money we run the business on. It moves twice only: to the farmer once the
              pool funds, or back to you if this pool is cancelled.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
