import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { OtpForm } from "@/components/forms";
import { Logo } from "@/components/ui";
import { getCurrentMember } from "@/lib/auth/dal";
import { otpIsMocked } from "@/lib/auth/otp";
import { readMockOutbox } from "@/lib/providers/messaging";
import { formatPhone } from "@/lib/phone";

export const metadata = { title: "Enter your code" };

export default async function OtpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  const member = await getCurrentMember();
  if (member) redirect(next || "/my-pools");

  // The number being verified lives in a cookie set when the code was sent.
  const phone = (await cookies()).get("bs_otp_phone")?.value;
  if (!phone) redirect("/join");

  // On a demo deployment nothing was actually sent, so read the code back out
  // of the mock outbox rather than making the visitor hunt for it. Guarded by
  // `otpIsMocked`, which is false on any real deployment.
  const demoCode = otpIsMocked() ? readMockOutbox(phone)?.code : undefined;

  return (
    <div className="min-h-screen bg-paper text-ink flex items-center justify-center px-5 py-10">
      <div className="max-w-[420px] w-full border border-ink bg-card p-6 sm:p-7">
        <div className="mb-8">
          <Link href="/">
            <Logo />
          </Link>
        </div>
        <h1 className="font-display text-[30px] sm:text-[34px] tracking-tight leading-tight mb-2.5">
          Enter the six digit code
        </h1>

        <OtpForm phoneLabel={formatPhone(phone)} next={next} initialCode={demoCode} />
      </div>
    </div>
  );
}
