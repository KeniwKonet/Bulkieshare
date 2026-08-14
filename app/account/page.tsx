import Link from "next/link";
import { PhoneShell } from "@/components/nav";
import { ToggleSwitch } from "@/components/interactive";

export const metadata = { title: "Account" };

export default function AccountPage() {
  return (
    <div className="bg-[#8E8C86] min-h-screen py-6">
      <PhoneShell title="Account" eyebrow="TOLU OKAFOR">
        <div className="px-5 py-5 border-b border-ink">
          <div className="font-mono text-[11.5px] text-text-dim mb-3">YOU</div>
          <div className="flex justify-between text-[15px] py-2 border-b border-rule">
            <span className="text-text-dim">Phone</span>
            <span className="font-mono">0803 441 9022</span>
          </div>
          <div className="flex justify-between text-[15px] py-2 border-b border-rule">
            <span className="text-text-dim">Area</span>
            <span className="font-semibold">Abuja</span>
          </div>
          <div className="flex justify-between text-[15px] py-2 border-b border-rule">
            <span className="text-text-dim">Usual hub</span>
            <span className="font-semibold">Kuje</span>
          </div>
          <div className="flex justify-between text-[15px] py-2">
            <span className="text-text-dim">Language</span>
            <span className="font-semibold">English</span>
          </div>
        </div>

        <div className="px-5 py-5 border-b border-ink">
          <div className="font-mono text-[11.5px] text-text-dim mb-2.5">REFUNDS GO HERE</div>
          <div className="border border-ink bg-card p-3.5">
            <div className="text-[16px] font-bold">Sterling Bank ····4402</div>
            <div className="text-[14px] text-text-dim mt-0.5">
              TOLUWANI OKAFOR · matched to your BVN name
            </div>
            <button className="border border-ink text-[13.5px] font-semibold px-3.5 py-2.5 mt-3">
              Change account
            </button>
          </div>
          <p className="font-mono text-[11px] leading-relaxed text-text-dim mt-3">
            Refunds only ever go to an account in your own name. Changing it needs a new code and
            pauses refunds for 24 hours.
          </p>
        </div>

        <div className="px-5 py-5">
          <div className="font-mono text-[11.5px] text-text-dim mb-3">MESSAGES</div>
          <div className="flex justify-between items-center py-2.5 border-b border-rule">
            <div>
              <div className="text-[15px] font-semibold">Payments and refunds</div>
              <div className="text-[13px] text-text-dim">cannot be switched off</div>
            </div>
            <span className="font-mono text-[11.5px] bg-ink text-lime px-2 py-1">ALWAYS ON</span>
          </div>
          <div className="flex justify-between items-center py-2.5 border-b border-rule">
            <div className="text-[15px] font-semibold">Collection reminders</div>
            <ToggleSwitch defaultOn />
          </div>
          <div className="flex justify-between items-center py-2.5 border-b border-rule">
            <div className="text-[15px] font-semibold">Pool closing soon</div>
            <ToggleSwitch defaultOn />
          </div>
          <div className="flex justify-between items-center py-2.5">
            <div className="text-[15px] font-semibold">New pools in Abuja</div>
            <ToggleSwitch defaultOn={false} />
          </div>
          <Link
            href="/account/notifications"
            className="inline-block mt-3 text-[13.5px] font-semibold border-b border-ink"
          >
            All notification settings
          </Link>
          <div className="flex gap-2 mt-4.5">
            <Link
              href="/account/data"
              className="flex-1 text-center border border-ink text-[14px] font-semibold px-3.5 py-3"
            >
              Download my data
            </Link>
            <button className="flex-1 border border-rust text-rust text-[14px] font-semibold px-3.5 py-3">
              Delete my account
            </button>
          </div>
        </div>
      </PhoneShell>
    </div>
  );
}
