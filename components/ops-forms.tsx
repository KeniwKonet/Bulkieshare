"use client";

import { useActionState, useState } from "react";

import { emptyState } from "@/app/actions/_state";
import {
  addHub,
  awardQuoteAction,
  cancelRfq,
  changeMemberRole,
  editHub,
  giveGoodwillCredit,
  raiseQuoteRequest,
  setHubActive,
} from "@/app/actions/staff";
import { formatKobo } from "@/lib/money";
import { FormMessage, SubmitButton } from "./interactive";

/**
 * Forms for the ops back office: buying, hubs, and the two member controls that
 * hand out privilege or money. Each posts to a Server Action that re-checks the
 * caller is ops before doing anything.
 */

const input = "w-full border border-ink bg-card px-3.5 py-3 text-[15px]";

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3.5">
      <label className="block font-mono text-[11.5px] text-text-dim mb-1.5">{label}</label>
      {children}
      {hint && !error && (
        <p className="font-mono text-[11px] text-text-dim mt-1.5 leading-relaxed">{hint}</p>
      )}
      {error && <p className="text-rust text-[13px] mt-1">{error}</p>}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Procurement                                                             */
/* ---------------------------------------------------------------------- */

export function RaiseRfqForm({
  pools,
  hubs,
  defaultPoolId,
}: {
  pools: { id: string; label: string; hubId: string }[];
  hubs: { id: string; name: string }[];
  defaultPoolId?: string;
}) {
  const [state, action] = useActionState(raiseQuoteRequest, emptyState);
  const [poolId, setPoolId] = useState(defaultPoolId ?? "");
  const [quantity, setQuantity] = useState(1);
  const [lastPrice, setLastPrice] = useState(0);
  const [depositPct, setDepositPct] = useState(40);

  const estimateKobo = quantity * lastPrice * 100;
  const depositKobo = Math.round((estimateKobo * depositPct) / 100);

  return (
    <form action={action} className="max-w-xl">
      <FormMessage error={state.error} />

      <Field
        label="WHAT ARE YOU BUYING"
        error={state.fieldErrors?.title}
        hint="Suppliers see this as the headline. Be specific: grade, weight, condition."
      >
        <input name="title" required placeholder="Cattle, 220kg or more" className={input} />
      </Field>

      <Field label="ANYTHING ELSE THEY SHOULD KNOW">
        <textarea
          name="description"
          rows={3}
          placeholder="Delivery yard, cut-off time, what will fail QC."
          className={input}
        />
      </Field>

      <Field
        label="FOR WHICH POOL"
        hint="Attaching a pool records the supplier against it once you award, and puts the order on its timeline."
      >
        <select
          name="poolId"
          value={poolId}
          onChange={(e) => setPoolId(e.target.value)}
          className={input}
        >
          <option value="">Not for a specific pool</option>
          {pools.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="DELIVER TO WHICH HUB">
        <select name="hubId" defaultValue="" className={input}>
          <option value="">Not decided yet</option>
          {hubs.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="HOW MANY" error={state.fieldErrors?.quantity}>
          <input
            name="quantity"
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value) || 1)}
            required
            className={input}
          />
        </Field>
        <Field label="LAST PRICE PAID, EACH (₦)" hint="Optional. Shown to suppliers as the anchor.">
          <input
            name="lastPriceNaira"
            type="number"
            min="0"
            value={lastPrice || ""}
            onChange={(e) => setLastPrice(Number(e.target.value) || 0)}
            className={input}
          />
        </Field>
        <Field label="DEPOSIT ON AWARD (%)">
          <input
            name="depositPct"
            type="number"
            min="0"
            max="100"
            value={depositPct}
            onChange={(e) => setDepositPct(Number(e.target.value) || 0)}
            required
            className={input}
          />
        </Field>
        <Field label="QUOTE MUST HOLD (DAYS)">
          <input name="minHoldDays" type="number" min="1" max="60" defaultValue="7" required className={input} />
        </Field>
      </div>

      <Field
        label="STOP ACCEPTING QUOTES IN (DAYS)"
        error={state.fieldErrors?.closesInDays}
        hint="After this, suppliers can no longer quote and the request drops off their list."
      >
        <input name="closesInDays" type="number" min="1" max="60" defaultValue="3" required className={input} />
      </Field>

      {estimateKobo > 0 && (
        <div className="border border-ink bg-card p-4 mb-4">
          <div className="font-mono text-[11px] text-text-dim mb-2">
            IF SOMEONE QUOTES YOUR LAST PRICE
          </div>
          <div className="flex justify-between text-[14.5px] py-1">
            <span className="text-text-dim">
              {quantity} × {formatKobo(lastPrice * 100)}
            </span>
            <span className="font-mono">{formatKobo(estimateKobo)}</span>
          </div>
          <div className="flex justify-between text-[14.5px] py-1 border-t border-rule-card mt-1 pt-2">
            <span className="text-text-dim">Deposit due on award</span>
            <span className="font-mono">{formatKobo(depositKobo)}</span>
          </div>
        </div>
      )}

      <SubmitButton pendingLabel="Sending…" variant="dark">
        Request quotes
      </SubmitButton>
      <p className="font-mono text-[11.5px] leading-relaxed text-text-dim mt-3">
        Approved suppliers see this immediately. Nothing is committed until you award one.
      </p>
    </form>
  );
}

