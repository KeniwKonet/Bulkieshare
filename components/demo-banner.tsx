import { isDemoMode } from "@/lib/env";

/**
 * Says plainly that this is a demonstration.
 *
 * A demo deployment shows the sign-in code on screen and accepts a payment that
 * never happened. Someone who wandered in from a link has no way of knowing
 * that, and might enter their real phone number or expect food to arrive. This
 * is deliberately hard to miss, and renders nothing at all when `DEMO_MODE` is
 * off, so it can never appear on the real thing.
 */
export function DemoBanner() {
  if (!isDemoMode) return null;

  return (
    <div className="bg-rust text-white px-5 sm:px-8 py-2.5 flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
      <span className="font-mono text-[12px] font-semibold tracking-wide">
        DEMONSTRATION · NOT A REAL SHOP
      </span>
      <span className="text-[13.5px] leading-snug">
        Every pool, member and payment here is invented. Nothing you do buys food, no money moves,
        and anyone can sign in as anyone. Do not enter a real bank detail.
      </span>
    </div>
  );
}
