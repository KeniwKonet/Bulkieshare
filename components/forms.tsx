"use client";

import { useActionState, useState } from "react";
import Link from "next/link";

import {
  joinAreaWaitlist,
  requestCode,
  resendCode,
  updateNotifications,
  updateProfile,
  verifyCode,
} from "@/app/actions/auth";
import { confirmTransferReceived, releaseHold, reserve } from "@/app/actions/checkout";
import {
  bookWindow,
  clearWindow,
  nameSlot,
  raiseDispute,
  refundAsCredit,
} from "@/app/actions/member";
import { emptyState } from "@/app/actions/_state";
import { formatKobo } from "@/lib/money";
import {
  CopyButton,
  Countdown,
  ExpiryRefresher,
  FormMessage,
  OtpInput,
  Stepper,
  SubmitButton,
  ToggleSwitch,
} from "./interactive";

/* ---------------------------------------------------------------------- */
/* Sign in                                                                 */
/* ---------------------------------------------------------------------- */

export function JoinForm({ next }: { next?: string }) {
  const [state, action] = useActionState(requestCode, emptyState);

  return (
    <form action={action}>
      <FormMessage error={state.error} />
      <input type="hidden" name="next" value={next ?? ""} />
      <label className="block font-mono text-[11.5px] text-text-dim mb-1.5">PHONE NUMBER</label>
      <input
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="0803 441 9022"
        required
        className="w-full border border-ink bg-card px-3.5 py-3.5 text-[17px] font-mono mb-4"
      />
      <SubmitButton pendingLabel="Sending…" variant="dark">
        Send me a code
      </SubmitButton>
      <p className="font-mono text-[11.5px] leading-relaxed text-text-dim mt-4">
        We send a six digit code on WhatsApp. No password, ever.
      </p>
    </form>
  );
}

export function OtpForm({
  phoneLabel,
  next,
  initialCode,
}: {
  phoneLabel: string;
  next?: string;
  /** Only ever set on a demo deployment, where nothing was really sent. */
  initialCode?: string;
}) {
  const [verifyState, verifyAction] = useActionState(verifyCode, emptyState);
  const [resendState, resendAction] = useActionState(resendCode, emptyState);

  return (
    <>
      <FormMessage
        error={verifyState.error ?? resendState.error}
        message={resendState.message}
        devHint={resendState.devHint ?? initialCode}
      />
      <p className="text-[15.5px] leading-relaxed text-text-dim mb-4">
        Sent to {phoneLabel} on WhatsApp.
      </p>

      <form action={verifyAction}>
        <input type="hidden" name="next" value={next ?? ""} />
        <div className="mb-4">
          <OtpInput />
        </div>
        <SubmitButton pendingLabel="Checking…" variant="dark">
          Continue
        </SubmitButton>
      </form>

      <form action={resendAction} className="flex gap-2 mt-4">
        <button
          type="submit"
          name="channel"
          value="sms"
          className="flex-1 border border-ink px-4 py-3 text-[14.5px] font-semibold"
        >
          Send by SMS instead
        </button>
        <Link
          href="/join"
          className="flex-1 border border-ink px-4 py-3 text-[14.5px] font-semibold text-center"
        >
          Wrong number
        </Link>
      </form>

      <p className="font-mono text-[11.5px] leading-relaxed text-text-dim mt-5 border-t border-rule pt-4">
        If WhatsApp does not deliver in 60 seconds, ask for an SMS. Three wrong codes locks the
        number for 15 minutes.
      </p>
    </>
  );
}

/* ---------------------------------------------------------------------- */
/* Reserving and paying                                                    */
/* ---------------------------------------------------------------------- */