export function AwardQuoteButton({
  quoteId,
  supplierName,
  totalKobo,
  blocked,
}: {
  quoteId: string;
  supplierName: string;
  totalKobo: number;
  blocked: boolean;
}) {
  const [state, action] = useActionState(awardQuoteAction, emptyState);

  if (blocked) {
    return (
      <span className="font-mono text-[11.5px] text-rust-dark border border-rust-dark px-2.5 py-1.5 inline-block">
        NOT CLEARED FOR ORDERS
      </span>
    );
  }

  return (
    <form action={action}>
      <input type="hidden" name="quoteId" value={quoteId} />
      {state.error && <p className="text-rust text-[13px] mb-2 max-w-[40ch]">{state.error}</p>}
      {state.message && <p className="text-[13.5px] mb-2">{state.message}</p>}
      <SubmitButton block={false} size="sm" pendingLabel="Issuing…">
        Award to {supplierName.split(" ")[0]} · {formatKobo(totalKobo)}
      </SubmitButton>
    </form>
  );
}

export function CancelRfqButton({ quoteRequestId }: { quoteRequestId: string }) {
  const [state, action] = useActionState(cancelRfq, emptyState);
  return (
    <form action={action}>
      <input type="hidden" name="quoteRequestId" value={quoteRequestId} />
      {state.message && <p className="text-[13px] mb-1">{state.message}</p>}
      <button
        type="submit"
        className="border border-rust text-rust font-semibold text-[13px] px-3 py-1.5"
      >
        Close without awarding
      </button>
    </form>
  );
}

/* ---------------------------------------------------------------------- */
/* Hubs                                                                    */
/* ---------------------------------------------------------------------- */

function hubFields(
  values: Record<string, string | number | null | undefined>,
  errors?: Record<string, string>,
) {
  return (
    <>
      <Field label="HUB NAME" error={errors?.name}>
        <input name="name" defaultValue={values.name ?? ""} required placeholder="Kuje hub" className={input} />
      </Field>
      <Field label="ADDRESS" error={errors?.address}>
        <input
          name="address"
          defaultValue={values.address ?? ""}
          required
          placeholder="Kuje market road, beside the abattoir"
          className={input}
        />
      </Field>
      <Field label="LANDMARK" hint="What you would tell someone on the phone.">
        <input
          name="landmark"
          defaultValue={values.landmark ?? ""}
          placeholder="Green gate opposite the mosque"
          className={input}
        />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="COLLECTION WINDOWS">
          <input
            name="windows"
            defaultValue={values.windows ?? ""}
            placeholder="Sat, 08:00 to 14:00"
            className={input}
          />
        </Field>
        <Field
          label="HANDOVERS AN HOUR"
          hint="This sets how many people can book each 20 minute slot."
        >
          <input
            name="capacityPerHour"
            type="number"
            min="1"
            max="200"
            defaultValue={values.capacityPerHour ?? 20}
            required
            className={input}
          />
        </Field>
      </div>
      <Field label="NOTES">
        <input
          name="notes"
          defaultValue={values.notes ?? ""}
          placeholder="Cold room on site"
          className={input}
        />
      </Field>
    </>
  );
}

export function NewHubForm({ areas }: { areas: { slug: string; label: string }[] }) {
  const [state, action] = useActionState(addHub, emptyState);
  return (
    <form action={action} className="max-w-xl">
      <FormMessage error={state.error} />
      <Field label="AREA" error={state.fieldErrors?.areaSlug}>
        <select name="areaSlug" required className={input} defaultValue={areas[0]?.slug ?? ""}>
          {areas.map((a) => (
            <option key={a.slug} value={a.slug}>
              {a.label}
            </option>
          ))}
        </select>
      </Field>
      {hubFields({}, state.fieldErrors)}
      <SubmitButton pendingLabel="Creating…" variant="dark">
        Create hub
      </SubmitButton>
      <p className="font-mono text-[11.5px] leading-relaxed text-text-dim mt-3">
        A hub needs an agent before it can hand anything over. Assign one from the members list.
      </p>
    </form>
  );
}

