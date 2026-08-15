"use client";

import { useActionState, useState } from "react";

import { checkCollectionCode, handOver } from "@/app/actions/staff";
import { emptyState } from "@/app/actions/_state";
import { SubmitButton } from "./interactive";

/**
 * The hub counter tools. Both are deliberately large-target and keyboard-free:
 * an agent uses these standing up, one-handed, next to a scale.
 */

export function CodeLookupForm({ hubId }: { hubId: string }) {
  const [state, action] = useActionState(checkCollectionCode, emptyState);
  const [digits, setDigits] = useState("");

  const press = (d: string) => {
    if (d === "back") return setDigits((s) => s.slice(0, -1));
    if (d === "clr") return setDigits("");
    if (digits.length >= 4) return;
    setDigits((s) => s + d);
  };

  return (
    <form action={action}>
      <input type="hidden" name="hubId" value={hubId} />
      <input type="hidden" name="code" value={digits} />

      <div className="border border-dark-rule-2 bg-[#1A1A18] py-5 text-center">
        <div className="font-mono text-[11.5px] text-dark-dim-2">COLLECTION CODE</div>
        <div className="font-display text-[52px] sm:text-[56px] tracking-[.12em]">
          {digits.padEnd(4, "·")}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-2.5">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "back", "0", "clr"].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => press(d)}
            className="border border-dark-rule-2 py-3.5 text-center font-mono text-[18px]"
          >
            {d === "back" ? "⌫" : d === "clr" ? "C" : d}
          </button>
        ))}
      </div>

      {state.error && (
        <p className="border border-rust text-rust px-3 py-2.5 text-[14px] mt-3">{state.error}</p>
      )}
      {state.message && (
        <p className="border border-lime text-lime px-3 py-2.5 text-[14px] mt-3">{state.message}</p>
      )}

      <div className="mt-3">
        <SubmitButton pendingLabel="Checking…" disabled={digits.length !== 4}>
          Look up this code
        </SubmitButton>
      </div>
    </form>
  );
}

export function HandoverForm({
  commitmentId,
  hubId,
  memberName,
  slots,
  nominalKg,
  toleranceBand,
}: {
  commitmentId: string;
  hubId: string;
  memberName: string;
  slots: number;
  nominalKg: number | null;
  toleranceBand: number | null;
}) {
  const [state, action] = useActionState(handOver, emptyState);
  const [digits, setDigits] = useState("");

  const weight = digits ? Number(digits) / 100 : 0;
  const expected = nominalKg ? nominalKg * slots : null;
  const variancePct = expected && weight ? ((weight - expected) / expected) * 100 : null;
  const withinBand =
    variancePct === null || toleranceBand === null
      ? true
      : Math.abs(variancePct) <= toleranceBand * 100;

  const press = (d: string) => {
    if (d === "back") return setDigits((s) => s.slice(0, -1));
    if (d === "clr") return setDigits("");
    if (digits.length >= 5) return;
    setDigits((s) => s + d);
  };

  return (
    <form action={action}>
      <input type="hidden" name="commitmentId" value={commitmentId} />
      <input type="hidden" name="hubId" value={hubId} />
      <input type="hidden" name="weightKg" value={weight || ""} />

      <div className="px-4.5 py-4.5 border-b border-dark-rule-2">
        <div className="font-mono text-[11.5px] text-dark-dim-2">
          {slots} SLOT{slots === 1 ? "" : "S"} · {memberName.toUpperCase()}
        </div>
        <div className="font-display text-[26px] tracking-tight mt-1">Weigh the portion</div>
        {expected && toleranceBand !== null && (
          <div className="font-mono text-[12.5px] text-dark-dim-2 mt-1.5">
            Nominal {expected.toFixed(2)}kg · accept {(expected * (1 - toleranceBand)).toFixed(2)}{" "}
            to {(expected * (1 + toleranceBand)).toFixed(2)}kg
          </div>
        )}
      </div>

      <div className="px-4.5 py-4.5 border-b border-dark-rule-2">
        <div className="border border-dark-rule-2 bg-[#1A1A18] py-5 text-center">
          <div className="font-mono text-[11.5px] text-dark-dim-2">TYPE WHAT THE SCALE SAYS</div>
          <div className="font-display text-[52px] sm:text-[56px] tracking-tight">
            {weight.toFixed(2)}
            <span className="text-[22px]">kg</span>
          </div>
          {variancePct !== null && (
            <div className={`font-mono text-[12px] ${withinBand ? "text-lime" : "text-rust"}`}>
              {variancePct >= 0 ? "+" : ""}
              {variancePct.toFixed(1)}% · {withinBand ? "within band" : "outside band"}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 mt-2.5">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "back", "0", "clr"].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => press(d)}
              className="border border-dark-rule-2 py-3.5 text-center font-mono text-[18px]"
            >
              {d === "back" ? "⌫" : d === "clr" ? "C" : d}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4.5 py-4.5">
        <textarea
          name="notes"
          rows={2}
          placeholder="Anything worth recording about this handover"
          className="w-full border border-dark-rule-2 bg-transparent px-3 py-2.5 text-[14px]"
        />
        {state.error && (
          <p className="border border-rust text-rust px-3 py-2.5 text-[14px] mt-3">{state.error}</p>
        )}
        {state.message && (
          <p className="border border-lime text-lime px-3 py-2.5 text-[14px] mt-3">
            {state.message}
          </p>
        )}
      </div>

      <div className="mt-auto px-4.5 py-4.5 border-t border-dark-rule-2">
        <p className="font-mono text-[11px] leading-relaxed text-dark-dim-2 mb-3">
          If someone else already handed over this slot, the server keeps the first record and this
          one is ignored.
        </p>
        <SubmitButton pendingLabel="Recording…">Confirm handover</SubmitButton>
      </div>
    </form>
  );
}
