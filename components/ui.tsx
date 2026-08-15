import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import type { PoolView } from "@/lib/domain/pools";
import { formatKobo } from "@/lib/money";

/* ---------------------------------------------------------------------- */
/* Buttons                                                                 */
/* ---------------------------------------------------------------------- */

type Variant = "primary" | "dark" | "outline" | "outline-rust" | "plain-rust";

const variantClass: Record<Variant, string> = {
  primary: "bg-lime text-ink border border-ink font-bold",
  dark: "bg-ink text-paper border border-ink font-bold",
  outline: "bg-transparent text-ink border border-ink font-semibold",
  "outline-rust": "bg-transparent text-rust border border-rust font-semibold",
  "plain-rust": "bg-rust text-white border border-rust font-bold",
};

const sizeClass = {
  sm: "px-3.5 py-2.5 text-[13px]",
  md: "px-4 py-3 text-[14.5px]",
  lg: "px-6 py-4 text-[16px]",
  xl: "px-7 py-4 text-[17px]",
};

export function Btn({
  href,
  variant = "primary",
  size = "md",
  block = false,
  className = "",
  children,
  ...rest
}: {
  href?: string;
  variant?: Variant;
  size?: keyof typeof sizeClass;
  block?: boolean;
  className?: string;
  children: ReactNode;
} & AnchorHTMLAttributes<HTMLAnchorElement>) {
  const cls = `inline-flex items-center justify-center gap-2 ${variantClass[variant]} ${sizeClass[size]} ${
    block ? "w-full" : ""
  } ${className}`;
  if (href) {
    return (
      <Link href={href} className={cls} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <button className={cls} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  );
}

/* ---------------------------------------------------------------------- */
/* Text / labels                                                           */
/* ---------------------------------------------------------------------- */

export function MonoLabel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={`font-mono text-[11.5px] tracking-wide text-text-dim ${className}`}>
      {children}
    </span>
  );
}