export function ReserveForm({
  poolId,
  pricePerSlotKobo,
  creditKobo,
  maxSlots,
  hubName,
  shareDateLabel,
}: {
  poolId: string;
  pricePerSlotKobo: number;
  creditKobo: number;
  maxSlots: number;
  hubName: string;
  shareDateLabel: string;
}) {
  const [state, action] = useActionState(reserve, emptyState);
  const [slots, setSlots] = useState(1);
  const [useCredit, setUseCredit] = useState(creditKobo > 0);
  const [confirmed, setConfirmed] = useState(true);

  const subtotal = pricePerSlotKobo * slots;
  const creditApplied = useCredit ? Math.min(creditKobo, subtotal) : 0;
  const toPay = subtotal - creditApplied;

  return (
    <form action={action}>
      <FormMessage error={state.error} />
      <input type="hidden" name="poolId" value={poolId} />
      <input type="hidden" name="useCredit" value={useCredit ? "on" : "off"} />

      <div className="border-t border-rule pt-4 mb-4">
        <div className="flex justify-between items-center mb-3">
          <span className="text-[15px] font-semibold">How many slots?</span>
          <Stepper name="slots" min={1} max={Math.max(1, maxSlots)} onChange={setSlots} />
        </div>

        <div className="flex justify-between text-[14.5px] py-1.5 text-text-dim">
          <span>
            {slots} × {formatKobo(pricePerSlotKobo)}
          </span>
          <span className="font-mono">{formatKobo(subtotal)}</span>
        </div>
        <div className="flex justify-between text-[14.5px] py-1.5 text-text-dim">
          <span>Hub collection</span>
          <span className="font-mono">free</span>
        </div>

        {creditKobo > 0 && (
          <label className="flex justify-between items-center text-[14.5px] py-1.5 text-text-dim border-b border-rule cursor-pointer">
            <span className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={useCredit}
                onChange={(e) => setUseCredit(e.target.checked)}
                className="accent-black"
              />
              Use store credit ({formatKobo(creditKobo)} available)
            </span>
            <span className="font-mono">−{formatKobo(creditApplied)}</span>
          </label>
        )}

        <div className="flex justify-between items-baseline pt-3">
          <span className="text-[16px] font-bold">To pay now, in full</span>
          <span className="font-display text-[28px]">{formatKobo(toPay)}</span>
        </div>
      </div>

      <SubmitButton pendingLabel="Holding your slot…" disabled={!confirmed} className="mb-2.5">
        {toPay === 0 ? "Take slot with credit" : "Reserve slot"}
      </SubmitButton>

      <p className="font-mono text-[11.5px] leading-relaxed text-text-dim mb-3.5">
        Reserving holds your slot for 20 minutes while you transfer. No card needed.
      </p>

      <label className="flex gap-2.5 items-start text-[14px] leading-snug text-text-mid border-t border-rule pt-3.5 cursor-pointer">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-1 accent-black"
        />
        <span>
          I can collect at{" "}
          <b>
            {hubName} on {shareDateLabel}
          </b>
          . This pool is not delivered.
        </span>
      </label>
    </form>
  );
}

