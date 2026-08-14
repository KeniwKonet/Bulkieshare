"use client";

import { useState } from "react";
import { PhoneShell } from "@/components/nav";
import { Btn } from "@/components/ui";

const REASONS = [
  "My portion weighed less than promised",
  "The quality was bad or it had spoiled",
  "I got the wrong cuts or the wrong item",
  "Nobody was at the hub in my window",
  "Money problem, wrong amount or missing refund",
];

export default function NewDisputePage() {
  const [reason, setReason] = useState(REASONS[1]);
  return (
    <div className="bg-[#8E8C86] min-h-screen py-6">
      <PhoneShell title="Report a problem" eyebrow="#A-2190">
        <div className="px-5 py-6">
          <h2 className="font-display text-[25px] sm:text-[27px] tracking-tight leading-tight mb-2">
            What went wrong?
          </h2>
          <p className="text-[15px] leading-relaxed text-text-dim mb-4.5">
            Pick the closest one. We answer within 48 hours and you can see the clock.
          </p>
          <div className="flex flex-col gap-2 mb-5">
            {REASONS.map((r) => (
              <button
                key={r}
                onClick={() => setReason(r)}
                className={
                  reason === r
                    ? "border-2 border-ink bg-lime px-3.5 py-3 text-[15.5px] font-bold text-left"
                    : "border border-ink bg-card px-4 py-3.5 text-[15.5px] font-semibold text-left"
                }
              >
                {r}
              </button>
            ))}
          </div>
          <div className="border border-dashed border-ink p-5.5 text-center font-mono text-[11.5px] text-text-dim leading-relaxed mb-3">
            ADD PHOTOS
            <br />a photo of the item makes this much faster to settle
          </div>
          <div className="border border-ink bg-card p-3.5 text-[14.5px] text-text-faint leading-relaxed">
            Say what happened in your own words. Optional.
          </div>
        </div>
        <div className="mt-auto px-5 py-5 border-t border-ink">
          <p className="font-mono text-[11.5px] leading-relaxed text-text-dim mb-3">
            Outcomes are credit, a cash refund or a replacement in the next pool. We tell you
            which and why, in writing.
          </p>
          <Btn href="/disputes/d-9001" variant="dark" block size="lg">
            Send it to support
          </Btn>
        </div>
      </PhoneShell>
    </div>
  );
}