export function Tag({
  children,
  tone = "lime",
  className = "",
}: {
  children: ReactNode;
  tone?: "lime" | "ink" | "outline" | "rust" | "amber" | "green";
  className?: string;
}) {
  const tones: Record<string, string> = {
    lime: "bg-lime text-ink",
    ink: "bg-ink text-lime",
    outline: "border border-ink text-ink",
    rust: "bg-rust text-white",
    amber: "bg-amber text-ink",
    green: "bg-green text-white",
  };
  return (
    <span className={`font-mono text-[12px] px-2 py-1 inline-block ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}

/* ---------------------------------------------------------------------- */
/* Logo                                                                    */
/* ---------------------------------------------------------------------- */

export function Logo({ size = 18, dark = false }: { size?: number; dark?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div
        style={{ width: size, height: size }}
        className={dark ? "bg-lime" : "bg-ink"}
      />
      <span
        className="font-display tracking-tight"
        style={{ fontSize: size - 1 }}
      >
        BulkieShare
      </span>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Photo placeholder — the diagonal hatch block                            */
/* ---------------------------------------------------------------------- */

export function PhotoPlaceholder({
  caption,
  height = 120,
  className = "",
  align = "center",
}: {
  caption: string;
  height?: number;
  className?: string;
  align?: "center" | "end";
}) {
  return (
    <div
      style={{ height }}
      className={`hatch-photo border border-ink flex ${
        align === "center" ? "items-center justify-center text-center" : "items-end p-2"
      } font-mono text-[10.5px] text-text-faint ${className}`}
    >
      {align === "center" ? `PHOTO · ${caption}` : `PHOTO · ${caption}`}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Pool progress bar — the single most important component                 */
/* ---------------------------------------------------------------------- */

export function ProgressBar({
  paidPct,
  reservedPct = 0,
  thresholdPct,
  height = 14,
  onDark = false,
}: {
  paidPct: number;
  reservedPct?: number;
  thresholdPct?: number;
  height?: number;
  onDark?: boolean;
}) {
  return (
    <div
      className={`relative border ${onDark ? "border-dark-rule bg-ink" : "border-ink bg-paper"}`}
      style={{ height }}
    >
      <div
        className={`absolute inset-y-0 left-0 ${onDark ? "bg-lime" : "bg-ink"}`}
        style={{ width: `${Math.min(paidPct, 100)}%` }}
      />
      {reservedPct > 0 && (
        <div
          className={onDark ? "hatch-unpaid-dark absolute inset-y-0" : "hatch-unpaid absolute inset-y-0"}
          style={{ left: `${paidPct}%`, width: `${reservedPct}%` }}
        />
      )}
      {thresholdPct !== undefined && (
        <div
          className="absolute bg-rust"
          style={{ left: `${thresholdPct}%`, width: 2, top: -6, bottom: -6 }}
        />
      )}
    </div>
  );
}

export function PoolProgress({
  pool,
  height = 14,
  showCaption = true,
}: {
  pool: PoolView;
  height?: number;
  showCaption?: boolean;
}) {
  const paidPct = (pool.paidSlots / pool.totalSlots) * 100;
  const reservedPct = (pool.holdingSlots / pool.totalSlots) * 100;
  const thresholdPct = (pool.threshold / pool.totalSlots) * 100;
  const passed = pool.thresholdPassed;

  return (
    <div>
      <ProgressBar
        paidPct={paidPct}
        reservedPct={reservedPct}
        thresholdPct={thresholdPct}
        height={height}
      />
      {showCaption && (
        <div className="flex justify-between font-mono text-[11.5px] text-text-dim mt-1.5">
          <span>
            {pool.holdingSlots > 0
              ? `${pool.holdingSlots} reserved, payment pending`
              : " "}
          </span>
          <span className={passed ? "text-rust" : ""}>
            {passed ? `threshold ${pool.threshold} passed` : `THRESHOLD ${pool.threshold}`}
          </span>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Grid table — the dense CSS-grid data table pattern                      */
/* ---------------------------------------------------------------------- */

export function GridTable({
  columns,
  headers,
  rows,
  footer,
  fontSize = 14.5,
}: {
  columns: string; // e.g. "1.5fr .9fr 1fr"
  headers: ReactNode[];
  rows: ReactNode[][];
  footer?: ReactNode;
  fontSize?: number;
}) {
  return (
    <div className="border border-ink bg-card">
      <div
        className="grid font-mono text-[11.5px] bg-ink text-dark-dim-2"
        style={{ gridTemplateColumns: columns }}
      >
        {headers.map((h, i) => (
          <div key={i} className="px-4 py-2.5">
            {h}
          </div>
        ))}
      </div>
      <div className="grid" style={{ gridTemplateColumns: columns, fontSize }}>
        {rows.map((row, ri) =>
          row.map((cell, ci) => (
            <div
              key={`${ri}-${ci}`}
              className={`px-4 py-2.5 ${ri < rows.length - 1 ? "border-b border-rule-card" : ""}`}
            >
              {cell}
            </div>
          )),
        )}
      </div>
      {footer && (
        <div className="px-4 py-2.5 border-t border-rule font-mono text-[11.5px] text-text-dim">
          {footer}
        </div>
      )}
    </div>
  );
}

export function StatGrid({
  items,
  columns = 4,
  dark = false,
}: {
  items: { label: string; value: ReactNode; sub?: string; valueClassName?: string }[];
  columns?: number;
  dark?: boolean;
}) {
  return (
    <div
      className={`grid gap-px ${dark ? "bg-dark-rule" : "bg-ink"} border ${dark ? "border-dark-rule" : "border-ink"}`}
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
    >
      {items.map((it, i) => (
        <div key={i} className={dark ? "bg-ink px-4 py-4" : "bg-card px-4 py-4"}>
          <div className="font-mono text-[11px] text-text-dim">{it.label}</div>
          <div className={`font-display text-[26px] tracking-tight ${it.valueClassName ?? ""}`}>
            {it.value}
          </div>
          {it.sub && <div className="text-[12.5px] text-text-dim">{it.sub}</div>}
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Pool card — used across browse / listing / home                         */
/* ---------------------------------------------------------------------- */

export function PoolCard({ pool, area }: { pool: PoolView; area: string }) {
  const { slotsLeft } = pool;
  return (
    <div className="border border-ink bg-card flex flex-col">
      <PhotoPlaceholder caption={pool.photoCaption} height={120} />
      <div className="p-4 flex flex-col flex-1">
        <div className="flex justify-between font-mono text-[11.5px] mb-2">
          <span>
            #{pool.code} · {pool.hubName.toUpperCase()}
          </span>
          <span className="border border-ink px-1.5 py-0.5">
            {pool.closesAtLabel.toUpperCase()}
          </span>
        </div>
        <div className="font-display text-[23px] tracking-tight leading-tight">{pool.title}</div>
        <div className="text-[13.5px] text-text-dim my-1.5">{pool.unitDescription}</div>
        <div className="flex justify-between items-baseline mb-1.5 mt-2">
          <span className="font-bold text-[16px]">
            {slotsLeft} slot{slotsLeft === 1 ? "" : "s"} left
          </span>
          <span className="font-mono text-[12px] text-text-dim">
            {pool.paidSlots} / {pool.totalSlots} paid
          </span>
        </div>
        <PoolProgress pool={pool} height={14} showCaption={false} />
        <div className="mt-auto flex justify-between items-end pt-3.5">
          <div>
            <div className="font-mono text-[11.5px] text-text-dim">PER SLOT</div>
            <div className="font-display text-[26px]">{formatKobo(pool.pricePerSlotKobo)}</div>
          </div>
          <Btn href={`/${area}/pools/${pool.id}`} variant="primary" size="sm">
            Take a slot
          </Btn>
        </div>
      </div>
    </div>
  );
}
