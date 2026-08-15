"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

/* ---------------------------------------------------------------------- */
/* Form plumbing                                                           */
/* ---------------------------------------------------------------------- */

/** Disables itself while its form is in flight, so nothing double-submits. */
export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  size = "xl",
  block = true,
  className = "",
  disabled = false,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "dark" | "outline" | "outline-rust" | "plain-rust";
  size?: "sm" | "md" | "lg" | "xl";
  block?: boolean;
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();

  const variants: Record<string, string> = {
    primary: "bg-lime text-ink border border-ink font-bold",
    dark: "bg-ink text-paper border border-ink font-bold",
    outline: "bg-transparent text-ink border border-ink font-semibold",
    "outline-rust": "bg-transparent text-rust border border-rust font-semibold",
    "plain-rust": "bg-rust text-white border border-rust font-bold",
  };
  const sizes: Record<string, string> = {
    sm: "px-3.5 py-2.5 text-[13px]",
    md: "px-4 py-3 text-[14.5px]",
    lg: "px-6 py-4 text-[16px]",
    xl: "px-7 py-4 text-[17px]",
  };

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={`inline-flex items-center justify-center gap-2 ${variants[variant]} ${sizes[size]} ${
        block ? "w-full" : ""
      } ${pending || disabled ? "opacity-60" : ""} ${className}`}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}

export function FormMessage({
  error,
  message,
  devHint,
}: {
  error?: string;
  message?: string;
  devHint?: string;
}) {
  if (!error && !message && !devHint) return null;
  return (
    <div className="mb-3.5">
      {error && (
        <p className="border border-rust text-rust bg-card px-3 py-2.5 text-[14px] leading-snug">
          {error}
        </p>
      )}
      {message && !error && (
        <p className="border border-ink bg-lime px-3 py-2.5 text-[14px] leading-snug">{message}</p>
      )}
      {devHint && (
        <p className="border border-ink bg-card px-3 py-2.5 font-mono text-[12.5px] mt-2">
          DEMO · nothing was sent. Your code is{" "}
          <b className="text-[17px] tracking-widest">{devHint}</b>
        </p>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Inputs                                                                  */
/* ---------------------------------------------------------------------- */

export function Stepper({
  name = "slots",
  min = 1,
  max = 8,
  defaultValue,
  onChange,
}: {
  name?: string;
  min?: number;
  max?: number;
  defaultValue?: number;
  onChange?: (n: number) => void;
}) {
  const [n, setN] = useState(defaultValue ?? min);
  const set = (v: number) => {
    const clamped = Math.max(min, Math.min(max, v));
    setN(clamped);
    onChange?.(clamped);
  };
  return (
    <div className="flex border border-ink">
      <input type="hidden" name={name} value={n} />
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

/**
 * Counts down to a server-provided instant rather than from a duration, so a
 * page left open and returned to shows the truth instead of a stale timer.
 */
export function Countdown({
  until,
  onExpired,
}: {
  until: string | number | Date;
  onExpired?: () => void;
}) {
  const target = new Date(until).getTime();
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Math.floor((target - Date.now()) / 1000)),
  );
  const firedRef = useRef(false);

  useEffect(() => {
    const tick = () => {
      const next = Math.max(0, Math.floor((target - Date.now()) / 1000));
      setRemaining(next);
      if (next === 0 && !firedRef.current) {
        firedRef.current = true;
        onExpired?.();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target, onExpired]);

  const m = Math.floor(remaining / 60);
  const sec = remaining % 60;
  return (
    <span className="font-mono tabular-nums">
      {m}:{String(sec).padStart(2, "0")}
    </span>
  );
}

export function ToggleSwitch({
  name,
  defaultOn = true,
}: {
  name?: string;
  defaultOn?: boolean;
}) {
  const [on, setOn] = useState(defaultOn);
  return (
    <>
      {name && <input type="hidden" name={name} value={on ? "on" : "off"} />}
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
    </>
  );
}

/** Six boxes that behave like one field; submits as a single `code` value. */
export function OtpInput({ length = 6, name = "code" }: { length?: number; name?: string }) {
  const [values, setValues] = useState<string[]>(Array(length).fill(""));
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const setAt = (i: number, char: string) => {
    const next = [...values];
    next[i] = char;
    setValues(next);
    if (char && i < length - 1) refs.current[i + 1]?.focus();
  };

  return (
    <div className="flex gap-1.5">
      <input type="hidden" name={name} value={values.join("")} />
      {values.map((v, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={v}
          maxLength={1}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${i + 1}`}
          onChange={(e) => setAt(i, e.target.value.replace(/\D/g, "").slice(-1))}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !values[i] && i > 0) refs.current[i - 1]?.focus();
          }}
          onPaste={(e) => {
            const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
            if (!digits) return;
            e.preventDefault();
            const next = Array(length).fill("");
            digits.split("").forEach((d, idx) => (next[idx] = d));
            setValues(next);
            refs.current[Math.min(digits.length, length - 1)]?.focus();
          }}
          className="flex-1 border border-ink bg-card py-3.5 text-center font-mono text-[22px] font-semibold w-10"
        />
      ))}
    </div>
  );
}

/** Copies a value and says so, for account numbers and collection codes. */
export function CopyButton({ value, label = "copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          setCopied(false);
        }
      }}
      className="font-mono text-[11.5px] border border-ink px-2 py-1"
    >
      {copied ? "copied" : label}
    </button>
  );
}

/** Reloads the route when a hold expires so the page stops lying. */
export function ExpiryRefresher({ at }: { at: string | number | Date }) {
  const target = new Date(at).getTime();
  useEffect(() => {
    const ms = target - Date.now();
    if (ms <= 0) return;
    const id = setTimeout(() => window.location.reload(), ms + 500);
    return () => clearTimeout(id);
  }, [target]);
  return null;
}
