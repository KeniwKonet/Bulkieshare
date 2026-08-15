"use client";

import { useActionState, useState } from "react";

import { emptyState } from "@/app/actions/_state";
import {
  addGroup,
  addSupplier,
  addSupplierUser,
  blockMember,
  changeCoordinator,
  createPool,
  creditUnmatched,
  editSupplier,
  escalateUnmatched,
  inviteToGroup,
  markDelivered,
  payRefund,
  publishAllocationAction,
  recordIntakeQc,
  refundPool,
  removeFromGroup,
  resolveDisputeAction,
  returnUnmatched,
  sendQuote,
  setGroupFeeAsOps,
  setSupplierApproval,
  settlePo,
  startSupplierOnboarding,
  toggleArea,
  updateGroupFee,
} from "@/app/actions/staff";
import { FormMessage, SubmitButton } from "./interactive";

/**
 * Forms for the coordinator, supplier and ops surfaces. Each one posts to a
 * Server Action that re-checks the caller's role, so nothing here is trusted.
 */

/* ---------------------------------------------------------------------- */
/* Coordinator                                                             */
/* ---------------------------------------------------------------------- */

export function InviteMemberForm({ org }: { org: string }) {
  const [state, action] = useActionState(inviteToGroup, emptyState);
  return (
    <form action={action} className="flex gap-2 flex-wrap items-start">
      <input type="hidden" name="group" value={org} />
      <div className="flex-1 min-w-[200px]">
        <input
          name="phone"
          type="tel"
          placeholder="0803 441 9022"
          required
          className="w-full border border-ink bg-card px-3 py-2.5 font-mono text-[14px]"
        />
        {state.error && <p className="text-rust text-[13px] mt-1">{state.error}</p>}
        {state.message && <p className="text-[13px] mt-1">{state.message}</p>}
      </div>
      <SubmitButton block={false} size="md" variant="outline" pendingLabel="Adding…">
        Add member
      </SubmitButton>
    </form>
  );
}

export function RemoveMemberButton({ org, memberId }: { org: string; memberId: string }) {
  const [, action] = useActionState(removeFromGroup, emptyState);
  return (
    <form action={action}>
      <input type="hidden" name="group" value={org} />
      <input type="hidden" name="memberId" value={memberId} />
      <button type="submit" className="font-mono text-[11.5px] text-rust underline">
        remove
      </button>
    </form>
  );
}

export function GroupFeeForm({ org, currentPct }: { org: string; currentPct: number }) {
  const [state, action] = useActionState(updateGroupFee, emptyState);
  return (
    <form action={action} className="flex gap-2 items-start flex-wrap">
      <input type="hidden" name="group" value={org} />
      <div>
        <input
          name="feePct"
          type="number"
          step="0.1"
          min="0"
          max="10"
          defaultValue={currentPct}
          className="border border-ink bg-card px-3 py-2.5 font-mono text-[14px] w-24"
        />
        {state.error && <p className="text-rust text-[13px] mt-1">{state.error}</p>}
        {state.message && <p className="text-[13px] mt-1">{state.message}</p>}
      </div>
      <SubmitButton block={false} size="md" variant="outline" pendingLabel="Saving…">
        Set fee %
      </SubmitButton>
    </form>
  );
}