export function HubDetailsForm({
  hubId,
  values,
}: {
  hubId: string;
  values: Record<string, string | number | null | undefined>;
}) {
  const [state, action] = useActionState(editHub, emptyState);
  return (
    <form action={action}>
      <FormMessage error={state.error} message={state.message} />
      <input type="hidden" name="hubId" value={hubId} />
      {hubFields(values, state.fieldErrors)}
      <SubmitButton block={false} size="md" variant="dark" pendingLabel="Saving…">
        Save hub
      </SubmitButton>
    </form>
  );
}

export function ToggleHubButton({ hubId, isActive }: { hubId: string; isActive: boolean }) {
  const [state, action] = useActionState(setHubActive, emptyState);
  return (
    <form action={action}>
      <input type="hidden" name="hubId" value={hubId} />
      <input type="hidden" name="active" value={isActive ? "0" : "1"} />
      {state.message && <p className="text-[13px] mb-1">{state.message}</p>}
      <button
        type="submit"
        className={`border font-semibold text-[13px] px-3 py-1.5 ${
          isActive ? "border-rust text-rust" : "border-ink"
        }`}
      >
        {isActive ? "Close this hub" : "Reopen this hub"}
      </button>
    </form>
  );
}

/* ---------------------------------------------------------------------- */
/* Member administration                                                   */
/* ---------------------------------------------------------------------- */

const ROLE_NOTES: Record<string, string> = {
  member: "Buys slots. No back-office access.",
  coordinator: "Runs pools for a cooperative and earns a fee.",
  hub_agent: "Works a hub counter and records handovers.",
  supplier: "Quotes and delivers. Needs a supplier record linked.",
  ops: "Full back office, including money and refunds.",
  admin: "Everything ops can do.",
};

export function MemberRoleForm({
  memberId,
  currentRole,
  currentHubId,
  hubs,
  isSelf,
}: {
  memberId: string;
  currentRole: string;
  currentHubId: string | null;
  hubs: { id: string; name: string }[];
  isSelf: boolean;
}) {
  const [state, action] = useActionState(changeMemberRole, emptyState);
  const [role, setRole] = useState(currentRole);

  return (
    <form action={action}>
      <FormMessage error={state.error} message={state.message} />
      <input type="hidden" name="memberId" value={memberId} />

      <select
        name="role"
        value={role}
        onChange={(e) => setRole(e.target.value)}
        className={`${input} mb-2`}
      >
        {Object.keys(ROLE_NOTES).map((r) => (
          <option key={r} value={r}>
            {r.replace("_", " ")}
          </option>
        ))}
      </select>

      <p className="font-mono text-[11px] text-text-dim leading-relaxed mb-3">{ROLE_NOTES[role]}</p>

      {role === "hub_agent" && (
        <select name="homeHubId" defaultValue={currentHubId ?? ""} className={`${input} mb-3`}>
          <option value="">Pick their hub…</option>
          {hubs.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
      )}

      <SubmitButton
        block={false}
        size="md"
        variant="outline"
        pendingLabel="Saving…"
        disabled={role === currentRole || (isSelf && role !== "ops" && role !== "admin")}
      >
        Change role
      </SubmitButton>

      {isSelf && (
        <p className="font-mono text-[11px] text-text-dim mt-2">
          This is your own account. You cannot remove your own ops access.
        </p>
      )}
    </form>
  );
}

export function GoodwillCreditForm({ memberId }: { memberId: string }) {
  const [state, action] = useActionState(giveGoodwillCredit, emptyState);
  return (
    <form action={action}>
      <FormMessage error={state.error} message={state.message} />
      <input type="hidden" name="memberId" value={memberId} />
      <div className="flex gap-2 flex-wrap items-start">
        <input
          name="amountNaira"
          type="number"
          min="1"
          placeholder="₦"
          required
          className="border border-ink bg-card px-3 py-2.5 font-mono text-[14px] w-28"
        />
        <input
          name="reason"
          placeholder="What is this for?"
          required
          className="flex-1 min-w-[180px] border border-ink bg-card px-3 py-2.5 text-[14px]"
        />
        <SubmitButton block={false} size="md" variant="outline" pendingLabel="Crediting…">
          Credit
        </SubmitButton>
      </div>
      <p className="font-mono text-[11px] text-text-dim mt-2 leading-relaxed">
        The member sees your reason on their own ledger, and the grant is recorded against your
        name.
      </p>
    </form>
  );
}
