import Link from "next/link";
import { redirect } from "next/navigation";

import { JoinForm } from "@/components/forms";
import { Logo } from "@/components/ui";
import { getCurrentMember } from "@/lib/auth/dal";
import { isDemoMode } from "@/lib/env";

export const metadata = { title: "Sign in" };

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const member = await getCurrentMember();
  if (member) redirect(next || "/my-pools");

  return (
    <div className="min-h-screen bg-paper text-ink flex items-center justify-center px-5 py-10">
      <div className="max-w-[420px] w-full border border-ink bg-card p-6 sm:p-7">
        <div className="mb-8">
          <Link href="/">
            <Logo />
          </Link>
        </div>
        <h1 className="font-display text-[30px] sm:text-[34px] tracking-tight leading-tight mb-2.5">
          What is your phone number?
        </h1>
        <p className="text-[15.5px] leading-relaxed text-text-dim mb-5.5">
          We send a six digit code on WhatsApp. No password to remember or lose.
        </p>

        <JoinForm next={next} />

        {isDemoMode && (
          <div className="border border-ink bg-card p-3.5 mt-5">
            <div className="font-mono text-[11px] text-text-dim mb-2">
              DEMO ACCOUNTS · ANY OF THESE, CODE SHOWN ON THE NEXT SCREEN
            </div>
            <div className="flex flex-col gap-1 font-mono text-[12.5px]">
              {[
                ["0803 441 9022", "member, 5 pools"],
                ["0812 007 5510", "coordinator"],
                ["0705 332 8841", "hub agent"],
                ["0906 118 2043", "supplier"],
                ["0803 000 0001", "ops back office"],
              ].map(([number, who]) => (
                <div key={number} className="flex justify-between gap-3">
                  <span className="font-semibold">{number}</span>
                  <span className="text-text-dim">{who}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-[13.5px] text-text-dim mt-4 border-t border-rule pt-4">
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