export function PayPanel({
  reservationReference,
  amountKobo,
  accountNumber,
  bankName,
  accountName,
  expiresAt,
  isMock,
}: {
  reservationReference: string;
  amountKobo: number;
  accountNumber: string | null;
  bankName: string | null;
  accountName: string | null;
  expiresAt: string;
  isMock: boolean;
}) {
  const [confirmState, confirmAction] = useActionState(confirmTransferReceived, emptyState);
  const [releaseState, releaseAction] = useActionState(releaseHold, emptyState);

  return (
    <>
      <ExpiryRefresher at={expiresAt} />
      <FormMessage error={confirmState.error ?? releaseState.error} />

      <div className="font-mono text-[12.5px] bg-ink text-lime px-2.5 py-2 text-center mb-5">
        HOLD EXPIRES IN <Countdown until={expiresAt} />
      </div>

      {accountNumber ? (
        <div className="border border-ink bg-card p-5 mb-4">
          <div className="font-mono text-[11.5px] text-text-dim mb-1">TRANSFER EXACTLY</div>
          <div className="font-display text-[34px] mb-4">{formatKobo(amountKobo)}</div>

          <div className="border-t border-rule pt-3.5 flex flex-col gap-2.5">
            <div className="flex justify-between items-center">
              <span className="text-[14px] text-text-dim">Bank</span>
              <span className="font-mono text-[15px]">{bankName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[14px] text-text-dim">Account number</span>
              <span className="flex items-center gap-2">
                <span className="font-mono text-[18px] font-semibold">{accountNumber}</span>
                <CopyButton value={accountNumber} />
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[14px] text-text-dim">Account name</span>
              <span className="font-mono text-[13.5px]">{accountName}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="border border-ink bg-lime p-5 mb-4">
          <div className="font-display text-[24px] mb-1">Covered by your store credit</div>
          <p className="text-[14.5px] leading-snug">
            Nothing to transfer. Confirm below and the slot is yours.
          </p>
        </div>
      )}

      {isMock && (
        <form action={confirmAction} className="mb-3">
          <input type="hidden" name="reservation" value={reservationReference} />
          <SubmitButton pendingLabel="Settling…" variant="dark">
            {accountNumber ? "I have sent the transfer" : "Confirm and take the slot"}
          </SubmitButton>
          <p className="font-mono text-[11.5px] text-text-dim mt-2 leading-relaxed">
            DEV · no payment provider is configured, so this button stands in for the bank webhook.
          </p>
        </form>
      )}

      {!isMock && (
        <p className="font-mono text-[11.5px] leading-relaxed text-text-dim border border-ink bg-card px-3 py-2.5 mb-3">
          This page updates itself the moment the transfer lands. Keep it open, or check My pools.
        </p>
      )}

      <form action={releaseAction}>
        <input type="hidden" name="reservation" value={reservationReference} />
        <button type="submit" className="font-mono text-[11.5px] text-text-dim underline">
          Give up this hold
        </button>
      </form>
    </>
  );
}

/* ---------------------------------------------------------------------- */
/* After paying                                                            */
/* ---------------------------------------------------------------------- */

export function NameSlotForm({
  commitmentId,
  slotIndex,
  defaultName,
  defaultPhone,
}: {
  commitmentId: string;
  slotIndex: number;
  defaultName: string;
  defaultPhone: string | null;
}) {
  const [state, action] = useActionState(nameSlot, emptyState);

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="commitmentId" value={commitmentId} />
      <input type="hidden" name="slotIndex" value={slotIndex} />
      {state.error && <p className="text-rust text-[13px]">{state.error}</p>}
      <div className="flex gap-2 flex-wrap">
        <input
          name="name"
          defaultValue={defaultName}
          placeholder="Full name"
          required
          className="flex-1 min-w-[140px] border border-ink bg-card px-3 py-2 text-[14.5px]"
        />
        <input
          name="phone"
          defaultValue={defaultPhone ?? ""}
          placeholder="0803 441 9022"
          inputMode="tel"
          className="flex-1 min-w-[140px] border border-ink bg-card px-3 py-2 font-mono text-[13.5px]"
        />
        <SubmitButton block={false} size="sm" variant="outline" pendingLabel="Saving…">
          Save
        </SubmitButton>
      </div>
    </form>
  );
}

