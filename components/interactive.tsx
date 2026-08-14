"use client";

import { useEffect, useState } from "react";

export function Stepper({
  min = 1,
  max = 8,
  onChange,
}: {
  min?: number;
  max?: number;
  onChange?: (n: number) => void;
}) {
  const [n, setN] = useState(min);
  const set = (v: number) => {
    const clamped = Math.max(min, Math.min(max, v));
    setN(clamped);
    onChange?.(clamped);
  };
  return (
    <div className="flex border border-ink">
      <button
        type="button"
        onClick={() => set(n - 1)}
        className="px-3.5 py-2 border-r border-ink text-[16px] leading-none"
        aria-label="Decrease slots"
      >
        −
      </button>
      <span className="px-4.5 py-2 font-mono text-[16px] font-semibold min-w-[46px] text-center">
        {n}
      </span>
      <button
        type="button"
        onClick={() => set(n + 1)}
        className="px-3.5 py-2 border-l border-ink text-[16px] leading-none"
        aria-label="Increase slots"
      >
        +
      </button>
    </div>
  );
}

/** Ticking mm:ss countdown, server-time anchored in a real system. */
export function Countdown({ seconds }: { seconds: number }) {
  const [remaining, setRemaining] = useState(seconds);
  useEffect(() => {
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, []);
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  return (
    <span className="font-mono tabular-nums">
      {m}:{String(s).padStart(2, "0")}
    </span>
  );
}

export function ToggleSwitch({ defaultOn = true }: { defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button
      type="button"
      onClick={() => setOn((o) => !o)}
      aria-pressed={on}
      className={`w-10 h-[22px] relative border ${on ? "bg-ink border-ink" : "bg-card border-ink"}`}
    >
      <span
        className={`absolute top-0.5 w-4 h-4 ${on ? "right-0.5 bg-lime" : "left-0.5 bg-text-faint"}`}
      />
    </button>
  );
}

export function OtpInput({ length = 6 }: { length?: number }) {
  const [values, setValues] = useState<string[]>(Array(length).fill(""));
  return (
    <div className="flex gap-1.5">
      {values.map((v, i) => (
        <input
          key={i}
          value={v}
          maxLength={1}
          inputMode="numeric"
          onChange={(e) => {
            const next = [...values];
            next[i] = e.target.value.replace(/\D/g, "").slice(-1);
            setValues(next);
            if (next[i] && i < length - 1) {
              const el = document.getElementById(`otp-${i + 1}`);
              (el as HTMLInputElement | null)?.focus();
            }
          }}
          id={`otp-${i}`}
          className="flex-1 border border-ink bg-card py-3.5 text-center font-mono text-[22px] font-semibold w-10"
        />
      ))}
    </div>
  );
}
