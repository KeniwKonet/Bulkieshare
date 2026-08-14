"use client";

import { useState } from "react";
import { PhoneShell } from "@/components/nav";
import { Btn } from "@/components/ui";

const NOMINAL = 2.5;
const BAND = 0.08;

export default function HandoverPage() {
  const [digits, setDigits] = useState("254");
  const weight = Number(digits) / 100;
  const variancePct = ((weight - NOMINAL) / NOMINAL) * 100;
  const withinBand = Math.abs(variancePct) <= BAND * 100;

  const press = (d: string) => {
    if (d === "back") return setDigits((s) => s.slice(0, -1));
    if (digits.length >= 4) return;
    setDigits((s) => s + d);
  };

  return (
    <div className="bg-[#8E8C86] min-h-screen py-6">
      <PhoneShell dark>
        <div className="px-4.5 py-3.5 bg-rust flex justify-between items-center font-mono text-[12px] font-semibold">
          <span>OFFLINE · WILL SYNC</span>
          <span>CODE 4471 VALID</span>
        </div>
        <div className="px-4.5 py-4.5 border-b border-dark-rule-2">
          <div className="font-mono text-[11.5px] text-dark-dim-2">SLOT 1 OF 2 · TOLU OKAFOR</div>
          <div className="font-display text-[26px] tracking-tight mt-1">Weigh the portion</div>
          <div className="font-mono text-[12.5px] text-dark-dim-2 mt-1.5">
            Nominal {NOMINAL.toFixed(2)}kg · accept {(NOMINAL * (1 - BAND)).toFixed(2)} to{" "}
            {(NOMINAL * (1 + BAND)).toFixed(2)}kg
          </div>
        </div>
        <div className="px-4.5 py-4.5 border-b border-dark-rule-2">
          <div className="border border-dark-rule-2 bg-[#1A1A18] py-5 text-center">
            <div className="font-mono text-[11.5px] text-dark-dim-2">TYPE WHAT THE SCALE SAYS</div>
            <div className="font-display text-[52px] sm:text-[56px] tracking-tight">
              {weight.toFixed(2)}
              <span className="text-[22px]">kg</span>
            </div>
            <div className={`font-mono text-[12px] ${withinBand ? "text-lime" : "text-rust"}`}>
              {variancePct >= 0 ? "+" : ""}
              {variancePct.toFixed(1)}% · {withinBand ? "within band" : "outside band"}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-2.5">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "back", "0", "clr"].map((d) => (
              <button
                key={d}
                onClick={() => (d === "clr" ? setDigits("") : press(d))}
                className="border border-dark-rule-2 py-3.5 text-center font-mono text-[18px]"
              >
                {d === "back" ? "⌫" : d === "clr" ? "C" : d}
              </button>
            ))}
          </div>
        </div>
        <div className="px-4.5 py-4.5">
          <div className="h-[100px] border border-dashed border-dark-rule-2 flex items-center justify-center text-center font-mono text-[11px] text-dark-dim-2 mb-3 px-3">
            REQUIRED PHOTO
            <br />
            the scale readout with the label visible
          </div>
          <div className="flex gap-2">
            <button className="flex-1 border border-dark-rule-2 text-[14px] font-semibold py-3.5">
              Take photo
            </button>
            <button className="flex-1 border border-dark-rule-2 text-[14px] font-semibold py-3.5">
              Signature
            </button>
          </div>
        </div>
        <div className="mt-auto px-4.5 py-4.5 border-t border-dark-rule-2">
          <p className="font-mono text-[11px] leading-relaxed text-dark-dim-2 mb-3">
            Recording this offline. If someone else already handed over this slot, the server
            keeps the first record and flags this one for review.
          </p>
          <Btn href="/hub" size="xl" block>
            Confirm handover, slot 1
          </Btn>
        </div>
      </PhoneShell>
    </div>
  );
}
