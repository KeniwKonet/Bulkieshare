import Link from "next/link";
import { Logo, Btn } from "@/components/ui";

export const metadata = { title: "Sign in" };

export default function JoinPage() {
  return (
    <div className="min-h-screen bg-paper text-ink flex items-center justify-center px-5 py-10">
      <div className="max-w-[420px] w-full border border-ink bg-card p-6 sm:p-7">
        <div className="mb-8">
          <Logo />
        </div>
        <h1 className="font-display text-[30px] sm:text-[34px] tracking-tight leading-tight mb-2.5">
          What is your phone number?
        </h1>
        <p className="text-[15.5px] leading-relaxed text-text-dim mb-5.5">
          We send a six digit code on WhatsApp. No password to remember or lose.
        </p>
        <div className="flex border border-ink bg-card mb-3">
          <span className="px-3 py-3.5 border-r border-ink font-mono text-[17px]">+234</span>
          <input
            type="tel"
            placeholder="803 441 9022"
            className="flex-1 px-3 py-3.5 font-mono text-[17px] bg-transparent outline-none placeholder:text-text-faint"
          />
        </div>
        <Btn href="/otp" variant="dark" block size="xl" className="mb-1">
          Send me a code
        </Btn>
        <p className="font-mono text-[11.5px] leading-relaxed text-text-dim mt-4 border-t border-rule pt-4">
          If WhatsApp does not deliver in 60 seconds we send an SMS automatically. Three wrong
          codes locks the number for 15 minutes.
        </p>
        <p className="text-[13.5px] text-text-dim mt-4">
          Coordinator or supplier?{" "}
          <Link href="/groups" className="font-semibold border-b border-ink">
            Groups
          </Link>{" "}
          ·{" "}
          <Link href="/supply" className="font-semibold border-b border-ink">
            Supply
          </Link>
        </p>
      </div>
    </div>
  );
}