export function CreatePoolForm({
  areaSlug,
  hubs,
  org,
}: {
  areaSlug: string;
  hubs: { id: string; name: string }[];
  org?: string;
}) {
  const [state, action] = useActionState(createPool, emptyState);

  const field = (label: string, node: React.ReactNode, error?: string) => (
    <div className="mb-4">
      <label className="block font-mono text-[11.5px] text-text-dim mb-1.5">{label}</label>
      {node}
      {error && <p className="text-rust text-[13px] mt-1">{error}</p>}
    </div>
  );

  const input = "w-full border border-ink bg-card px-3.5 py-3 text-[15px]";

  return (
    <form action={action} className="max-w-xl">
      <FormMessage error={state.error} />
      <input type="hidden" name="areaSlug" value={areaSlug} />
      {org && <input type="hidden" name="group" value={org} />}

      {field(
        "WHAT ARE YOU BUYING",
        <input name="title" required placeholder="Rice, 50kg bag" className={input} />,
        state.fieldErrors?.title,
      )}

      {field(
        "WHAT ONE SLOT GETS YOU",
        <input
          name="unitDescription"
          required
          placeholder="One whole bag per slot"
          className={input}
        />,
        state.fieldErrors?.unitDescription,
      )}

      {field(
        "DESCRIPTION",
        <textarea
          name="description"
          rows={3}
          placeholder="Where it comes from, and anything a member should know before paying."
          className={input}
        />,
      )}

      <div className="grid grid-cols-2 gap-3">
        {field(
          "CATEGORY",
          <select name="category" defaultValue="grains" className={input}>
            <option value="meat">Meat</option>
            <option value="grains">Grains</option>
            <option value="produce">Produce</option>
            <option value="other">Other</option>
          </select>,
        )}
        {field(
          "COLLECTION HUB",
          <select name="hubId" required className={input}>
            {hubs.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>,
          state.fieldErrors?.hubId,
        )}
        {field(
          "TOTAL SLOTS",
          <input name="totalSlots" type="number" min="2" defaultValue="14" required className={input} />,
          state.fieldErrors?.totalSlots,
        )}
        {field(
          "THRESHOLD TO GO AHEAD",
          <input name="threshold" type="number" min="1" defaultValue="12" required className={input} />,
          state.fieldErrors?.threshold,
        )}
        {field(
          "PRICE PER SLOT (₦)",
          <input name="priceNaira" type="number" min="1" defaultValue="62000" required className={input} />,
          state.fieldErrors?.priceNaira,
        )}
        {field(
          "CLOSES IN (DAYS)",
          <input name="closesInDays" type="number" min="1" max="60" defaultValue="5" required className={input} />,
          state.fieldErrors?.closesInDays,
        )}
        {field(
          "SHARE DATE IN (DAYS)",
          <input name="shareInDays" type="number" min="2" max="90" defaultValue="9" required className={input} />,
          state.fieldErrors?.shareInDays,
        )}
      </div>

      <SubmitButton pendingLabel="Opening…" variant="dark">
        Open this pool
      </SubmitButton>
      <p className="font-mono text-[11.5px] leading-relaxed text-text-dim mt-3">
        The pool opens immediately and your members can reserve straight away.
      </p>
    </form>
  );
}

/* ---------------------------------------------------------------------- */
/* Supplier                                                                */
/* ---------------------------------------------------------------------- */

export function QuoteForm({
  quoteRequestId,
  lastPriceNaira,
  minHoldDays,
}: {
  quoteRequestId: string;
  lastPriceNaira: number | null;
  minHoldDays: number;
}) {
  const [state, action] = useActionState(sendQuote, emptyState);

  return (
    <form action={action}>
      <FormMessage error={state.error} message={state.message} />
      <input type="hidden" name="quoteRequestId" value={quoteRequestId} />

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block font-mono text-[11.5px] text-text-dim mb-1.5">
            YOUR PRICE (₦)
          </label>
          <input
            name="priceNaira"
            type="number"
            min="1"
            defaultValue={lastPriceNaira ?? undefined}
            required
            className="w-full border border-ink bg-card px-3 py-2.5 font-mono text-[15px]"
          />
        </div>
        <div>
          <label className="block font-mono text-[11.5px] text-text-dim mb-1.5">
            HOLD IT FOR (DAYS)
          </label>
          <input
            name="holdDays"
            type="number"
            min={minHoldDays}
            max="30"
            defaultValue={minHoldDays}
            required
            className="w-full border border-ink bg-card px-3 py-2.5 font-mono text-[15px]"
          />
        </div>
      </div>

      <textarea
        name="note"
        rows={2}
        placeholder="Anything we should know about this price."
        className="w-full border border-ink bg-card px-3 py-2.5 text-[14.5px] mb-3"
      />

      <SubmitButton pendingLabel="Sending…" variant="dark" block={false} size="md">
        Send this quote
      </SubmitButton>
    </form>
  );
}

export function SupplierOnboardingForm({ defaultContact }: { defaultContact: string }) {
  const [state, action] = useActionState(startSupplierOnboarding, emptyState);
  const input = "w-full border border-ink bg-card px-3.5 py-3 text-[15px] mb-3.5";

  return (
    <form action={action} className="max-w-xl">
      <FormMessage error={state.error} />
      <label className="block font-mono text-[11.5px] text-text-dim mb-1.5">BUSINESS NAME</label>
      <input name="name" required placeholder="Kuje Livestock Aggregators" className={input} />

      <label className="block font-mono text-[11.5px] text-text-dim mb-1.5">WHO WE CALL</label>
      <input name="contactName" placeholder="Musa Kuje" className={input} />

      <label className="block font-mono text-[11.5px] text-text-dim mb-1.5">PHONE</label>
      <input name="contactPhone" defaultValue={defaultContact} className={input} />

      <label className="block font-mono text-[11.5px] text-text-dim mb-1.5">
        WHERE WE PAY YOU
      </label>
      <input name="bankName" placeholder="Bank" className={input} />
      <input name="bankAccountNumber" placeholder="Account number" className={input} />
      <input name="bankAccountName" placeholder="Account name" className={input} />

      <SubmitButton pendingLabel="Submitting…" variant="dark">
        Submit for review
      </SubmitButton>
    </form>
  );
}

/* ---------------------------------------------------------------------- */
/* Ops                                                                     */
/* ---------------------------------------------------------------------- */

export function ResolveDisputeForm({ disputeId }: { disputeId: string }) {
  const [state, action] = useActionState(resolveDisputeAction, emptyState);

  return (
    <form action={action}>
      <FormMessage error={state.error} message={state.message} />
      <input type="hidden" name="disputeId" value={disputeId} />

      <textarea
        name="resolution"
        rows={3}
        required
        placeholder="What you decided and why. The member sees this word for word."
        className="w-full border border-ink bg-card px-3 py-2.5 text-[14.5px] mb-2.5"
      />

      <div className="flex gap-2 flex-wrap items-center">
        <input
          name="creditNaira"
          type="number"
          min="0"
          placeholder="Credit ₦"
          className="border border-ink bg-card px-3 py-2.5 font-mono text-[14px] w-32"
        />
        <button
          type="submit"
          name="outcome"
          value="resolved"
          className="bg-lime border border-ink font-bold text-[14px] px-4 py-2.5"
        >
          Uphold and credit
        </button>
        <button
          type="submit"
          name="outcome"
          value="rejected"
          className="border border-rust text-rust font-semibold text-[14px] px-4 py-2.5"
        >
          Reject
        </button>
      </div>
    </form>
  );
}

export function UnmatchedTransferActions({
  transferId,
  members,
}: {
  transferId: string;
  members: { id: string; label: string }[];
}) {
  const [creditState, creditAction] = useActionState(creditUnmatched, emptyState);
  const [, returnAction] = useActionState(returnUnmatched, emptyState);
  const [, escalateAction] = useActionState(escalateUnmatched, emptyState);

  return (
    <div className="flex flex-col gap-2">
      {creditState.error && <p className="text-rust text-[13px]">{creditState.error}</p>}
      {creditState.message && <p className="text-[13px]">{creditState.message}</p>}

      <form action={creditAction} className="flex gap-2 flex-wrap items-center">
        <input type="hidden" name="transferId" value={transferId} />
        <select
          name="memberId"
          required
          defaultValue=""
          className="border border-ink bg-card px-2.5 py-2 text-[13.5px] max-w-[220px]"
        >
          <option value="" disabled>
            Match to a member…
          </option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="bg-lime border border-ink font-bold text-[13px] px-3 py-2"
        >
          Apply as credit
        </button>
      </form>

      <div className="flex gap-2 flex-wrap">
        <form action={returnAction}>
          <input type="hidden" name="transferId" value={transferId} />
          <button type="submit" className="border border-ink font-semibold text-[13px] px-3 py-2">
            Return to sender
          </button>
        </form>
        <form action={escalateAction}>
          <input type="hidden" name="transferId" value={transferId} />
          <button
            type="submit"
            className="border border-rust text-rust font-semibold text-[13px] px-3 py-2"
          >
            Escalate
          </button>
        </form>
      </div>
    </div>
  );
}

export function PayRefundButton({ refundId }: { refundId: string }) {
  const [state, action] = useActionState(payRefund, emptyState);
  return (
    <form action={action}>
      <input type="hidden" name="refundId" value={refundId} />
      {state.error && <span className="text-rust text-[12px]">{state.error}</span>}
      <button type="submit" className="border border-ink font-semibold text-[13px] px-3 py-1.5">
        Mark paid
      </button>
    </form>
  );
}

export function RefundPoolButton({ poolId }: { poolId: string }) {
  const [state, action] = useActionState(refundPool, emptyState);
  return (
    <form action={action}>
      <input type="hidden" name="poolId" value={poolId} />
      {state.message && <p className="text-[13px] mb-1">{state.message}</p>}
      <button
        type="submit"
        className="border border-rust text-rust font-semibold text-[13px] px-3 py-1.5"
      >
        Cancel and refund everyone
      </button>
    </form>
  );
}

export function IntakeQcForm({ po, balanceNaira }: { po: string; balanceNaira: number }) {
  const [state, action] = useActionState(recordIntakeQc, emptyState);

  return (
    <form action={action}>
      <FormMessage error={state.error} message={state.message} />
      <input type="hidden" name="po" value={po} />

      <textarea
        name="note"
        rows={2}
        placeholder="What you saw at intake."
        className="w-full border border-ink bg-card px-3 py-2.5 text-[14.5px] mb-2.5"
      />

      <div className="flex gap-2 flex-wrap items-center">
        <input
          name="settleNaira"
          type="number"
          min="0"
          defaultValue={balanceNaira}
          className="border border-ink bg-card px-3 py-2.5 font-mono text-[14px] w-36"
        />
        <button
          type="submit"
          name="outcome"
          value="pass"
          className="bg-lime border border-ink font-bold text-[14px] px-4 py-2.5"
        >
          QC passed
        </button>
        <button
          type="submit"
          name="outcome"
          value="fail"
          className="border border-rust text-rust font-semibold text-[14px] px-4 py-2.5"
        >
          QC failed, settle short
        </button>
      </div>
    </form>
  );
}

export function MarkDeliveredButton({ po }: { po: string }) {
  const [, action] = useActionState(markDelivered, emptyState);
  return (
    <form action={action}>
      <input type="hidden" name="po" value={po} />
      <button type="submit" className="border border-ink font-semibold text-[13px] px-3 py-2">
        Mark delivered
      </button>
    </form>
  );
}

export function SettlePoButton({ po }: { po: string }) {
  const [, action] = useActionState(settlePo, emptyState);
  return (
    <form action={action}>
      <input type="hidden" name="po" value={po} />
      <button
        type="submit"
        className="bg-lime border border-ink font-bold text-[13px] px-3 py-2"
      >
        Release balance
      </button>
    </form>
  );
}

export function BlockMemberButton({ memberId, blocked }: { memberId: string; blocked: boolean }) {
  const [, action] = useActionState(blockMember, emptyState);
  return (
    <form action={action}>
      <input type="hidden" name="memberId" value={memberId} />
      <input type="hidden" name="blocked" value={blocked ? "0" : "1"} />
      <button
        type="submit"
        className={`border font-semibold text-[13px] px-3 py-1.5 ${
          blocked ? "border-ink" : "border-rust text-rust"
        }`}
      >
        {blocked ? "Unblock" : "Block"}
      </button>
    </form>
  );
}

export function PublishAllocationButton({ poolId, slots }: { poolId: string; slots: number }) {
  const [state, action] = useActionState(publishAllocationAction, emptyState);
  return (
    <form action={action}>
      <input type="hidden" name="poolId" value={poolId} />
      {state.message && <p className="text-[13.5px] mb-2">{state.message}</p>}
      <SubmitButton block={false} size="lg" pendingLabel="Publishing…">
        Publish to {slots} slot{slots === 1 ? "" : "s"}
      </SubmitButton>
    </form>
  );
}

/* ---------------------------------------------------------------------- */
/* Ops: suppliers                                                          */
/* ---------------------------------------------------------------------- */

export function ApproveSupplierButton({
  supplierId,
  approved,
}: {
  supplierId: string;
  approved: boolean;
}) {
  const [state, action] = useActionState(setSupplierApproval, emptyState);
  return (
    <form action={action}>
      <input type="hidden" name="supplierId" value={supplierId} />
      <input type="hidden" name="approved" value={approved ? "0" : "1"} />
      {state.error && <p className="text-rust text-[12.5px] mb-1.5 max-w-[36ch]">{state.error}</p>}
      <button
        type="submit"
        className={`font-semibold text-[13px] px-3 py-1.5 border ${
          approved ? "border-ink" : "bg-lime border-ink font-bold"
        }`}
      >
        {approved ? "Withdraw approval" : "Approve"}
      </button>
    </form>
  );
}

const supplierFields = (
  prefix: Record<string, string | null | undefined>,
  errors?: Record<string, string>,
) => {
  const input = "w-full border border-ink bg-card px-3.5 py-3 text-[15px]";
  const field = (name: string, label: string, placeholder: string, defaultValue?: string | null) => (
    <div className="mb-3.5">
      <label className="block font-mono text-[11.5px] text-text-dim mb-1.5">{label}</label>
      <input
        name={name}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className={input}
      />
      {errors?.[name] && <p className="text-rust text-[13px] mt-1">{errors[name]}</p>}
    </div>
  );

  return (
    <>
      {field("name", "BUSINESS NAME", "Kuje Livestock Aggregators", prefix.name)}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {field("contactName", "WHO WE CALL", "Musa Kuje", prefix.contactName)}
        {field("contactPhone", "PHONE", "0803 441 9022", prefix.contactPhone)}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {field("bankName", "BANK", "Sterling", prefix.bankName)}
        {field("bankAccountNumber", "ACCOUNT NUMBER", "0044118220", prefix.bankAccountNumber)}
        {field("bankAccountName", "ACCOUNT NAME", "As registered", prefix.bankAccountName)}
      </div>
    </>
  );
};

export function SupplierDetailsForm({
  supplierId,
  supplier,
}: {
  supplierId: string;
  supplier: Record<string, string | null | undefined>;
}) {
  const [state, action] = useActionState(editSupplier, emptyState);
  return (
    <form action={action}>
      <FormMessage error={state.error} message={state.message} />
      <input type="hidden" name="supplierId" value={supplierId} />
      {supplierFields(supplier, state.fieldErrors)}
      <SubmitButton block={false} size="md" variant="dark" pendingLabel="Saving…">
        Save details
      </SubmitButton>
    </form>
  );
}

export function NewSupplierForm() {
  const [state, action] = useActionState(addSupplier, emptyState);
  return (
    <form action={action} className="max-w-xl">
      <FormMessage error={state.error} />
      {supplierFields({}, state.fieldErrors)}
      <SubmitButton pendingLabel="Creating…" variant="dark">
        Create supplier
      </SubmitButton>
      <p className="font-mono text-[11.5px] leading-relaxed text-text-dim mt-3">
        They start unapproved. Approving needs bank details on file, because an approved supplier
        can be issued a purchase order.
      </p>
    </form>
  );
}

export function GrantSupplierAccessForm({ supplierId }: { supplierId: string }) {
  const [state, action] = useActionState(addSupplierUser, emptyState);
  return (
    <form action={action} className="flex gap-2 flex-wrap items-start">
      <input type="hidden" name="supplierId" value={supplierId} />
      <div className="flex-1 min-w-[200px]">
        <input
          name="phone"
          type="tel"
          placeholder="0803 441 9022"
          required
          className="w-full border border-ink bg-card px-3 py-2.5 font-mono text-[14px]"
        />
        {state.error && <p className="text-rust text-[13px] mt-1">{state.error}</p>}
        {state.message && <p className="text-[13px] mt-1">{state.message}</p>}
      </div>
      <SubmitButton block={false} size="md" variant="outline" pendingLabel="Linking…">
        Give portal access
      </SubmitButton>
    </form>
  );
}

/* ---------------------------------------------------------------------- */
/* Ops: cooperatives                                                       */
/* ---------------------------------------------------------------------- */

export function NewGroupForm({
  areas,
  hubs,
}: {
  areas: { slug: string; label: string }[];
  hubs: { id: string; name: string; areaSlug: string }[];
}) {
  const [state, action] = useActionState(addGroup, emptyState);
  const [areaSlug, setAreaSlug] = useState(areas[0]?.slug ?? "");
  const input = "w-full border border-ink bg-card px-3.5 py-3 text-[15px]";

  return (
    <form action={action} className="max-w-xl">
      <FormMessage error={state.error} />

      <div className="mb-3.5">
        <label className="block font-mono text-[11.5px] text-text-dim mb-1.5">
          COOPERATIVE NAME
        </label>
        <input name="name" required placeholder="Karu Estate Residents" className={input} />
        {state.fieldErrors?.name && (
          <p className="text-rust text-[13px] mt-1">{state.fieldErrors.name}</p>
        )}
      </div>

      <div className="mb-3.5">
        <label className="block font-mono text-[11.5px] text-text-dim mb-1.5">
          COORDINATOR&apos;S PHONE
        </label>
        <input
          name="coordinatorPhone"
          type="tel"
          required
          placeholder="0812 007 5510"
          className={input}
        />
        {state.fieldErrors?.coordinatorPhone && (
          <p className="text-rust text-[13px] mt-1">{state.fieldErrors.coordinatorPhone}</p>
        )}
        <p className="font-mono text-[11px] text-text-dim mt-1.5">
          They must have signed in at least once. Assigning them makes them a coordinator.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="mb-3.5">
          <label className="block font-mono text-[11.5px] text-text-dim mb-1.5">AREA</label>
          <select
            name="areaSlug"
            value={areaSlug}
            onChange={(e) => setAreaSlug(e.target.value)}
            className={input}
          >
            {areas.map((a) => (
              <option key={a.slug} value={a.slug}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-3.5">
          <label className="block font-mono text-[11.5px] text-text-dim mb-1.5">
            USUAL HUB (OPTIONAL)
          </label>
          <select name="hubId" className={input} defaultValue="">
            <option value="">No preference</option>
            {hubs
              .filter((h) => h.areaSlug === areaSlug)
              .map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
          </select>
        </div>
      </div>

      <SubmitButton pendingLabel="Creating…" variant="dark">
        Create cooperative
      </SubmitButton>
    </form>
  );
}

export function ChangeCoordinatorForm({ groupId }: { groupId: string }) {
  const [state, action] = useActionState(changeCoordinator, emptyState);
  return (
    <form action={action} className="flex gap-2 flex-wrap items-start">
      <input type="hidden" name="groupId" value={groupId} />
      <div className="flex-1 min-w-[200px]">
        <input
          name="phone"
          type="tel"
          placeholder="New coordinator's phone"
          required
          className="w-full border border-ink bg-card px-3 py-2.5 font-mono text-[14px]"
        />
        {state.error && <p className="text-rust text-[13px] mt-1">{state.error}</p>}
        {state.message && <p className="text-[13px] mt-1">{state.message}</p>}
      </div>
      <SubmitButton block={false} size="md" variant="outline" pendingLabel="Handing over…">
        Hand over
      </SubmitButton>
    </form>
  );
}

export function OpsGroupFeeForm({
  groupId,
  currentPct,
}: {
  groupId: string;
  currentPct: number;
}) {
  const [state, action] = useActionState(setGroupFeeAsOps, emptyState);
  return (
    <form action={action} className="flex gap-2 items-start flex-wrap">
      <input type="hidden" name="groupId" value={groupId} />
      <div>
        <input
          name="feePct"
          type="number"
          step="0.1"
          min="0"
          max="10"
          defaultValue={currentPct}
          className="border border-ink bg-card px-3 py-2.5 font-mono text-[14px] w-24"
        />
        {state.error && <p className="text-rust text-[13px] mt-1">{state.error}</p>}
        {state.message && <p className="text-[13px] mt-1">{state.message}</p>}
      </div>
      <SubmitButton block={false} size="md" variant="outline" pendingLabel="Saving…">
        Set fee %
      </SubmitButton>
    </form>
  );
}

export function ToggleAreaButton({ area, live }: { area: string; live: boolean }) {
  const [, action] = useActionState(toggleArea, emptyState);
  return (
    <form action={action}>
      <input type="hidden" name="area" value={area} />
      <input type="hidden" name="live" value={live ? "0" : "1"} />
      <button type="submit" className="border border-ink font-semibold text-[13px] px-3 py-1.5">
        {live ? "Take offline" : "Make live"}
      </button>
    </form>
  );
}