export function BookWindowForm({
  commitmentId,
  windows,
  currentWindowIso,
}: {
  commitmentId: string;
  windows: { iso: string; label: string; isFull: boolean; booked: number; capacity: number }[];
  currentWindowIso: string | null;
}) {
  const [state, action] = useActionState(bookWindow, emptyState);
  const [clearState, clearAction] = useActionState(clearWindow, emptyState);
  const [selected, setSelected] = useState(currentWindowIso ?? "");

  return (
    <>
      <FormMessage error={state.error ?? clearState.error} message={clearState.message} />
      <form action={action}>
        <input type="hidden" name="commitmentId" value={commitmentId} />
        <input type="hidden" name="at" value={selected} />

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-5">
          {windows.map((w) => {
            const isSelected = selected === w.iso;
            const disabled = w.isFull && !isSelected;
            return (
              <button
                key={w.iso}
                type="button"
                disabled={disabled}
                onClick={() => setSelected(w.iso)}
                className={`border px-2 py-2.5 font-mono text-[13.5px] ${
                  isSelected
                    ? "bg-ink text-lime border-ink"
                    : disabled
                      ? "border-rule text-text-faint line-through"
                      : "border-ink bg-card"
                }`}
                title={`${w.booked} of ${w.capacity} booked`}
              >
                {w.label}
              </button>
            );
          })}
        </div>

        <SubmitButton pendingLabel="Booking…" disabled={!selected}>
          {currentWindowIso ? "Change my window" : "Book this window"}
        </SubmitButton>
      </form>

      {currentWindowIso && (
        <form action={clearAction} className="mt-3">
          <input type="hidden" name="commitmentId" value={commitmentId} />
          <button type="submit" className="font-mono text-[11.5px] text-text-dim underline">
            Release my window
          </button>
        </form>
      )}
    </>
  );
}

