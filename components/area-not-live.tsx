import { listOpenPools } from "@/lib/domain/pools";
import { formatKobo } from "@/lib/money";
import { WaitlistForm } from "./forms";
import { ProgressBar } from "./ui";

/** How many signups an area needs before a hub and a first pool are worth it. */
const TARGET_SIGNUPS = 500;

export async function AreaNotLive({
  area,
  label,
  waitlistCount,
}: {
  area: string;
  label: string;
  waitlistCount: number;
}) {
  // Show what is actually running elsewhere rather than an empty page.
  const nearby = (await listOpenPools("abuja")).slice(0, 2);
  const pct = Math.min(100, Math.round((waitlistCount / TARGET_SIGNUPS) * 100));

  return (
    <div className="max-w-6xl mx-auto">
      <div className="px-5 sm:px-8 py-9 border-b border-ink">
        <h1 className="font-display text-[34px] sm:text-[40px] tracking-tight leading-none mb-3">
          We are not in {label} yet
        </h1>
        <p className="text-[16px] leading-relaxed text-text-mid max-w-[52ch] mb-5">
          We open a city when we have a hub and enough people to fill a pool there. {waitlistCount}{" "}
          {waitlistCount === 1 ? "person has" : "people have"} asked for {label}. We need about{" "}
          {TARGET_SIGNUPS} before it is worth the trip.
        </p>
        <div className="border border-ink bg-card p-4.5 max-w-xl">
          <div className="flex justify-between items-baseline mb-2">
            <span className="font-bold text-[16px]">
              {waitlistCount} of {TARGET_SIGNUPS} asked
            </span>
            <span className="font-mono text-[13px] text-text-dim">{label}</span>
          </div>
          <ProgressBar paidPct={pct} height={18} />
          <div className="mt-4">
            <WaitlistForm area={area} />
          </div>
          <p className="font-mono text-[11.5px] text-text-dim mt-3 leading-relaxed">
            One message when we open. Nothing else, and no marketing list.
          </p>
        </div>
      </div>

      {nearby.length > 0 && (
        <div className="px-5 sm:px-8 py-8">
          <div className="font-mono text-[11.5px] text-text-dim mb-3">
            RUNNING IN ABUJA. YOU CANNOT JOIN THESE.
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 opacity-45 max-w-xl">
            {nearby.map((p) => (
              <div key={p.id} className="border border-text-faint p-3.5">
                <div className="font-mono text-[11px] mb-1">
                  #{p.code} · {p.hubName.toUpperCase()}
                </div>
                <div className="font-display text-[19px]">{p.title}</div>
                <div className="text-[14px] text-text-dim mt-1">
                  {formatKobo(p.pricePerSlotKobo)} · {p.slotsLeft} slots left
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[15px] leading-relaxed text-text-dim max-w-[70ch]">
            Showing these greyed out rather than an empty page, because knowing what we run and at
            what price is the only reason to wait for us.
          </p>
        </div>
      )}
    </div>
  );
}
