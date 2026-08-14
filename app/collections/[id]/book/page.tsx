import { PhoneShell } from "@/components/nav";
import { Btn } from "@/components/ui";

export const metadata = { title: "Book a collection window" };

const WINDOWS = [
  { time: "09:00 to 09:20", state: "open", places: "4 places left" },
  { time: "09:20 to 09:40", state: "full", places: "full" },
  { time: "10:00 to 10:20", state: "full", places: "full" },
  { time: "10:20 to 10:40", state: "selected", places: "your choice · 2 left" },
  { time: "11:00 to 11:20", state: "open", places: "9 places left" },
  { time: "12:40 to 13:00", state: "open", places: "10 places left" },
];

export default async function BookWindowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="bg-[#8E8C86] min-h-screen py-6">
      <PhoneShell title="Book collection" eyebrow={`#${id.split("-r")[0].toUpperCase()} · KUJE`}>
        <div className="px-5 pt-6 pb-4">
          <h2 className="font-display text-[26px] sm:text-[28px] tracking-tight leading-tight mb-2">
            Saturday 16 August at Kuje hub
          </h2>
          <p className="text-[15px] leading-relaxed text-text-dim mb-4.5">
            Pick a twenty minute window. The hub handles 30 handovers an hour, so a full window
            means somebody else got there first.
          </p>
          <div className="flex flex-col gap-2">
            {WINDOWS.map((w) => (
              <div
                key={w.time}
                className={
                  w.state === "selected"
                    ? "border-2 border-ink bg-lime px-4 py-3 flex justify-between items-center"
                    : w.state === "full"
                      ? "border border-rule px-4 py-3.5 flex justify-between items-center text-text-faint bg-rule-card"
                      : "border border-ink bg-card px-4 py-3.5 flex justify-between items-center"
                }
              >
                <span
                  className={`text-[16px] ${w.state === "selected" ? "font-bold" : "font-semibold"} ${
                    w.state === "full" ? "line-through" : ""
                  }`}
                >
                  {w.time}
                </span>
                <span className="font-mono text-[12px]">{w.places}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-auto px-5 py-5 border-t border-ink">
          <p className="text-[14.5px] leading-relaxed text-text-mid mb-3">
            Your slots are handed over together in one window. Others need their own window only
            if they are coming separately.
          </p>
          <Btn href={`/collections/${id}/pass`} variant="dark" block size="lg">
            Book 10:20 for both slots
          </Btn>
        </div>
      </PhoneShell>
    </div>
  );
}