export function DisputeForm({
  commitments,
  defaultCommitmentId,
}: {
  commitments: { id: string; label: string }[];
  defaultCommitmentId?: string;
}) {
  const [state, action] = useActionState(raiseDispute, emptyState);

  return (
    <form action={action}>
      <FormMessage error={state.error} />

      <label className="block font-mono text-[11.5px] text-text-dim mb-1.5">WHICH POOL</label>
      <select
        name="commitmentId"
        defaultValue={defaultCommitmentId ?? ""}
        className="w-full border border-ink bg-card px-3.5 py-3 text-[15px] mb-4"
      >
        <option value="">Not about a specific pool</option>
        {commitments.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>

      <label className="block font-mono text-[11.5px] text-text-dim mb-1.5">WHAT WENT WRONG</label>
      <select
        name="reason"
        required
        defaultValue="quality"
        className="w-full border border-ink bg-card px-3.5 py-3 text-[15px] mb-4"
      >
        <option value="quality">Quality, spoiled or off</option>
        <option value="short_weight">Short weight</option>
        <option value="wrong_cuts">Wrong cuts</option>
        <option value="no_handover">Nobody at the hub</option>
        <option value="other">Something else</option>
      </select>

      <label className="block font-mono text-[11.5px] text-text-dim mb-1.5">
        TELL US WHAT HAPPENED
      </label>
      <textarea
        name="detail"
        required
        rows={5}
        placeholder="What you collected, when, and what was wrong with it."
        className="w-full border border-ink bg-card px-3.5 py-3 text-[15px] leading-relaxed mb-4"
      />

      <label className="block font-mono text-[11.5px] text-text-dim mb-1.5">
        PHOTOS, UP TO FOUR
      </label>
      <input
        type="file"
        name="photos"
        accept="image/jpeg,image/png,image/webp,image/heic"
        multiple
        className="w-full border border-dashed border-ink bg-card px-3.5 py-3 text-[14px] mb-1.5 file:mr-3 file:border file:border-ink file:bg-paper file:px-3 file:py-1.5 file:text-[13px] file:font-semibold"
      />
      <p className="font-mono text-[11px] leading-relaxed text-text-dim mb-4">
        A photo of the item settles this much faster. Only we can see them.
      </p>

      <SubmitButton pendingLabel="Sending…" variant="dark">
        Raise this with us
      </SubmitButton>
      <p className="font-mono text-[11.5px] leading-relaxed text-text-dim mt-4">
        We answer every dispute within 48 hours. Keep the food until we do.
      </p>
    </form>
  );
}

export function RefundAsCreditForm({ refundId }: { refundId: string }) {
  const [state, action] = useActionState(refundAsCredit, emptyState);
  return (
    <form action={action}>
      {state.message && <p className="text-[13.5px] mb-2">{state.message}</p>}
      <input type="hidden" name="refundId" value={refundId} />
      <SubmitButton block={false} size="sm" variant="outline" pendingLabel="Applying…">
        Take it as store credit instead
      </SubmitButton>
    </form>
  );
}

/* ---------------------------------------------------------------------- */
/* Account                                                                 */
/* ---------------------------------------------------------------------- */

export function ProfileForm({
  defaultName,
  defaultHubId,
  hubs,
}: {
  defaultName: string;
  defaultHubId: string | null;
  hubs: { id: string; name: string }[];
}) {
  const [state, action] = useActionState(updateProfile, emptyState);

  return (
    <form action={action}>
      <FormMessage error={state.error} message={state.message} />

      <label className="block font-mono text-[11.5px] text-text-dim mb-1.5">YOUR NAME</label>
      <input
        name="name"
        defaultValue={defaultName}
        required
        placeholder="Tolu Okafor"
        className="w-full border border-ink bg-card px-3.5 py-3 text-[16px] mb-4"
      />

      <label className="block font-mono text-[11.5px] text-text-dim mb-1.5">USUAL HUB</label>
      <select
        name="homeHubId"
        defaultValue={defaultHubId ?? ""}
        className="w-full border border-ink bg-card px-3.5 py-3 text-[15px] mb-5"
      >
        <option value="">No preference</option>
        {hubs.map((h) => (
          <option key={h.id} value={h.id}>
            {h.name}
          </option>
        ))}
      </select>

      <SubmitButton pendingLabel="Saving…" variant="dark" block={false} size="md">
        Save details
      </SubmitButton>
    </form>
  );
}

export function NotificationsForm({
  whatsapp,
  sms,
  poolOpen,
}: {
  whatsapp: boolean;
  sms: boolean;
  poolOpen: boolean;
}) {
  const [state, action] = useActionState(updateNotifications, emptyState);

  const row = (name: string, label: string, hint: string, on: boolean) => (
    <div className="flex justify-between items-start gap-4 py-3.5 border-b border-rule">
      <div>
        <div className="text-[15px] font-semibold">{label}</div>
        <div className="text-[13.5px] text-text-dim leading-snug">{hint}</div>
      </div>
      <ToggleSwitch name={name} defaultOn={on} />
    </div>
  );

  return (
    <form action={action}>
      <FormMessage error={state.error} message={state.message} />
      {row("notifyWhatsapp", "WhatsApp", "Hold reminders, share dates, collection codes.", whatsapp)}
      {row("notifySms", "SMS fallback", "Used when WhatsApp does not deliver.", sms)}
      {row("notifyPoolOpen", "New pools near you", "One message when a pool opens at your hub.", poolOpen)}
      <div className="pt-4">
        <SubmitButton pendingLabel="Saving…" variant="dark" block={false} size="md">
          Save preferences
        </SubmitButton>
      </div>
    </form>
  );
}

export function WaitlistForm({ area }: { area: string }) {
  const [state, action] = useActionState(joinAreaWaitlist, emptyState);

  return (
    <form action={action} className="max-w-[420px]">
      <FormMessage error={state.error} message={state.message} />
      <input type="hidden" name="area" value={area} />
      <input
        name="phone"
        type="tel"
        placeholder="0803 441 9022"
        required
        className="w-full border border-ink bg-card px-3.5 py-3 font-mono text-[15px] mb-2.5"
      />
      <input
        name="neighbourhood"
        placeholder="Which neighbourhood?"
        className="w-full border border-ink bg-card px-3.5 py-3 text-[15px] mb-3.5"
      />
      <SubmitButton pendingLabel="Adding…" variant="dark">
        Tell me when you open here
      </SubmitButton>
    </form>
  );
}
