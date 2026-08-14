import { PhoneShell } from "@/components/nav";
import { ToggleSwitch } from "@/components/interactive";

export const metadata = { title: "Notifications" };

const CATEGORIES = [
  { label: "Payments and refunds", sub: "cannot be switched off", locked: true },
  { label: "Collection reminders", sub: "the day before and the morning of", locked: false, on: true },
  { label: "Pool closing soon", sub: "when a pool you joined is within 24 hours", locked: false, on: true },
  { label: "New pools in Abuja", sub: "new listings in your area", locked: false, on: false },
  { label: "Price drops", sub: "when a pool you follow gets cheaper", locked: false, on: false },
  { label: "Product updates", sub: "new features, rarely sent", locked: false, on: false },
];

export default function NotificationsPage() {
  return (
    <div className="bg-[#8E8C86] min-h-screen py-6">
      <PhoneShell title="Notifications" eyebrow="PREFERENCE CENTRE">
        <div className="px-5 py-5">
          <p className="text-[15px] leading-relaxed text-text-dim mb-5">
            Financial and transactional messages cannot be switched off — they are how you find
            out your money moved.
          </p>
          {CATEGORIES.map((c, i) => (
            <div
              key={c.label}
              className={`flex justify-between items-center py-3 ${
                i < CATEGORIES.length - 1 ? "border-b border-rule" : ""
              }`}
            >
              <div>
                <div className="text-[15px] font-semibold">{c.label}</div>
                <div className="text-[13px] text-text-dim">{c.sub}</div>
              </div>
              {c.locked ? (
                <span className="font-mono text-[11.5px] bg-ink text-lime px-2 py-1 whitespace-nowrap">
                  ALWAYS ON
                </span>
              ) : (
                <ToggleSwitch defaultOn={c.on} />
              )}
            </div>
          ))}
        </div>
      </PhoneShell>
    </div>
  );
}
