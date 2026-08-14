import { AREA_LABELS, POOLS } from "@/lib/mock-data";
import { formatNaira } from "@/lib/mock-data";
import { ProgressBar } from "./ui";

export function AreaNotLive({ area }: { area: string }) {
  const label = AREA_LABELS[area] ?? area.charAt(0).toUpperCase() + area.slice(1);
  const nearby = POOLS.slice(0, 2);
  return (
    <div className="max-w-6xl mx-auto">
      <div className="px-5 sm:px-8 py-9 border-b border-ink">
        <h1 className="font-display text-[34px] sm:text-[40px] tracking-tight leading-none mb-3">
          We are not in {label} yet
        </h1>
        <p className="text-[16px] leading-relaxed text-text-mid max-w-[52ch] mb-5">
          We open a city when we have a hub and enough people to fill a pool there. 340 people in{" "}
          {label} have asked. We need about 500 before it is worth the trip.
        </p>
        <div className="border border-ink bg-card p-4.5 max-w-xl">
          <div className="flex justify-between items-baseline mb-2">
            <span className="font-bold text-[16px]">340 of 500 asked</span>
            <span className="font-mono text-[13px] text-text-dim">{label}</span>
          </div>
          <ProgressBar paidPct={68} height={18} />
          <div className="flex gap-2 mt-4">
            <div className="flex-1 border border-ink px-3.5 py-3 text-[15px] text-text-faint">
              Your phone number
            </div>
            <button className="bg-lime border border-ink text-[15px] font-bold px-5">Add me</button>
          </div>
          <p className="font-mono text-[11.5px] text-text-dim mt-3 leading-relaxed">
            One message when we open. Nothing else, and no marketing list.
          </p>
        </div>
      </div>
      <div className="px-5 sm:px-8 py-8">
        <div className="font-mono text-[11.5px] text-text-dim mb-3">
          RUNNING IN ABUJA, 4 HOURS AWAY. YOU CANNOT JOIN THESE.
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 opacity-45 max-w-xl">
          {nearby.map((p) => (
            <div key={p.id} className="border border-text-faint p-3.5">
              <div className="font-mono text-[11px] mb-1">
                #{p.code} · {p.hubName.toUpperCase()}
              </div>
              <div className="font-display text-[19px]">{p.title}</div>
              <div className="text-[14px] text-text-dim mt-1">
                {formatNaira(p.pricePerSlot)} · {p.totalSlots - p.paidSlots} slots left
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[15px] leading-relaxed text-text-dim max-w-[70ch]">
          Showing these greyed out rather than an empty page, because knowing what we run and at
          what price is the only reason to wait for us.
        </p>
      </div>
    </div>
  );
}
